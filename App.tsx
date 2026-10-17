/**
 * SB Crypto Trading Signals - Main Application Entry
 * Built for high-reliability real-time cryptocurrency technical analysis
 */

import React, { useState, useEffect, useRef } from 'react';
import { Candle, MarketMode, PotentialSetup, Ticker24h, Timeframe, TradingSignal } from './types';
import { binanceService } from './services/binance';
import { SignalEngine } from './services/signalEngine';
import { Navbar } from './components/layout/Navbar';
import { NavigationTabs, ActiveTab } from './components/layout/NavigationTabs';
import { HomePage } from './components/home/HomePage';
import { TimeframeBar } from './components/common/TimeframeBar';
import { TradingChart } from './components/chart/TradingChart';
import { SignalsDashboard } from './components/signals/SignalsDashboard';
import { SignalScanner } from './components/scanner/SignalScanner';
import { BacktestDashboard } from './components/backtest/BacktestDashboard';
import { TradeJournal } from './components/journal/TradeJournal';
import { SettingsPage } from './components/settings/SettingsPage';
import { PairSelectorModal } from './components/common/PairSelectorModal';
import { AuthModal } from './components/auth/AuthModal';
import { AlertsModal } from './components/alerts/AlertsModal';
import { LogoBrandingModal } from './components/common/LogoBranding';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { CoinLogo } from './components/common/CoinLogo';
import { useAlerts } from './context/AlertsContext';
import { WifiOff } from 'lucide-react';

const LAST_PAIR_KEY = 'sb_crypto_last_pair';
const LAST_MODE_KEY = 'sb_crypto_last_mode';
const LAST_TIMEFRAME_KEY = 'sb_crypto_last_timeframe';
const LAST_TAB_KEY = 'sb_crypto_last_tab';

