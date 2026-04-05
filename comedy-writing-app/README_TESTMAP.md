Map test harness — quick local test before TestFlight

1) Set your iOS Google Maps API key in `app.json`:

   - Open `app.json` and replace `GOOGLE_MAPS_IOS_API_KEY` with your API key.

2) Install dependencies (recommended in an Expo project):

```bash
npm install -g expo-cli    # optional
npx expo install react-native-maps
```

3) Start Expo and open the test app:

```bash
npx expo start
# Then open the project in Expo Go (or a custom dev client) and choose MapTestApp (MapTestApp.js)
```

Notes:
- On iOS, to test the Google provider in a standalone/TestFlight build you must include the iOS API key in `app.json` under `expo.ios.config.googleMapsApiKey` and build with EAS or Xcode.
- Expo Go may show maps using Apple Maps on iOS. To verify Google Maps-specific behavior you need a standalone build or a custom dev client that includes the Google Maps SDK.

Files added:
- `MapTestApp.js` — entry you can point Expo to run for quick testing.
- `src/MapScreen.tsx` — full TSX component (kept for your RN/TS projects).
- `src/data/open_mics.json` — sample dataset.
