# Application Icons

These files were generated from the owner-provided source artwork in `branding/app-icon-source.png`.

- `icon-192.png` — 192×192 standard PWA and shortcut icon
- `icon-512.png` — 512×512 standard PWA icon
- `icon-maskable-512.png` — 512×512 with extra safe padding for Android adaptive masks
- `apple-touch-icon.png` — 180×180 iOS Home Screen icon

Android density-specific launcher icons are generated from the same source under:

- `android/app/src/main/res/mipmap-mdpi/`
- `android/app/src/main/res/mipmap-hdpi/`
- `android/app/src/main/res/mipmap-xhdpi/`
- `android/app/src/main/res/mipmap-xxhdpi/`
- `android/app/src/main/res/mipmap-xxxhdpi/`

If the source artwork changes, regenerate all derivatives and increment `CACHE_NAME` in `web/sw.js` so installed PWAs receive the update.
