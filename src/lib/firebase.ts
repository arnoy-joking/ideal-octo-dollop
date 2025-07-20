import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAh0wQ2RpkieY8r-XiqxOg9mnixf6zn41o",
  authDomain: "course-compass-m0rp7.firebaseapp.com",
  projectId: "course-compass-m0rp7",
  storageBucket: "course-compass-m0rp7.appspot.com",
  messagingSenderId: "481124240428",
  appId: "1:481124240428:web:0d7e41cb61cee0f39b1589"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
