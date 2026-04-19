import React, { useState } from 'react';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Login({ onSwitch, onForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Sai tài khoản hoặc mật khẩu!");
    }
  };

  return (
    <div style={authStyles.container}>
      <h2>Đăng nhập</h2>
      <form onSubmit={handleLogin} style={authStyles.form}>
        <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required style={authStyles.input} />
        <input type="password" placeholder="Mật khẩu" onChange={(e) => setPassword(e.target.value)} required style={authStyles.input} />
        <button type="submit" style={authStyles.button}>Đăng nhập</button>
      </form>
      <p onClick={onForgot} style={authStyles.link}>Quên mật khẩu?</p>
      <p onClick={onSwitch} style={authStyles.link}>Chưa có tài khoản? Đăng ký</p>
    </div>
  );
}

const authStyles = {
  container: { padding: '20px', maxWidth: '400px', margin: 'auto', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' },
  button: { padding: '10px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  link: { color: '#007AFF', cursor: 'pointer', marginTop: '10px' }
};