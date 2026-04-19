import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Flashcard from './components/Flashcard/Flashcard';
import Canvas from './components/DrawingBoard/Canvas';
import Toolbar from './components/DrawingBoard/Toolbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot'

  // Kiểm tra trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Các state cho Flashcard
  const [isFlipped, setIsFlipped] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(5);
  const [opacity, setOpacity] = useState(1);

  if (!user) {
    if (authMode === 'register') return <Register onSwitch={() => setAuthMode('login')} />;
    if (authMode === 'forgot') return <ForgotPassword onBack={() => setAuthMode('login')} />;
    return <Login onSwitch={() => setAuthMode('register')} onForgot={() => setAuthMode('forgot')} />;
  }

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Chào, {user.email}</span>
        <button onClick={() => signOut(auth)}>Đăng xuất</button>
      </div>

      <h1>Flashcard App</h1>
      <button onClick={() => setIsFlipped(!isFlipped)} style={{ marginBottom: '10px', padding: '10px' }}>🔃 Lật thẻ</button>
      
      <Flashcard 
        isFlipped={isFlipped} 
        front={<Canvas tool={tool} color={color} size={size} opacity={opacity} />} 
        back={<Canvas tool={tool} color={color} size={size} opacity={opacity} />} 
      />

      <Toolbar 
        activeTool={tool} setActiveTool={setTool}
        color={color} setColor={setColor}
        size={size} setSize={setSize}
        opacity={opacity} setOpacity={setOpacity}
      />
    </div>
  );
}

export default App;