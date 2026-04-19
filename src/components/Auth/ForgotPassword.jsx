import React, { useState } from 'react';
import { auth } from '../../services/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Đã gửi email khôi phục mật khẩu. Kiểm tra hộp thư của bạn!");
      onBack();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={authStyles.container}>
      <h2>Khôi phục mật khẩu</h2>
      <form onSubmit={handleReset} style={authStyles.form}>
        <input type="email" placeholder="Nhập email của bạn" onChange={(e) => setEmail(e.target.value)} required style={authStyles.input} />
        <button type="submit" style={authStyles.button}>Gửi email reset</button>
      </form>
      <p onClick={onBack} style={authStyles.link}>Quay lại đăng nhập</p>
    </div>
  );
}

const authStyles = {
  container: { padding: '20px', maxWidth: '400px', margin: 'auto', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' },
  button: { padding: '10px', backgroundColor: '#FF9500', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  link: { color: '#007AFF', cursor: 'pointer', marginTop: '10px' }
};