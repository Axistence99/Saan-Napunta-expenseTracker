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
  // Public browser identifier issued by Firebase for this web application.
  apiKey: "AIza…",

  // Domain used by Firebase Authentication during Google sign-in.
  authDomain: "saan-napunta.firebaseapp.com",

  // Firebase project containing the authenticated Firestore ledger documents.
  projectId: "saan-napunta",

  // Included for Firebase initialization; receipt photos are intentionally never uploaded.
  storageBucket: "saan-napunta.appspot.com",

  // Project sender number and app ID supplied by the Firebase console.
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:abcdef123456"
};