export default function App() {
  const { triggerAlert } = useAlerts();

  // Persistent selections
  const [selectedPair, setSelectedPair] = useState<string>(() => {
    return localStorage.getItem(LAST_PAIR_KEY) || 'BTCUSDT';
  });

  const [marketMode, setMarketMode] = useState<MarketMode>(() => {
    const saved = localStorage.getItem(LAST_MODE_KEY);
    return saved === 'futures' ? 'futures' : 'spot';
  });

  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    const saved = localStorage.getItem(LAST_TIMEFRAME_KEY);
    return (saved as Timeframe) || '1h';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem(LAST_TAB_KEY);
    return (saved as ActiveTab) || 'home';
  });

  // Live market states
  const [candles, setCandles] = useState<Candle[]>([]);
  const [ticker, setTicker] = useState<Ticker24h | null>(null);
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [nextSetup, setNextSetup] = useState<PotentialSetup | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [isLoadingCandles, setIsLoadingCandles] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Candle countdown
  const [candleCountdown, setCandleCountdown] = useState<{
    formatted: string;
    progressPercent: number;
  }>({ formatted: '00:00:00', progressPercent: 0 });

  const [candleLimit, setCandleLimit] = useState<number>(500);

  // Modal states
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);

  // Journal transfer
  const [pendingImportSignal, setPendingImportSignal] = useState<TradingSignal | null>(null);

  // Store last signal id to detect newly confirmed signals for alerts
  const lastSignalIdRef = useRef<string | null>(null);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save pair / mode / timeframe / tab to localStorage
  useEffect(() => {
    localStorage.setItem(LAST_PAIR_KEY, selectedPair);
  }, [selectedPair]);

  useEffect(() => {
    localStorage.setItem(LAST_MODE_KEY, marketMode);
  }, [marketMode]);

  useEffect(() => {
    localStorage.setItem(LAST_TIMEFRAME_KEY, timeframe);
  }, [timeframe]);

  useEffect(() => {
    localStorage.setItem(LAST_TAB_KEY, activeTab);
  }, [activeTab]);

  // Fetch initial klines & ticker whenever pair, timeframe, mode, or candleLimit changes
  const loadMarketData = async () => {
    setIsLoadingCandles(true);
    try {
      const [newTicker, newCandles] = await Promise.all([
        binanceService.get24hTicker(selectedPair, marketMode),
        binanceService.getKlines(selectedPair, timeframe, marketMode, candleLimit),
      ]);
      setTicker(newTicker);
      setCandles(newCandles);

      // Evaluate initial signal
      const evalResult = SignalEngine.evaluateSignal(newCandles, selectedPair, marketMode, timeframe);
      setSignal(evalResult.signal);
      setNextSetup(evalResult.nextSetup);
      lastSignalIdRef.current = evalResult.signal?.id || null;
    } catch (err) {
      console.error('Failed to load Binance market data:', err);
      setConnectionStatus('disconnected');
    } finally {
      setIsLoadingCandles(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [selectedPair, marketMode, timeframe, candleLimit]);

  // Subscribe to real-time WebSocket klines
  useEffect(() => {
    const unsubscribe = binanceService.subscribeKlineStream(
      selectedPair,
      timeframe,
      marketMode,
      (updatedCandle, isFinal) => {
        setCandles((prevCandles) => {
          if (!prevCandles || prevCandles.length === 0) return [updatedCandle];
          const updated = [...prevCandles];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx].time === updatedCandle.time) {
            updated[lastIdx] = updatedCandle;
          } else if (updatedCandle.time > updated[lastIdx].time) {
            updated.push(updatedCandle);
          }

          // Evaluate live or confirmed signal
          const evalRes = SignalEngine.evaluateSignal(
            updated,
            selectedPair,
            marketMode,
            timeframe
          );
          setSignal(evalRes.signal);
          setNextSetup(evalRes.nextSetup);

          // If candle just closed and emitted a new confirmed signal, trigger notification
          if (isFinal && evalRes.signal && evalRes.signal.id !== lastSignalIdRef.current) {
            lastSignalIdRef.current = evalRes.signal.id;
            if (evalRes.signal.direction !== 'WAIT' && evalRes.signal.direction !== 'NO_TRADE') {
              triggerAlert(
                `New ${evalRes.signal.direction} Signal: ${selectedPair}`,
                `Order: ${evalRes.signal.orderType} | Entry: $${evalRes.signal.entryPrice} | SL: $${evalRes.signal.stopLoss} | TP: $${evalRes.signal.tp1}`,
                'SIGNAL',
                selectedPair
              );
            }
          }

          return updated;
        });

        // Always update ticker last price from live websocket tick
        setTicker((prev) => {
          if (!prev) {
            return {
              symbol: selectedPair,
              lastPrice: updatedCandle.close,
              priceChange: 0,
              priceChangePercent: 0,
              highPrice: updatedCandle.high,
              lowPrice: updatedCandle.low,
              volume: updatedCandle.volume,
              quoteVolume: 0,
              openTime: Date.now() - 86400000,
              closeTime: Date.now(),
            };
          }
          return {
            ...prev,
            lastPrice: updatedCandle.close,
          };
        });
      },
      (status) => {
        setConnectionStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedPair, timeframe, marketMode]);

  // Regular 1-second interval for accurate candle close countdown
  useEffect(() => {
    const interval = setInterval(() => {
      if (candles.length > 0) {
        const { formatted, progressPercent } = binanceService.calculateCandleCountdown(
          candles,
          timeframe
        );
        setCandleCountdown({ formatted, progressPercent });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [candles, timeframe]);

  const handleSelectPair = (newSymbol: string) => {
    setSelectedPair(newSymbol);
  };

  const handleToggleMode = (newMode: MarketMode) => {
    setMarketMode(newMode);
  };

  const handleImportToJournal = (sig: TradingSignal) => {
    setPendingImportSignal(sig);
    setActiveTab('journal');
  };

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col font-sans pb-16 md:pb-8 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Offline Mode Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-mono font-bold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline Mode — Cached Binance data in use. Live connection paused.</span>
        </div>
      )}

      {/* Top Navbar with CoinLogo and Live Market Price */}
      <Navbar
        currentPair={selectedPair}
        onOpenPairModal={() => setIsPairModalOpen(true)}
        mode={marketMode}
        onToggleMode={handleToggleMode}
        ticker={ticker}
        connectionStatus={connectionStatus}
        candleCountdownFormatted={candleCountdown.formatted}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
        onOpenBrandingModal={() => setIsBrandingModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-5 py-4 flex-1">
        {/* Navigation Tabs (Desktop & mobile) */}
        <NavigationTabs activeTab={activeTab} onChangeTab={setActiveTab} />

        {/* Global Timeframe Bar (Accessible for signals & chart views) */}
        {(activeTab === 'signals' || activeTab === 'chart') && (
          <TimeframeBar
            selectedTimeframe={timeframe}
            onSelectTimeframe={setTimeframe}
            candleCountdown={candleCountdown.formatted}
            progressPercent={candleCountdown.progressPercent}
            candleLimit={candleLimit}
            onSelectCandleLimit={setCandleLimit}
          />
        )}

        {/* Tab View: HOME */}
        {activeTab === 'home' && (
          <HomePage
            mode={marketMode}
            onToggleMode={handleToggleMode}
            onSelectPair={handleSelectPair}
            onNavigateTab={setActiveTab}
            activeSignal={signal}
          />
        )}

        {/* Tab View: SIGNALS */}
        {activeTab === 'signals' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 cols: Interactive Candlestick Chart */}
            <div className="lg:col-span-7">
              <TradingChart
                candles={candles}
                symbol={selectedPair}
                timeframe={timeframe}
                currentSignal={signal}
                isLoading={isLoadingCandles}
                onRefresh={loadMarketData}
                onSelectTimeframe={(tf) => setTimeframe(tf)}
              />
            </div>

            {/* Right 5 cols: Current & Next Potential Setup Breakdown with Limit/Market Order */}
            <div className="lg:col-span-5">
              <SignalsDashboard
                symbol={selectedPair}
                mode={marketMode}
                timeframe={timeframe}
                signal={signal}
                nextSetup={nextSetup}
                currentPrice={ticker?.lastPrice || (candles.length > 0 ? candles[candles.length - 1].close : 0)}
                onImportToJournal={handleImportToJournal}
              />
            </div>
          </div>
        )}

        {/* Tab View: SCANNER */}
        {activeTab === 'scanner' && (
          <SignalScanner
            mode={marketMode}
            onSelectPair={handleSelectPair}
            onSwitchTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* Tab View: FULL CHART */}
        {activeTab === 'chart' && (
          <div className="space-y-4">
            <TradingChart
              candles={candles}
              symbol={selectedPair}
              timeframe={timeframe}
              currentSignal={signal}
              isLoading={isLoadingCandles}
              onRefresh={loadMarketData}
              onSelectTimeframe={(tf) => setTimeframe(tf)}
            />

            {signal && (
              <div className="p-3.5 rounded-xl bg-[#0A0E1A] border border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-2 shadow-md">
                <div className="flex items-center gap-2 flex-wrap">
                  <CoinLogo symbol={selectedPair} size={20} />
                  <span className="font-bold text-slate-100">{selectedPair}:</span>
                  <span
                    className={`font-black ${
                      signal.direction === 'BUY' || signal.direction === 'LONG'
                        ? 'text-emerald-400'
                        : signal.direction === 'SHORT'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {signal.direction}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      signal.orderType === 'MARKET_ORDER' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {signal.orderType === 'MARKET_ORDER' ? 'MARKET ORDER' : 'LIMIT ORDER'}
                  </span>
                  <span className="text-slate-400">| Entry: ${signal.entryPrice.toFixed(2)}</span>
                  <span className="text-rose-400">| SL: ${signal.stopLoss.toFixed(2)}</span>
                  <span className="text-emerald-400">| TP1: ${signal.tp1.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setActiveTab('signals')}
                  className="text-emerald-400 hover:underline font-bold cursor-pointer"
                >
                  View Setup Rationale →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab View: BACKTEST */}
        {activeTab === 'backtest' && (
          <BacktestDashboard currentSymbol={selectedPair} currentMode={marketMode} />
        )}

        {/* Tab View: TRADE JOURNAL */}
        {activeTab === 'journal' && (
          <TradeJournal
            currentPair={selectedPair}
            currentMode={marketMode}
            pendingImportSignal={pendingImportSignal}
            onClearPendingSignal={() => setPendingImportSignal(null)}
          />
        )}

        {/* Tab View: SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsPage
            mode={marketMode}
            onToggleMode={handleToggleMode}
            pair={selectedPair}
            onOpenPairModal={() => setIsPairModalOpen(true)}
            timeframe={timeframe}
            onSelectTimeframe={setTimeframe}
            onOpenBrandingModal={() => setIsBrandingModalOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Global Modals */}
      <PairSelectorModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        selectedPair={selectedPair}
        onSelectPair={handleSelectPair}
        mode={marketMode}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <AlertsModal isOpen={isAlertsModalOpen} onClose={() => setIsAlertsModalOpen(false)} />

      <LogoBrandingModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
      />

      {/* Mobile PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  );
}
