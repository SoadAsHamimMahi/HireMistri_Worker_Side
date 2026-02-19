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
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification
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

  // Send email verification
  const sendVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error('No user logged in');
    return sendEmailVerification(auth.currentUser);
  };

  // Reload user to get latest emailVerified status
  const reloadUser = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser }); // Trigger state update
  };

  // Update Firebase Auth displayName (keeps Auth in sync with MongoDB profile)
  const updateProfileDisplayName = async (displayName) => {
    if (!auth.currentUser || !displayName || typeof displayName !== 'string') return;
    const trimmed = displayName.trim();
    if (!trimmed) return;
    await updateProfile(auth.currentUser, { displayName: trimmed });
    setUser({ ...auth.currentUser }); // Trigger state update
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
    sendVerificationEmail,
    reloadUser,
    updateProfileDisplayName,
    logOut
  };

  return (
    <AuthContext.Provider value={authInfo}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
