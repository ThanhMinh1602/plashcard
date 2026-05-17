import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  setDoc, 
  getDoc,
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';

const DEFAULT_BACKGROUND_PAIR_ID = '1';

// ===== USER & AUTH =====
export const saveUserToFirestore = async (userId, email) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Lỗi lưu user:', error);
    throw error;
  }
};

export const getUserInfo = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('Lỗi lấy user info:', error);
    throw error;
  }
};

// ===== PACKAGE =====
export const getPackages = async (userId) => {
  try {
    const packagesRef = collection(db, 'users', userId, 'packages');
    const q = query(packagesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const packages = [];
    querySnapshot.forEach((item) => {
      packages.push({ id: item.id, ...item.data() });
    });
    return packages;
  } catch (error) {
    console.error('Lỗi lấy packages:', error);
    throw error;
  }
};

export const addPackage = async (userId, name = '', description = '') => {
  try {
    const packagesRef = collection(db, 'users', userId, 'packages');
    const newPkgRef = doc(packagesRef); 
    await setDoc(newPkgRef, {
      name: name?.trim() || '',
      description: description?.trim() || '',
      backgroundPairId: DEFAULT_BACKGROUND_PAIR_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newPkgRef.id;
  } catch (error) {
    console.error('Lỗi thêm gói:', error);
    throw error;
  }
};

export const updatePackage = async (userId, packageId, name = '', description = '') => {
  try {
    const packageRef = doc(db, 'users', userId, 'packages', packageId);
    await setDoc(packageRef, {
      name: name?.trim() || '',
      description: description?.trim() || '',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Lỗi cập nhật gói:', error);
    throw error;
  }
};

export const updatePackageBackground = async (
  userId,
  packageId,
  backgroundPairId = DEFAULT_BACKGROUND_PAIR_ID
) => {
  try {
    const packageRef = doc(db, 'users', userId, 'packages', packageId);
    await setDoc(
      packageRef,
      {
        backgroundPairId: String(backgroundPairId || DEFAULT_BACKGROUND_PAIR_ID),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Lá»—i cáº­p nháº­t ná»n gÃ³i:', error);
    throw error;
  }
};

export const deletePackage = async (userId, packageId) => {
  try {
    const cardsRef = collection(db, 'users', userId, 'packages', packageId, 'cards');
    const snapshot = await getDocs(cardsRef);
    const deletePromises = snapshot.docs.map(item => deleteDoc(item.ref));
    await Promise.all(deletePromises);
    await deleteDoc(doc(db, 'users', userId, 'packages', packageId));
  } catch (error) {
    console.error('Lỗi xóa gói:', error);
    throw error;
  }
};

// ===== FLASHCARD (Hỗ trợ tách mặt thẻ & Lách giới hạn 1MB) =====

// 1. Hàm lưu mặt thẻ đơn lẻ (Dùng setDoc để tự quản lý ID)
export const saveCardSide = async (userId, packageId, sideDocId, data) => {
  try {
    const cardRef = doc(db, 'users', userId, 'packages', packageId, 'cards', sideDocId);
    await setDoc(cardRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Lỗi lưu mặt thẻ:', error);
    throw error;
  }
};

// 2. Hàm lấy danh sách thẻ (Query gộp side)
export const getFlashcards = async (userId, packageId) => {
  try {
    const cardsRef = collection(db, 'users', userId, 'packages', packageId, 'cards');
    const q = query(cardsRef, orderBy('updatedAt'));
    const querySnapshot = await getDocs(q);
    const docs = [];
    querySnapshot.forEach((item) => {
      docs.push({ id: item.id, ...item.data() });
    });
    return docs; 
  } catch (error) {
    console.error('Lỗi lấy cards:', error);
    throw error;
  }
};

// 3. Hàm xóa cặp thẻ
const serializeExportValue = (value) => {
  if (value?.toDate) {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeExportValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeExportValue(item)])
    );
  }

  return value;
};

export const buildPackageExportData = async (userId, packageItem) => {
  const cards = await getFlashcards(userId, packageItem.id);

  return {
    schema: 'plashcard-package-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    package: {
      name: packageItem.name || '',
      description: packageItem.description || '',
      backgroundPairId: String(
        packageItem.backgroundPairId || DEFAULT_BACKGROUND_PAIR_ID
      ),
    },
    cards: cards.map((card) => {
      const pairId =
        card.pairId || card.localId || card.id?.replace(/_(front|back)$/, '');
      const side = card.side || (card.id?.endsWith('_back') ? 'back' : 'front');

      return serializeExportValue({
        ...card,
        id: card.id,
        pairId,
        userId,
        packageId: packageItem.id,
        localId: card.localId || pairId,
        side,
      });
    }),
  };
};

export const deleteFlashcardPair = async (userId, packageId, localId) => {
  try {
    const frontRef = doc(db, 'users', userId, 'packages', packageId, 'cards', `${localId}_front`);
    const backRef = doc(db, 'users', userId, 'packages', packageId, 'cards', `${localId}_back`);
    await Promise.all([deleteDoc(frontRef), deleteDoc(backRef)]);
  } catch (error) {
    console.error('Lỗi xóa cặp thẻ:', error);
    throw error;
  }
};

// --- ALIASES (Để tương thích với code cũ không bị crash) ---
export const addFlashcard = saveCardSide; 
export const updateFlashcard = saveCardSide;
export const deleteFlashcard = deleteFlashcardPair;
