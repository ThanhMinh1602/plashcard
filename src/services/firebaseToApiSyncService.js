import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  addPackage,
  saveCardSide,
  updatePackageBackground,
} from './flashcardService';

const OLD_FIREBASE_USER_ID = '1GfpwBQ09qU7Rv0Da3HMQTv9bBC2';
const TARGET_API_USER_ID = '6a083b287c35e81559a25112';

/**
 * Hàm tạm thời để sync data từ Firebase cũ sang API mới.
 *
 * Luồng:
 * 1. Đọc packages từ Firebase user cũ.
 * 2. Với mỗi package, tạo package mới bên API.
 * 3. Đọc cards tách mặt front/back trong Firebase.
 * 4. Gửi từng side lên API mới.
 *
 * Backend mới hiện đã tự gộp:
 * - localId_front
 * - localId_back
 *
 * thành 1 document MongoDB theo localId.
 */
export const syncFirebaseCardsToApi = async ({ currentUser }) => {
  if (!currentUser) {
    throw new Error('Bạn cần đăng nhập trước khi sync.');
  }

  const currentUserId =
    currentUser.id ||
    currentUser._id ||
    currentUser.uid ||
    currentUser.userId;

  if (String(currentUserId) !== TARGET_API_USER_ID) {
    throw new Error(
      `Bạn đang đăng nhập sai user API. User hiện tại: ${currentUserId || 'Không xác định'}. Cần đăng nhập user: ${TARGET_API_USER_ID}`,
    );
  }

  const packagesRef = collection(
    db,
    'users',
    OLD_FIREBASE_USER_ID,
    'packages',
  );

  const packagesQuery = query(packagesRef, orderBy('createdAt', 'desc'));
  const packagesSnapshot = await getDocs(packagesQuery);

  let packageCount = 0;
  let cardSideCount = 0;

  for (const packageDoc of packagesSnapshot.docs) {
    const oldPackage = {
      id: packageDoc.id,
      ...packageDoc.data(),
    };

    const newPackageId = await addPackage(
      TARGET_API_USER_ID,
      oldPackage.name || '',
      oldPackage.description || '',
    );

    if (oldPackage.backgroundPairId) {
      await updatePackageBackground(
        TARGET_API_USER_ID,
        newPackageId,
        oldPackage.backgroundPairId,
      );
    }

    const cardsRef = collection(
      doc(
        db,
        'users',
        OLD_FIREBASE_USER_ID,
        'packages',
        packageDoc.id,
      ),
      'cards',
    );

    const cardsQuery = query(cardsRef, orderBy('updatedAt'));
    const cardsSnapshot = await getDocs(cardsQuery);

    for (const cardDoc of cardsSnapshot.docs) {
      const sideDocId = cardDoc.id;
      const cardData = cardDoc.data();

      await saveCardSide(
        TARGET_API_USER_ID,
        newPackageId,
        sideDocId,
        cardData,
      );

      cardSideCount += 1;
    }

    packageCount += 1;
  }

  return {
    packageCount,
    cardSideCount,
  };
};