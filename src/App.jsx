import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import CardsList from './components/CardsList/CardsList';
import EditCard from './components/EditCard/EditCard';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [currentPage, setCurrentPage] = useState('list'); // 'list' or 'edit'
  const [editingCard, setEditingCard] = useState(null);

  // Kiểm tra trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleAddCard = () => {
    setEditingCard(null);
    setCurrentPage('edit');
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setCurrentPage('edit');
  };

  const handleBackToList = () => {
    setCurrentPage('list');
    setEditingCard(null);
  };

  const handleCardSaved = () => {
    // Reload list when card is saved
    setCurrentPage('list');
  };

  if (!user) {
    if (authMode === 'register') return <Register onSwitch={() => setAuthMode('login')} />;
    if (authMode === 'forgot') return <ForgotPassword onBack={() => setAuthMode('login')} />;
    return <Login onSwitch={() => setAuthMode('register')} onForgot={() => setAuthMode('forgot')} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">✏️ Flashcard</h1>
            <p className="header-subtitle">Vẽ và học từ vựng</p>
          </div>
          <div className="header-right">
            <span className="user-greeting">Chào, <strong>{user.email}</strong></span>
            <button onClick={() => signOut(auth)} className="logout-btn">Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {currentPage === 'list' ? (
          <CardsList
            user={user}
            onAddCard={handleAddCard}
            onEditCard={handleEditCard}
          />
        ) : (
          <EditCard
            user={user}
            card={editingCard}
            onBack={handleBackToList}
            onCardSaved={handleCardSaved}
          />
        )}
      </main>
    </div>
  );
}

export default App;