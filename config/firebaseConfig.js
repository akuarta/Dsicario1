import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAAaXyPBFqaoplWEJteD4kueXbjGI74Ga4",
  authDomain: "dsicario-cd723.firebaseapp.com",
  projectId: "dsicario-cd723",
  storageBucket: "dsicario-cd723.firebasestorage.app",
  messagingSenderId: "758740272138",
  appId: "1:758740272138:android:c375b77acc20d7081d8bf3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
