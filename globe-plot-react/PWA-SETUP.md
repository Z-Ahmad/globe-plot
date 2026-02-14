# Progressive Web App (PWA) Setup Guide

## Overview

Globeplot is now a fully functional Progressive Web App (PWA) that can be installed on desktop and mobile devices, works offline, and provides a native app-like experience.

## Features Implemented

### 1. **Auto-Updating Service Worker**
- Automatically updates to the latest version when available
- Uses the `autoUpdate` strategy for seamless updates
- No manual intervention required from users

### 2. **Offline Support**
- Core functionality works offline with intelligent caching
- Service worker precaches all static assets (JS, CSS, HTML, images, videos)
- Smart runtime caching for external resources

### 3. **App Installation**
- Users can install Globeplot on:
  - Desktop (Windows, macOS, Linux)
  - Mobile (iOS, Android)
- Appears in app drawer/launcher like native apps
- Runs in standalone mode without browser UI

### 4. **Intelligent Caching Strategies**

#### Mapbox API Caching (CacheFirst)
```typescript
{
  urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
  handler: "CacheFirst",
  expiration: {
    maxEntries: 50,
    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
  }
}
```
- Mapbox tiles and API responses are cached for 30 days
- Reduces data usage and improves map loading performance
- Supports offline map viewing (for previously visited areas)

#### Firebase Storage Caching (StaleWhileRevalidate)
```typescript
{
  urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
  handler: "StaleWhileRevalidate",
  expiration: {
    maxEntries: 100,
    maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
  }
}
```
- Document files (PDFs, images) are cached for 7 days
- Uses stale content while fetching fresh data in background
- Balances performance with data freshness

### 5. **Web App Manifest**
- Complete manifest with proper metadata
- Icons in multiple sizes (192x192, 512x512)
- Theme colors matching the app design
- Standalone display mode for native-like experience

## Installation

### For Developers

1. **Install Dependencies**
```bash
npm install -D vite-plugin-pwa
```

2. **Configuration** (Already Done)
The PWA configuration is in `vite.config.ts`:
```typescript
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [...],
      manifest: {...},
      workbox: {...},
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
});
```

### For End Users

#### Desktop Installation
1. Visit the Globeplot website
2. Look for the install icon in the browser address bar (Chrome/Edge) or app menu (Firefox)
3. Click "Install" to add Globeplot to your desktop
4. Launch from your applications menu or taskbar

#### Mobile Installation (iOS)
1. Open Globeplot in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm

#### Mobile Installation (Android)
1. Open Globeplot in Chrome or Samsung Internet
2. Tap the three-dot menu
3. Tap "Install App" or "Add to Home screen"
4. Follow the prompts to install

## Development

### Testing PWA in Development
PWA functionality is enabled in development mode:
```bash
npm run dev
```

Then open http://localhost:5173 and:
1. Open DevTools (F12)
2. Go to "Application" tab
3. Check "Service Workers" to see registration status
4. Check "Manifest" to verify app manifest

### Building for Production
```bash
npm run build
```

The build process will:
1. Generate optimized service worker
2. Create web app manifest
3. Precache all static assets
4. Output to `dist/` directory

### Preview Production Build
```bash
npm run preview
```

Test the PWA functionality with the production build locally.

## Cache Management

### Automatic Cache Updates
The service worker automatically:
- Updates caches when new versions are deployed
- Removes outdated cache entries
- Manages cache size limits (50 Mapbox entries, 100 Firebase Storage entries)

### Manual Cache Clearing (If Needed)
Users can clear the cache through:
1. Browser settings > Clear browsing data > Cached images and files
2. DevTools > Application > Cache Storage > Delete

For developers:
```javascript
// In browser console
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

## Files Generated

### Build Time
- `/dist/sw.js` - Service worker file
- `/dist/manifest.webmanifest` - Web app manifest
- `/dist/registerSW.js` - Service worker registration script

### Runtime (Browser)
- Service worker caches in browser storage
- IndexedDB for Workbox runtime caching
- LocalStorage for app state

## Performance Benefits

1. **Faster Load Times**
   - Static assets cached on first visit
   - Subsequent visits load instantly from cache

2. **Reduced Data Usage**
   - Mapbox tiles cached for 30 days
   - Documents cached for 7 days
   - Only changed files are downloaded on updates

3. **Offline Functionality**
   - View previously loaded trips offline
   - Access cached maps and documents
   - Smooth degradation when network unavailable

4. **Native-Like Experience**
   - No browser UI in standalone mode
   - Full-screen display
   - Launch from home screen/desktop

## Browser Support

### Desktop
- ✅ Chrome/Edge (Windows, macOS, Linux)
- ✅ Firefox (Windows, macOS, Linux)
- ✅ Safari (macOS) - Limited PWA support
- ❌ Safari (Windows) - Not supported

### Mobile
- ✅ Chrome (Android)
- ✅ Samsung Internet (Android)
- ✅ Safari (iOS 11.3+)
- ✅ Edge (Android/iOS)

## Troubleshooting

### Service Worker Not Registering
1. Check browser console for errors
2. Ensure HTTPS (or localhost for development)
3. Clear browser cache and hard reload (Ctrl+Shift+R)
4. Check DevTools > Application > Service Workers

### Install Prompt Not Showing
1. Ensure all PWA criteria are met:
   - HTTPS connection
   - Valid web app manifest
   - Service worker registered
   - User has visited site multiple times
2. Try different browser (Chrome recommended)
3. Check DevTools > Console for manifest errors

### Offline Features Not Working
1. Verify service worker is active (DevTools > Application)
2. Check cache storage has content
3. Ensure resources were cached on first visit
4. Some features require network (authentication, document upload)

### Updates Not Applying
1. Close all app instances
2. Clear service worker: DevTools > Application > Service Workers > Unregister
3. Hard reload page (Ctrl+Shift+R)
4. Service worker will re-register automatically

## Future Enhancements

Potential improvements for the PWA:

1. **Background Sync**
   - Queue document uploads when offline
   - Sync when connection is restored

2. **Push Notifications**
   - Trip reminders
   - Shared trip updates
   - Document processing completion alerts

3. **Advanced Caching**
   - Smart prefetching of upcoming trip locations
   - Predictive caching based on usage patterns

4. **Offline Editor**
   - Edit trips offline with conflict resolution
   - Sync changes when back online

5. **Install Promotion**
   - Custom install prompt UI
   - Show install benefits to users
   - Track installation metrics

## Resources

- [Vite PWA Plugin Documentation](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA Course](https://web.dev/learn/pwa/)

## Support

For issues or questions about the PWA implementation:
1. Check browser console for errors
2. Verify service worker status in DevTools
3. Review this documentation
4. Contact the development team

---

**Note**: The PWA implementation follows best practices from Google's Workbox and the Vite PWA plugin. The configuration is optimized for Globeplot's specific use case with travel documents, maps, and real-time data.
