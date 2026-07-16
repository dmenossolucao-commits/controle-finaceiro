// Re-export the single initialized Firebase and Firestore instances from the main entry point to avoid duplicate app errors
import { app, db } from '../firebase';

export { app, db };
export default db;
