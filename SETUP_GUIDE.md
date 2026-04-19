# 📚 Hướng Dẫn Sử Dụng Firestore

## Cấu trúc Firestore

```
users/
  ├── userId (tự động tạo khi đăng ký)
  │   ├── email (string)
  │   ├── createdAt (timestamp)
  │   ├── updatedAt (timestamp)
  │   └── cards/ (subcollection)
  │       ├── cardId
  │       │   ├── front (string)
  │       │   ├── back (string)
  │       │   ├── createdAt (timestamp)
  │       │   └── updatedAt (timestamp)
```

## Các Functions Disponible

Tất cả functions nằm trong file `src/services/flashcardService.js`

### 1. Lưu User (Đã được sử dụng trong Register)
```javascript
import { saveUserToFirestore } from '../../services/flashcardService';

// Gọi trong Register component
await saveUserToFirestore(userId, email);
```

### 2. Thêm Flashcard
```javascript
import { addFlashcard } from '../../services/flashcardService';

// userId: string (lấy từ user.uid)
// frontText: string (nội dung mặt trước)
// backText: string (nội dung mặt sau)
const cardId = await addFlashcard(userId, frontText, backText);
```

### 3. Lấy Tất Cả Flashcards
```javascript
import { getFlashcards } from '../../services/flashcardService';

// Trả về array các cards, sorted by createdAt (mới nhất trước)
const cards = await getFlashcards(userId);
```

### 4. Cập Nhật Flashcard
```javascript
import { updateFlashcard } from '../../services/flashcardService';

// cardId: string (ID của card cần update)
await updateFlashcard(userId, cardId, newFrontText, newBackText);
```

### 5. Xóa Flashcard
```javascript
import { deleteFlashcard } from '../../services/flashcardService';

// Xóa card theo ID
await deleteFlashcard(userId, cardId);
```

### 6. Lấy User Info
```javascript
import { getUserInfo } from '../../services/flashcardService';

// Lấy thông tin user từ Firestore
const userInfo = await getUserInfo(userId);
// userInfo = { email, createdAt, updatedAt }
```

## Cách Sử Dụng Trong Component

```jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { addFlashcard, getFlashcards } from '../services/flashcardService';

function FlashcardManager() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);

  // Load cards khi user login
  useEffect(() => {
    if (user) {
      loadCards();
    }
  }, [user]);

  const loadCards = async () => {
    try {
      const userCards = await getFlashcards(user.uid);
      setCards(userCards);
    } catch (error) {
      console.error('Lỗi load cards:', error);
    }
  };

  const handleSaveCard = async (frontText, backText) => {
    try {
      await addFlashcard(user.uid, frontText, backText);
      loadCards(); // Reload list
    } catch (error) {
      console.error('Lỗi save card:', error);
    }
  };

  return (
    // Your JSX here
  );
}

export default FlashcardManager;
```

## Bước Tiếp Theo

1. **Setup Firestore Rules** - Xem file `FIRESTORE_RULES.txt`
2. **Tích hợp vào Canvas Component** - Thêm nút "Lưu Card" để lưu canvas drawing
3. **Tạo List Cards** - Hiển thị danh sách cards đã lưu
4. **Edit/Delete** - Thêm chức năng chỉnh sửa và xóa cards
