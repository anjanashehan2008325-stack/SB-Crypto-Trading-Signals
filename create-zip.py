import os
import zipfile

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
public_dir = os.path.join(root_dir, 'public')
output_zip = os.path.join(public_dir, 'SBCrypto-App.zip')

exclude_dirs = {'node_modules', 'dist', '.git', '.aistudio', '__pycache__', '.vite'}
exclude_extensions = {'.zip', '.tar', '.gz'}

print(f"Creating zip file at {output_zip}...")

with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(root_dir):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            file_path = os.path.join(root, file)
            # Avoid self-inclusion of the zip file
            if file == 'SBCrypto-App.zip' or any(file.endswith(ext) for ext in exclude_extensions):
                continue
                
            arcname = os.path.relpath(file_path, root_dir)
            zipf.write(file_path, arcname)

size_mb = os.path.getsize(output_zip) / (1024 * 1024)
print(f"Successfully generated SBCrypto-App.zip! Size: {size_mb:.2f} MB")
