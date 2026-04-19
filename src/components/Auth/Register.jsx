import React, { useState } from 'react';
import { auth } from '../../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function Register({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Đăng ký thành công!");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={authStyles.container}>
      <h2>Đăng ký</h2>
      <form onSubmit={handleRegister} style={authStyles.form}>
        <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required style={authStyles.input} />
        <input type="password" placeholder="Mật khẩu" onChange={(e) => setPassword(e.target.value)} required style={authStyles.input} />
        <button type="submit" style={authStyles.button}>Đăng ký</button>
      </form>
      <p onClick={onSwitch} style={authStyles.link}>Đã có tài khoản? Đăng nhập</p>
    </div>
  );
}

const authStyles = {
  container: { padding: '20px', maxWidth: '400px', margin: 'auto', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' },
  button: { padding: '10px', backgroundColor: '#34C759', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  link: { color: '#007AFF', cursor: 'pointer', marginTop: '10px' }
};