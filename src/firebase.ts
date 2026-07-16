import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Configuration loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyBhSMx7lDGIlGu7yeZFbDYQWA1upA2vwJM",
  authDomain: "poised-union-lk8sk.firebaseapp.com",
  projectId: "poised-union-lk8sk",
  storageBucket: "poised-union-lk8sk.firebasestorage.app",
  messagingSenderId: "845910316046",
  appId: "1:845910316046:web:cae858910e82b2d0b7985f"
};

export const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID and long polling to support restricted iframe environments (Incognito/Anonymous)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, "ai-studio-controlefinancei-e2408037-463e-44c3-bb76-9a797e34d24d");

export interface DbProduct {
  id?: string;
  name: string;
  price: number;
  barcode: string;
  updatedAt: string;
  unit?: string;
}

// Helper to save or update a product in the cloud
export async function saveProductToCloud(product: Omit<DbProduct, 'id' | 'updatedAt'>) {
  try {
    const cleanBarcode = String(product.barcode || '').trim();
    if (!cleanBarcode) return;

    // Use barcode as doc ID to avoid duplicates and allow easy lookups
    const docRef = doc(db, 'products', cleanBarcode);
    
    // Ensure price is saved as a float number
    const priceNum = typeof product.price === 'number' 
      ? product.price 
      : parseFloat(String(product.price || '0').replace(',', '.')) || 0;

    await setDoc(docRef, {
      name: String(product.name || '').trim().toUpperCase(),
      price: priceNum,
      barcode: cleanBarcode,
      unit: String(product.unit || 'UN').trim().toUpperCase(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('Produto salvo na nuvem com sucesso:', cleanBarcode);
  } catch (error) {
    console.error('Erro ao salvar produto na nuvem:', error);
  }
}

// Helper to search products by barcode
export async function searchProductByBarcode(barcode: string): Promise<DbProduct | null> {
  try {
    const cleanBarcode = String(barcode || '').trim();
    if (!cleanBarcode) return null;

    const docRef = doc(db, 'products', cleanBarcode);
    const q = query(collection(db, 'products'), where('barcode', '==', cleanBarcode));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const firstDoc = querySnapshot.docs[0];
      const data = firstDoc.data();
      const priceNum = typeof data?.price === 'number' 
        ? data.price 
        : parseFloat(String(data?.price || '0').replace(',', '.')) || 0;

      return { 
        id: firstDoc.id, 
        name: String(data?.name || '').toUpperCase(),
        price: priceNum,
        barcode: String(data?.barcode || firstDoc.id),
        unit: String(data?.unit || 'UN'),
        updatedAt: String(data?.updatedAt || '')
      } as DbProduct;
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar produto por código de barras:', error);
    return null;
  }
}

// Helper to search products by name (case-insensitive contains-like fallback)
export async function searchProductsByName(nameQuery: string): Promise<DbProduct[]> {
  try {
    const term = String(nameQuery || '').trim().toUpperCase();
    if (!term) return [];

    const querySnapshot = await getDocs(collection(db, 'products'));
    const results: DbProduct[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const name = String(data?.name || '').toUpperCase();
      const barcode = String(data?.barcode || docSnap.id).toUpperCase();
      if (name.includes(term) || barcode.includes(term)) {
        const priceNum = typeof data?.price === 'number' 
          ? data.price 
          : parseFloat(String(data?.price || '0').replace(',', '.')) || 0;

        results.push({ 
          id: docSnap.id, 
          name: name,
          price: priceNum,
          barcode: barcode,
          unit: String(data?.unit || 'UN'),
          updatedAt: String(data?.updatedAt || '')
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Erro ao buscar produtos por nome:', error);
    return [];
  }
}

// Helper to get all products from the cloud
export async function getAllCloudProducts(): Promise<DbProduct[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const results: DbProduct[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const priceNum = typeof data?.price === 'number' 
        ? data.price 
        : parseFloat(String(data?.price || '0').replace(',', '.')) || 0;

      results.push({ 
        id: docSnap.id, 
        name: String(data?.name || '').toUpperCase(),
        price: priceNum,
        barcode: String(data?.barcode || docSnap.id),
        unit: String(data?.unit || 'UN'),
        updatedAt: String(data?.updatedAt || '')
      } as DbProduct);
    });
    return results.sort((a, b) => {
      const nameA = String(a.name || '');
      const nameB = String(b.name || '');
      return nameA.localeCompare(nameB);
    });
  } catch (error) {
    console.error('Erro ao buscar todos os produtos:', error);
    return [];
  }
}

// Helper to delete a product from the cloud
export async function deleteProductFromCloud(barcode: string) {
  try {
    const docRef = doc(db, 'products', barcode.trim());
    await deleteDoc(docRef);
    console.log('Produto removido da nuvem:', barcode);
  } catch (error) {
    console.error('Erro ao remover produto da nuvem:', error);
  }
}
