# Release Checklist

## App Identity

1. App name: `On Deck: Joke Writing & Mics`
2. Subtitle: `Write jokes. Track sets. Find mics.`
3. Bundle ID: `com.comedywriting.app`
4. Seller path: current individual Apple Developer account
5. Price: free
6. Device scope: iPhone only

## Before TestFlight Submission

1. Confirm the guest workspace is created automatically on first app launch.
2. Confirm phone-to-web pairing works with a sync code through the hosted website.
3. Confirm Firestore sync works across phone and web after pairing.
4. Confirm microphone recording, playback, and delete work on iPhone.
5. Confirm location permission text and open mic map behavior feel App Review-safe.
6. Confirm the hosted web app can edit and save jokes after pairing.
7. Upload App Store screenshots in this order:
   - Jokes board
   - Joke details
   - Open mics
   - Writing streak

## Legal / Support URLs

1. Privacy policy: `https://joke-writing-app.web.app/privacy.html`
2. Terms: `https://joke-writing-app.web.app/terms.html`
3. Support: `https://joke-writing-app.web.app/support.html`
4. Public support email: `prasitivity@gmail.com`

## EAS / App Store Connect

1. Run `npm run build:web` and `npm run deploy:web` when legal/support pages change.
2. Run `eas build --platform ios --profile production`.
3. Upload with `eas submit --platform ios --profile production`.
4. In App Store Connect:
   - confirm the app record if it already exists
   - set subtitle, categories, keywords, pricing, privacy answers, and review notes
   - keep the release iPhone-only and do not enable Mac distribution
   - enable TestFlight internal testing
   - request external TestFlight review and enable the public beta link
   - create App Store version `1.0.0`
   - attach the same approved production build and submit it for App Review

## Costs / Notes

- Apple Developer Program is a paid annual subscription.
- Firebase is usually low-cost or free at early scale, but not guaranteed.
- OpenAI and Google Places remain usage-billed if those features stay enabled.
- The terms and privacy pages included in this repo are strong starter drafts, not legal advice.
- Desktop/Mac access for v1 is the hosted website, not a Mac App Store download.
