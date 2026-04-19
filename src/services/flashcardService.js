import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

// ===== USER =====
export const saveUserToFirestore = async (userId, email) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
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
export const addPackage = async (userId, name = '', description = '') => {
  try {
    const packagesRef = collection(db, 'users', userId, 'packages');
    const docRef = await addDoc(packagesRef, {
      name: name?.trim() || '',
      description: description?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Lỗi thêm gói:', error);
    throw error;
  }
};

export const getPackages = async (userId) => {
  try {
    const packagesRef = collection(db, 'users', userId, 'packages');
    const q = query(packagesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const packages = [];
    querySnapshot.forEach((item) => {
      packages.push({
        id: item.id,
        ...item.data(),
      });
    });

    return packages;
  } catch (error) {
    console.error('Lỗi lấy packages:', error);
    throw error;
  }
};

export const updatePackage = async (userId, packageId, name = '', description = '') => {
  try {
    const packageRef = doc(db, 'users', userId, 'packages', packageId);
    await updateDoc(packageRef, {
      name: name?.trim() || '',
      description: description?.trim() || '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Lỗi cập nhật gói:', error);
    throw error;
  }
};

export const deletePackage = async (userId, packageId) => {
  try {
    const cardsRef = collection(db, 'users', userId, 'packages', packageId, 'cards');
    const cardsSnapshot = await getDocs(cardsRef);

    const deletePromises = [];
    cardsSnapshot.forEach((item) => {
      deletePromises.push(deleteDoc(item.ref));
    });
    await Promise.all(deletePromises);

    const packageRef = doc(db, 'users', userId, 'packages', packageId);
    await deleteDoc(packageRef);
  } catch (error) {
    console.error('Lỗi xóa gói:', error);
    throw error;
  }
};

// ===== FLASHCARD =====
export const addFlashcard = async (userId, packageId, front, back) => {
  try {
    const cardsRef = collection(db, 'users', userId, 'packages', packageId, 'cards');
    const docRef = await addDoc(cardsRef, {
      front,
      back,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Lỗi thêm card:', error);
    throw error;
  }
};

export const getFlashcards = async (userId, packageId) => {
  try {
    const cardsRef = collection(db, 'users', userId, 'packages', packageId, 'cards');
    const q = query(cardsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const cards = [];
    querySnapshot.forEach((item) => {
      cards.push({
        id: item.id,
        ...item.data(),
      });
    });

    return cards;
  } catch (error) {
    console.error('Lỗi lấy cards:', error);
    throw error;
  }
};

export const updateFlashcard = async (userId, packageId, cardId, front, back) => {
  try {
    const cardRef = doc(db, 'users', userId, 'packages', packageId, 'cards', cardId);
    await updateDoc(cardRef, {
      front,
      back,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Lỗi cập nhật card:', error);
    throw error;
  }
};

export const deleteFlashcard = async (userId, packageId, cardId) => {
  try {
    const cardRef = doc(db, 'users', userId, 'packages', packageId, 'cards', cardId);
    await deleteDoc(cardRef);
  } catch (error) {
    console.error('Lỗi xóa card:', error);
    throw error;
  }
};