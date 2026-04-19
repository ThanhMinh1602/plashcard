# 🎓 Flashcard App - User & Firestore Integration

## ✅ Những gì đã được hoàn thành

### 1. **Authentication (Đăng nhập / Đăng ký)**
- ✅ Login - Đăng nhập với email/password
- ✅ Register - Đăng ký tài khoản mới
- ✅ Forgot Password - Khôi phục mật khẩu
- ✅ Error handling - Chi tiết lỗi cho mỗi trường hợp
- ✅ Loading states - UX tốt hơn

### 2. **Firestore Integration**
- ✅ Lưu user info khi đăng ký
- ✅ Cơ sở hạ tầng sẵn sàng để lưu flashcards
- ✅ Subcollection cards cho mỗi user
- ✅ Timestamps (createdAt, updatedAt) tự động

## 📁 Cấu trúc Firestore

```
users/ (collection)
  ├── {userId}
  │   ├── email: string
  │   ├── createdAt: timestamp
  │   ├── updatedAt: timestamp
  │   └── cards/ (subcollection)
  │       ├── {cardId}
  │       │   ├── front: string (nội dung mặt trước)
  │       │   ├── back: string (nội dung mặt sau)
  │       │   ├── createdAt: timestamp
  │       │   └── updatedAt: timestamp
```

## 🔧 Cách Sử Dụng Functions

Tất cả functions nằm trong `src/services/flashcardService.js`

### Lấy User ID trong Component
```jsx
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { user } = useAuth();
  
  // Lấy userId
  const userId = user?.uid;
  
  return <div>...</div>;
}
```

### Lưu Flashcard
```jsx
import { addFlashcard } from '../services/flashcardService';

// Trong event handler
const handleSave = async () => {
  try {
    const cardId = await addFlashcard(
      user.uid,
      'Nội dung mặt trước',
      'Nội dung mặt sau'
    );
    console.log('Card saved:', cardId);
  } catch (error) {
    console.error('Lỗi:', error);
  }
};
```

### Lấy Danh Sách Cards
```jsx
import { getFlashcards } from '../services/flashcardService';
import { useEffect, useState } from 'react';

function CardsList() {
  const [cards, setCards] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      getFlashcards(user.uid)
        .then(setCards)
        .catch(console.error);
    }
  }, [user]);

  return (
    <div>
      {cards.map(card => (
        <div key={card.id}>
          <p>{card.front}</p>
          <p>{card.back}</p>
        </div>
      ))}
    </div>
  );
}
```

### Cập Nhật / Xóa Card
```jsx
import { updateFlashcard, deleteFlashcard } from '../services/flashcardService';

// Cập nhật
await updateFlashcard(userId, cardId, newFront, newBack);

// Xóa
await deleteFlashcard(userId, cardId);
```

## 🔐 Firestore Security Rules

**⚠️ QUAN TRỌNG**: Bạn phải setup Firestore Rules để app hoạt động đúng

1. Vào [Firebase Console](https://console.firebase.google.com)
2. Chọn project `flash-card-72702`
3. Vào **Firestore Database** → **Rules**
4. Copy rules từ `FIRESTORE_RULES.txt`
5. Nhấn **Publish**

**Rules này cho phép:**
- Users chỉ có thể đọc/viết data của chính mình
- Tạo/cập nhật/xóa cards chỉ cho user đó

## 📝 Các Files Mới

- `src/services/flashcardService.js` - Tất cả Firestore functions
- `src/hooks/useAuth.js` - Custom hook để lấy user info
- `FIRESTORE_RULES.txt` - Security rules cần apply
- `SETUP_GUIDE.md` - Chi tiết hướng dẫn sử dụng

## 🚀 Các Bước Tiếp Theo

1. **Setup Firestore Rules** (Xem hướng dẫn ở trên)
2. **Thêm nút Save Card** - Trong Canvas hoặc Toolbar
3. **Hiển thị danh sách cards** - Thêm sidebar hoặc modal
4. **Export/Import** - Cho phép download/upload cards
5. **Sharing** - Chia sẻ cards với users khác (tuỳ chọn)

## 🧪 Test Đăng Ký

1. Vào http://localhost:5174/
2. Nhấn "Đăng ký"
3. Nhập email và password
4. Nhấn "Đăng ký"
5. Nếu thành công → Sẽ tự redirect về Login
6. Kiểm tra Firebase Console → Firestore → Users collection

## 💡 Notes

- User info được lưu **tự động** khi đăng ký
- Mỗi user có **riêng collection cards**
- Cards được sort by **createdAt** (mới nhất trước)
- Timestamps được set **server-side** (chính xác hơn)

Nếu gặp vấn đề, kiểm tra:
1. Firestore Rules được publish chưa?
2. API Key có enable Firestore API chưa?
3. Console có error messages gì không?
