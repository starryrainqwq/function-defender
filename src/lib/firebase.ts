import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "my-project-focus-craft",
  appId: "1:88490887868:web:8031139717e0c409165eb9",
  apiKey: "AIzaSyDfMLRPzvXDjIxGyqXjBq2iborRK0_IUPw",
  authDomain: "my-project-focus-craft.firebaseapp.com",
  storageBucket: "my-project-focus-craft.firebasestorage.app",
  messagingSenderId: "88490887868"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-functiondefender-43c49242-7203-4652-80c6-7186046dd3b0");
export const auth = getAuth(app);
