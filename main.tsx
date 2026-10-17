import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { AlertsProvider } from './context/AlertsContext';
import { LogoProvider } from './context/LogoContext';

createRoot(document.getElementById('root')!).render(
  <LanguageProvider>
    <AuthProvider>
      <AlertsProvider>
        <LogoProvider>
          <App />
        </LogoProvider>
      </AlertsProvider>
    </AuthProvider>
  </LanguageProvider>
);
