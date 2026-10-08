# Temporary PWA Icons

These generated icons are functional placeholders so PWA installation, Android shortcuts and iOS Add to Home Screen can be tested before final artwork is available.

Replace all four files when the final icon is provided:

- `icon-192.png` — 192×192 standard PWA icon
- `icon-512.png` — 512×512 standard PWA icon
- `icon-maskable-512.png` — 512×512 with extra safe padding for Android adaptive masks
- `apple-touch-icon.png` — 180×180 iOS Home Screen icon

Keep the filenames and dimensions unchanged, then increment the cache name in `web/sw.js` so installed apps receive the new artwork.
