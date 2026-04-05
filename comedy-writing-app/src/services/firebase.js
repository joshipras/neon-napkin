import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import * as Crypto from 'expo-crypto';
import QRCode from 'qrcode';
import { Platform } from 'react-native';
import {
  WORKSPACE_CONNECTION_STORAGE_KEY,
  WORKSPACE_PAIRING_STORAGE_KEY,
} from '../utils/jokeStorage';
import {
  getStoredValue,
  removeStoredValue,
  setStoredValue,
} from '../utils/persistentStorage';

const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

const hasFirebaseValue = Object.values(FIREBASE_CONFIG).some(Boolean);
const PAIRING_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAIRING_CODE_LENGTH = 8;
const PAIRING_CODE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_WEB_APP_URL = 'https://joke-writing-app.web.app';

let firebaseServices = null;

function getFirebaseServices() {
  if (!hasFirebaseConfig()) {
    if (hasFirebaseValue) {
      throw new Error('Firebase config is incomplete. Fill all EXPO_PUBLIC_FIREBASE_* values.');
    }

    return null;
  }

  if (firebaseServices) {
    return firebaseServices;
  }

  const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);
  firebaseServices = { app, db };
  return firebaseServices;
}

export const hasFirebaseConfig = () =>
  Boolean(
    FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.authDomain &&
      FIREBASE_CONFIG.projectId &&
      FIREBASE_CONFIG.storageBucket &&
      FIREBASE_CONFIG.messagingSenderId &&
      FIREBASE_CONFIG.appId
  );

const createRandomId = () => Crypto.randomUUID().replace(/-/g, '');

const createWorkspaceKey = () => `${createRandomId()}${createRandomId()}`;

const createPairingCodeValue = () => {
  let code = '';
  for (let index = 0; index < PAIRING_CODE_LENGTH; index += 1) {
    code += PAIRING_CODE_CHARS[Math.floor(Math.random() * PAIRING_CODE_CHARS.length)];
  }
  return code;
};

const getWorkspaceDocRef = (workspaceKey) => {
  const services = getFirebaseServices();
  if (!services || !workspaceKey) {
    return null;
  }

  return doc(services.db, 'workspaces', workspaceKey, 'appData', 'jokes');
};

const getPairingCodeDocRef = (code) => {
  const services = getFirebaseServices();
  if (!services || !code) {
    return null;
  }

  return doc(services.db, 'pairingCodes', code);
};

export async function loadStoredWorkspaceConnection() {
  const rawValue = await getStoredValue(WORKSPACE_CONNECTION_STORAGE_KEY);
  return rawValue ? JSON.parse(rawValue) : null;
}

export async function persistWorkspaceConnection(connection) {
  await setStoredValue(WORKSPACE_CONNECTION_STORAGE_KEY, JSON.stringify(connection));
}

export async function clearWorkspaceConnection() {
  await removeStoredValue(WORKSPACE_CONNECTION_STORAGE_KEY);
}

export async function loadStoredPairingSession() {
  const rawValue = await getStoredValue(WORKSPACE_PAIRING_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  const pairingSession = JSON.parse(rawValue);
  if (!pairingSession?.expiresAtMs || pairingSession.expiresAtMs <= Date.now()) {
    await clearStoredPairingSession();
    return null;
  }

  return pairingSession;
}

export async function persistPairingSession(session) {
  await setStoredValue(WORKSPACE_PAIRING_STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredPairingSession() {
  await removeStoredValue(WORKSPACE_PAIRING_STORAGE_KEY);
}

export async function createGuestWorkspaceConnection() {
  const now = new Date().toISOString();
  return {
    workspaceKey: createWorkspaceKey(),
    deviceId: createRandomId(),
    createdAt: now,
    lastOpenedAt: now,
    platform: Platform.OS,
    mode: 'guest',
  };
}

export function subscribeToRemoteJokes(workspaceKey, callback, onError) {
  const workspaceDocRef = getWorkspaceDocRef(workspaceKey);
  if (!workspaceDocRef) {
    callback(null);
    return () => {};
  }

  return onSnapshot(
    workspaceDocRef,
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.data() : null);
    },
    onError
  );
}

export async function saveRemoteJokes(workspaceKey, payload) {
  const workspaceDocRef = getWorkspaceDocRef(workspaceKey);
  if (!workspaceDocRef) {
    throw new Error('Firebase sync is not configured.');
  }

  await setDoc(
    workspaceDocRef,
    {
      ...payload,
      workspaceKey,
      syncedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function createPairingSession(workspaceKey) {
  const pairingCodeDocRef = getPairingCodeDocRef(createPairingCodeValue());
  if (!pairingCodeDocRef) {
    throw new Error('Firebase sync is not configured.');
  }

  const expiresAtMs = Date.now() + PAIRING_CODE_TTL_MS;
  const pairingCode = pairingCodeDocRef.id;

  await setDoc(
    pairingCodeDocRef,
    {
      code: pairingCode,
      workspaceKey,
      createdAtMs: Date.now(),
      expiresAtMs,
      usedAtMs: null,
    },
    { merge: false }
  );

  const pairingLink = buildPairingLink(pairingCode);
  let qrDataUrl = null;

  if (Platform.OS === 'web') {
    qrDataUrl = await QRCode.toDataURL(pairingLink, {
      width: 220,
      margin: 1,
      color: {
        dark: '#F5F4F1',
        light: '#111111',
      },
    });
  }

  const session = {
    code: pairingCode,
    expiresAtMs,
    pairingLink,
    qrDataUrl,
  };

  await persistPairingSession(session);
  return session;
}

export async function redeemPairingCode(rawCode) {
  const pairingCode = String(rawCode || '')
    .trim()
    .toUpperCase();

  if (!pairingCode) {
    throw new Error('Enter the sync code from your phone.');
  }

  const pairingCodeDocRef = getPairingCodeDocRef(pairingCode);
  if (!pairingCodeDocRef) {
    throw new Error('Firebase sync is not configured.');
  }

  const snapshot = await getDoc(pairingCodeDocRef);
  if (!snapshot.exists()) {
    throw new Error('That sync code could not be found. Generate a new one on your phone.');
  }

  const pairingRecord = snapshot.data();
  if (!pairingRecord?.workspaceKey) {
    throw new Error('That sync code is invalid.');
  }

  if (pairingRecord.expiresAtMs <= Date.now()) {
    await deleteDoc(pairingCodeDocRef).catch(() => {});
    throw new Error('That sync code expired. Generate a fresh one on your phone.');
  }

  await deleteDoc(pairingCodeDocRef).catch(() => {});
  await clearStoredPairingSession();

  return {
    workspaceKey: pairingRecord.workspaceKey,
    deviceId: createRandomId(),
    createdAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    platform: Platform.OS,
    mode: Platform.OS === 'web' ? 'paired_web' : 'guest',
  };
}

export function buildPairingLink(code) {
  const baseUrl = process.env.EXPO_PUBLIC_WEB_APP_URL || DEFAULT_WEB_APP_URL;
  return `${baseUrl.replace(/\/$/, '')}/?pair=${encodeURIComponent(code)}`;
}
