import React, { useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { addFlashcard } from '../../services/flashcardService';

/**
 * EXAMPLE: Cách lưu Canvas drawing vào Firestore
 * 
 * File này là ví dụ, bạn có thể adapt vào component thực tế
 */

export default function SaveCardExample() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const canvasRefFront = useRef(null);
  const canvasRefBack = useRef(null);

  const handleSaveCard = async () => {
    if (!user) {
      setMessage('❌ Vui lòng đăng nhập');
      return;
    }

    setLoading(true);
    setMessage('Đang lưu...');

    try {
      // Lấy canvas content dưới dạng base64
      const frontImage = canvasRefFront.current?.toDataURL();
      const backImage = canvasRefBack.current?.toDataURL();

      // Lưu vào Firestore
      const cardId = await addFlashcard(
        user.uid,
        frontImage || 'Mặt trước',
        backImage || 'Mặt sau'
      );

      setMessage(`✅ Lưu thành công! ID: ${cardId}`);
    } catch (error) {
      setMessage(`❌ Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleSaveCard} disabled={loading}>
        {loading ? 'Đang lưu...' : '💾 Lưu Thẻ'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}

// ========== CÁCH DÙNG ==========
// 
// 1. Import vào App.jsx
// 2. Thêm component này vào giao diện
// 3. Cập nhật canvasRefFront và canvasRefBack để trỏ đến Canvas elements
//
// ========== FULL EXAMPLE ==========
//
// import SaveCardExample from './components/Examples/SaveCardExample';
//
// function App() {
//   const canvasRefFront = useRef(null);
//   const canvasRefBack = useRef(null);
//
//   return (
//     <div>
//       <Canvas ref={canvasRefFront} />
//       <Canvas ref={canvasRefBack} />
//       <SaveCardExample 
//         canvasRefFront={canvasRefFront}
//         canvasRefBack={canvasRefBack}
//       />
//     </div>
//   );
// }
