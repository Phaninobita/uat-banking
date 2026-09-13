/**
 * Synchronizes customer portal web assets to the Android application assets directory.
 * Excludes all Relationship Manager (RM) portal assets to keep the Android app strictly for customers.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_PUBLIC = path.join(ROOT_DIR, 'web', 'public');
const ANDROID_ASSETS = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'assets', 'public');

function copyDirRecursive(src, dest, excludeFilter) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (excludeFilter && excludeFilter(entry.name, srcPath)) {
            continue;
        }

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath, excludeFilter);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('🔄 Syncing Customer Portal assets to Android project...');

// 1. Copy CSS
console.log('  -> Copying css/...');
copyDirRecursive(path.join(WEB_PUBLIC, 'css'), path.join(ANDROID_ASSETS, 'css'));

// 2. Copy JS (excluding RM files)
console.log('  -> Copying js/... (excluding RM files)');
copyDirRecursive(path.join(WEB_PUBLIC, 'js'), path.join(ANDROID_ASSETS, 'js'), (name) => {
    return name.startsWith('rm') || name.includes('rm.');
});

// 3. Transform and copy index.html
console.log('  -> Processing and copying index.html...');
let html = fs.readFileSync(path.join(WEB_PUBLIC, 'index.html'), 'utf-8');

// Ensure relative paths for file:///android_asset loading
html = html.replace('href="/css/style.css', 'href="css/style.css');
html = html.replace('src="/js/pdf.min.js', 'src="js/pdf.min.js');
html = html.replace('src="/js/api.js', 'src="js/api.js');
html = html.replace('src="/js/app.js', 'src="js/app.js');

// Add mobile viewport fit
if (!html.includes('viewport-fit=cover')) {
    html = html.replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">'
    );
}

// Inject android-bridge.js before api.js
if (!html.includes('android-bridge.js')) {
    html = html.replace(
        '<script src="js/api.js',
        '<script src="js/android-bridge.js?v=20260912_01"></script>\n    <script src="js/api.js'
    );
}

fs.writeFileSync(path.join(ANDROID_ASSETS, 'index.html'), html, 'utf-8');

console.log('✅ Android Customer Portal assets synchronized successfully!');
console.log(`📂 Location: ${ANDROID_ASSETS}`);
