// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyARfz_OTYhjNn7DI89xYG-x0KxWiLU16ak",
  authDomain: "aiaccount-1c845.firebaseapp.com",
  projectId: "aiaccount-1c845",
  storageBucket: "aiaccount-1c845.firebasestorage.app",
  messagingSenderId: "291129507535",
  appId: "1:291129507535:web:9c8e48c7b7baf57e1d81ba",
  measurementId: "G-F6MWWJ73VS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environment)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, analytics };
