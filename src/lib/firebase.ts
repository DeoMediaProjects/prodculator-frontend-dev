import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBAKJzCFVB_l61IyPLBkQkfNLEyRyqN3oY',
  authDomain: 'prodculator-aeca5.firebaseapp.com',
  projectId: 'prodculator-aeca5',
  storageBucket: 'prodculator-aeca5.firebasestorage.app',
  messagingSenderId: '236165092682',
  appId: '1:236165092682:web:51528c758adedd03da9db3',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
