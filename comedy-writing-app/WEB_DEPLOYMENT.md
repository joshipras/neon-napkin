# Web Deployment

This app already supports Expo web, so the easiest desktop-sync path is:

1. Build the web bundle
2. Deploy it to Firebase Hosting
3. Sign into the same Firebase account on phone and web
4. On Mac, install the website as a Dock app from Safari or Chrome

## 1. Build the web app

```bash
cd '/Users/prasanna/Documents/Comedy Writing App'
npx expo export --platform web
```

That writes the static site to `dist/`.

## 2. Apply Firestore rules

The app expects each user to read and write only their own sync document:

```bash
firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` into Firebase Console:

- Firebase Console
- Firestore Database
- Rules

## 3. Deploy the website

If you do not already have the Firebase CLI installed:

```bash
npx firebase-tools login
```

Then deploy:

```bash
npx firebase-tools deploy --only hosting
```

## 4. Use the web app on Mac

After deploy, open the Firebase Hosting URL on your Mac and sign in with the same email/password account you use on iPhone.

- Safari: File -> Add to Dock
- Chrome: More tools -> Create shortcut / Install app

That gives you an app-like desktop launcher without building a separate Mac App Store app.

## Notes

- Web is the fastest way to get synced desktop access.
- A true Mac App Store app would be a larger separate packaging/distribution task.
- If sync still fails after sign-in, check Firestore rules first.
