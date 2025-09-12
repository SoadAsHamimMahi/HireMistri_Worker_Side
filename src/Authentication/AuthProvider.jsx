import React, { createContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithCredential,
  EmailAuthProvider,
  updatePassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { app } from './firebaseConfig'; // ✅ import app

export const AuthContext = createContext(null);

const auth = getAuth(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account' // Force account selection to avoid Cross-Origin-Opener-Policy issues
});

const AuthProvider = ({ children }) => { // ✅ fixed `children`
  const [user, setUser] = useState(null);

  // Create new user
  const createUser = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // Sign in existing user
  const signIn = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password); // ✅ fixed
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      // Use redirect instead of popup to avoid Cross-Origin-Opener-Policy issues
      const result = await signInWithPopup(auth, googleProvider);
      return result;
    } catch (error) {
      console.error('Google Sign-in Error:', error);
      throw error;
    }
  };

  // Link Google account with existing email/password account
  const linkGoogleAccount = async (email, password) => {
    try {
      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(auth.currentUser, credential);
      return result;
    } catch (error) {
      console.error('Account Linking Error:', error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Logout
  const logOut = () => {
    return signOut(auth);
  };

  // Track current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      console.log("Current User:", currentUser);
    });
    return () => unsubscribe();
  }, []);

  const authInfo = {
    user,
    createUser,
    signIn,
    signInWithGoogle,
    linkGoogleAccount,
    resetPassword,
    logOut
  };

  return (
    <AuthContext.Provider value={authInfo}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
