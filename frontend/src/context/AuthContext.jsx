import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../config/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Create or fetch user Firestore doc ────────────────
  const syncUserDoc = async (firebaseUser, overrideRole = null) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // First login — create document
      const newUser = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL || null,
        role: overrideRole || 'student',
        enrolledCourseIds: [],
        createdCourseIds: [],
        createdAt: serverTimestamp(),
      };
      await setDoc(userRef, newUser);
      return newUser.role;
    } else {
      const data = snap.data();
      return data.role || 'student';
    }
  };

  // ── Google Sign-In ─────────────────────────────────────
  const signInWithGoogle = async (role = 'student') => {
    const result = await signInWithPopup(auth, googleProvider);
    const role_ = await syncUserDoc(result.user, role);
    setUserRole(role_);
    return result.user;
  };

  // ── Email/Password Sign-Up ─────────────────────────────
  const signUpWithEmail = async (email, password, name, role = 'student') => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Update display name isn't needed for our flow since we store in Firestore
    await syncUserDoc({ ...result.user, displayName: name }, role);
    return result.user;
  };

  // ── Email/Password Sign-In ─────────────────────────────
  const signInWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  // ── Sign Out ───────────────────────────────────────────
  const signOut = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserRole(null);
  };

  // ── Get ID Token for backend API calls ────────────────
  const getIdToken = async () => {
    if (!currentUser) return null;
    return await currentUser.getIdToken();
  };

  // ── Auth state listener ────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        const role = await syncUserDoc(firebaseUser);
        setUserRole(role);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userRole,
    loading,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signOut,
    getIdToken,
    isInstructor: userRole === 'instructor',
    isStudent: userRole === 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
