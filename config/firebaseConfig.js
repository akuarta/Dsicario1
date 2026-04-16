import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC-vXDqKvSotlNqS7ovqOSl5bXyL-HQnyw",
  authDomain: "dsicario-cd723.firebaseapp.com",
  projectId: "dsicario-cd723",
  storageBucket: "dsicario-cd723.firebasestorage.app",
  messagingSenderId: "758740272138",
  appId: "1:758740272138:web:fd1cace942a589f01d8bf3",
  measurementId: "G-1F5XJQFVJ7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

export { auth };
export const storage = getStorage(app);

export default app;
