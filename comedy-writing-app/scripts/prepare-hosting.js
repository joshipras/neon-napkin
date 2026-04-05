const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const staticDir = path.join(rootDir, 'static');
const assetsDir = path.join(rootDir, 'assets');

const ensureDist = () => {
  if (!fs.existsSync(distDir)) {
    throw new Error('dist directory does not exist. Run Expo export first.');
  }
};

const copyFile = (sourcePath, destinationPath) => {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
};

const copyStaticFiles = () => {
  if (!fs.existsSync(staticDir)) {
    return;
  }

  for (const entry of fs.readdirSync(staticDir)) {
    const sourcePath = path.join(staticDir, entry);
    const destinationPath = path.join(distDir, entry);
    copyFile(sourcePath, destinationPath);
  }
};

const copyAssetFiles = () => {
  const assetPairs = [
    ['app-icon.png', 'app-icon.png'],
    ['favicon.png', 'favicon.png'],
  ];

  for (const [sourceName, destinationName] of assetPairs) {
    const sourcePath = path.join(assetsDir, sourceName);
    if (!fs.existsSync(sourcePath)) {
      continue;
    }
    copyFile(sourcePath, path.join(distDir, destinationName));
  }
};

ensureDist();
copyStaticFiles();
copyAssetFiles();

console.log('Prepared hosting bundle with legal/support pages and icons.');
