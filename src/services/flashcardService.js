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

// Lưu user vào Firestore khi đăng ký
export const saveUserToFirestore = async (userId, email) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Lỗi lưu user:', error);
    throw error;
  }
};

// Thêm flashcard mới
export const addFlashcard = async (userId, frontText, backText) => {
  try {
    const cardsRef = collection(db, 'users', userId, 'cards');
    const docRef = await addDoc(cardsRef, {
      front: frontText,
      back: backText,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Lỗi thêm card:', error);
    throw error;
  }
};

// Lấy tất cả flashcard của user
export const getFlashcards = async (userId) => {
  try {
    const cardsRef = collection(db, 'users', userId, 'cards');
    const q = query(cardsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const cards = [];
    querySnapshot.forEach((doc) => {
      cards.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return cards;
  } catch (error) {
    console.error('Lỗi lấy cards:', error);
    throw error;
  }
};

// Cập nhật flashcard
export const updateFlashcard = async (userId, cardId, frontText, backText) => {
  try {
    const cardRef = doc(db, 'users', userId, 'cards', cardId);
    await updateDoc(cardRef, {
      front: frontText,
      back: backText,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Lỗi cập nhật card:', error);
    throw error;
  }
};

// Xóa flashcard
export const deleteFlashcard = async (userId, cardId) => {
  try {
    const cardRef = doc(db, 'users', userId, 'cards', cardId);
    await deleteDoc(cardRef);
  } catch (error) {
    console.error('Lỗi xóa card:', error);
    throw error;
  }
};

// Lấy user info
export const getUserInfo = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Lỗi lấy user info:', error);
    throw error;
  }
};
