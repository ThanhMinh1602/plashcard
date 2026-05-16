import { apiRequest } from './apiClient';

const DEFAULT_BACKGROUND_PAIR_ID = '1';

// Giữ lại chữ ký hàm giống Firebase service cũ để ít sửa component nhất.
// userId được giữ trong params để tương thích code cũ,
// backend lấy user từ JWT nên không cần dùng userId.
export const saveUserToFirestore = async () => null;

export const getUserInfo = async () => {
  const data = await apiRequest('/auth/me');
  return data.user;
};

export const getPackages = async () => {
  return apiRequest('/packages');
};

export const getDeletedPackages = async () => {
  return apiRequest('/packages/trash');
};

export const addPackage = async (_userId, name = '', description = '') => {
  const data = await apiRequest('/packages', {
    method: 'POST',
    body: {
      name,
      description,
    },
  });

  return data.id;
};

export const updatePackage = async (
  _userId,
  packageId,
  name = '',
  description = '',
) => {
  await apiRequest(`/packages/${packageId}`, {
    method: 'PUT',
    body: {
      name,
      description,
    },
  });
};

export const updatePackageBackground = async (
  _userId,
  packageId,
  backgroundPairId = DEFAULT_BACKGROUND_PAIR_ID,
) => {
  await apiRequest(`/packages/${packageId}/background`, {
    method: 'PATCH',
    body: {
      backgroundPairId: String(backgroundPairId || DEFAULT_BACKGROUND_PAIR_ID),
    },
  });
};

export const deletePackage = async (_userId, packageId) => {
  await apiRequest(`/packages/${packageId}`, {
    method: 'DELETE',
  });
};

export const restorePackage = async (_userId, packageId) => {
  return apiRequest(`/packages/${packageId}/restore`, {
    method: 'PATCH',
  });
};

export const permanentlyDeletePackage = async (_userId, packageId) => {
  await apiRequest(`/packages/${packageId}/permanent`, {
    method: 'DELETE',
  });
};

export const saveCardSide = async (_userId, packageId, sideDocId, data) => {
  await apiRequest(`/packages/${packageId}/cards/${sideDocId}`, {
    method: 'PUT',
    body: data,
  });
};

export const bulkSaveCards = async (_userId, packageId, cards = []) => {
  return apiRequest(`/packages/${packageId}/cards/bulk`, {
    method: 'PUT',
    body: {
      cards,
    },
  });
};

export const getFlashcards = async (_userId, packageId) => {
  return apiRequest(`/packages/${packageId}/cards`);
};

export const deleteFlashcardPair = async (_userId, packageId, localId) => {
  await apiRequest(`/packages/${packageId}/cards/pair/${localId}`, {
    method: 'DELETE',
  });
};

export const addFlashcard = saveCardSide;
export const updateFlashcard = saveCardSide;
export const deleteFlashcard = deleteFlashcardPair;
