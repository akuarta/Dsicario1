import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
