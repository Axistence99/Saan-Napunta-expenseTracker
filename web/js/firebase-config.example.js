/**
 * Copy to firebase-config.js, fill in your project's values, and load it BEFORE sync.js:
 *
 *   <script src="js/firebase-config.js"></script>
 *   <script src="js/sync.js"></script>
 *
 * If this global is absent, sync.js falls back to the built-in demo cloud and the app
 * stays completely offline. Never commit real values for a project with billing enabled;
 * these keys are public by design but the Firestore rules in docs/SYNC.md are what
 * actually protect the data.
 */
window.SAAN_FIREBASE_CONFIG = {
  apiKey: "AIza…",
  authDomain: "saan-napunta.firebaseapp.com",
  projectId: "saan-napunta",
  storageBucket: "saan-napunta.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:abcdef123456"
};
