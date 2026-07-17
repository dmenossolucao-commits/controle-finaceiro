import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

// Resolve the correct storage bucket name from firebase-applet-config.json
const bucketName = firebaseConfig.storageBucket || `${firebaseConfig.projectId}.appspot.com`;

console.log(`[Firebase Initialization] Initializing Storage with bucket: gs://${bucketName}`);
export const storage = getStorage(app, `gs://${bucketName}`);

// Limit upload and operation retries so errors fail fast with clear logs in the UI/Console
storage.maxUploadRetryTime = 15000; // 15 seconds
storage.maxOperationRetryTime = 15000; // 15 seconds

