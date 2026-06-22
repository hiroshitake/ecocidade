import {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    signInWithCredential,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from './db';

// ── Setup Persistence (Important for Web) ──
if (Platform.OS === 'web') {
  setPersistence(auth, browserLocalPersistence).catch(error => {
    console.error('Persistence setup error:', error);
  });
}

/* TODO: REQUIREMENTS GAPS
 - Implement password reset: add `sendPasswordResetEmail` wrapper and error mapping; connect to UI in `app/login.tsx`.
 - Consider adding RBAC checks and admin role fetch for `admin-login` flow.
*/

// ── Cadastro com e-mail e senha ──
export async function register(email, password, name, birthdate, city = '') {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      birthdate,
      city,
      photoURL: user.photoURL || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return user;
  } catch (error) {
    throw error;
  }
}

// ── Login com e-mail e senha ──
export async function login(email, password) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return user;
  } catch (error) {
    throw error;
  }
}

// ── Login com Google ──
export async function loginWithGoogleToken(idToken, accessToken) {
  try {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    const { user } = await signInWithCredential(auth, credential);

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName || '',
        email: user.email || '',
        birthdate: '',
        photoURL: user.photoURL || '',
        authProvider: 'google',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      await updateDoc(userRef, {
        photoURL: user.photoURL || '',
        updatedAt: Timestamp.now(),
      });
    }

    return user;
  } catch (error) {
    throw new Error(`Google login failed: ${error.message}`);
  }
}

// ── Logout ──
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(`Logout failed: ${error.message}`);
  }
}

// ── Get Current User Data ──
export async function getCurrentUserData() {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const snap = await getDoc(doc(db, 'users', user.uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

// ── Auth State Listener ──
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Check Authentication Status ──
export function isAuthenticated() {
  return auth.currentUser !== null;
}

export async function getAdminRecordByCnpj(cnpj) {
  const cnpjCleaned = cnpj.replace(/\D/g, '');
  const q = query(collection(db, 'admin_users'), where('cnpj', '==', cnpjCleaned));
  const snap = await getDocs(q);
  return snap.docs.length ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
}

export async function signInAdmin(cnpj, password) {
  try {
    const adminRecord = await getAdminRecordByCnpj(cnpj);
    if (!adminRecord) {
      const error = new Error('Admin não encontrado para este CNPJ');
      error.code = 'auth/admin-not-found';
      throw error;
    }
    if (!adminRecord.email) {
      const error = new Error('Registro de admin incompleto. Email não encontrado.');
      error.code = 'auth/admin-email-missing';
      throw error;
    }

    const { user } = await signInWithEmailAndPassword(auth, adminRecord.email, password);
    return user;
  } catch (error) {
    // Re-throw Firebase auth errors with their original codes
    if (error.code) {
      throw error;
    }
    // If it's a generic error, re-throw with better message
    throw error;
  }
}

export async function isAdminUser(uid) {
  const q = query(collection(db, 'admin_users'), where('uid', '==', uid));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ── Update User Profile ──
export async function updateUserProfile(userId, data) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    throw new Error(`Update failed: ${error.message}`);
  }
}

// ── Recuperação de senha (reset) ──
export async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    // Repassar o objeto de erro do Firebase para o caller mapear mensagens
    throw error;
  }
}
