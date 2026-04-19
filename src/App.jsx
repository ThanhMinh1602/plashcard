import React, { useEffect, useState } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { addPackage } from './services/flashcardService';

import CardsList from './components/CardsList/CardsList';
import EditCard from './components/EditCard/EditCard';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import PackageList from './components/Packages/PackageList';

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');

  const [currentPage, setCurrentPage] = useState('packages');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [editingCard, setEditingCard] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setCurrentPage('packages');
        setSelectedPackage(null);
        setEditingCard(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAddPackage = async () => {
  if (!user) return;

  try {
    const packageId = await addPackage(user.uid, '', '');
    const newPackage = {
      id: packageId,
      name: '',
      description: '',
    };

    setSelectedPackage(newPackage);
    setCurrentPage('cards');
  } catch (err) {
    console.error(err);
    alert('Lỗi tạo gói');
  }
};

  const handleOpenPackage = (packageItem) => {
    setSelectedPackage(packageItem);
    setEditingCard(null);
    setCurrentPage('cards');
  };

  const handleBackToPackages = () => {
    setCurrentPage('packages');
    setSelectedPackage(null);
    setEditingCard(null);
  };

  const handleAddCard = () => {
    setEditingCard(null);
    setCurrentPage('edit-card');
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setCurrentPage('edit-card');
  };

  const handleBackToCards = () => {
    setCurrentPage('cards');
    setEditingCard(null);
  };

  if (!user) {
    if (authMode === 'register') {
      return <Register onSwitch={() => setAuthMode('login')} />;
    }

    if (authMode === 'forgot') {
      return <ForgotPassword onBack={() => setAuthMode('login')} />;
    }

    return (
      <Login
        onSwitch={() => setAuthMode('register')}
        onForgot={() => setAuthMode('forgot')}
      />
    );
  }

  const isEditing = currentPage === 'edit-card';

  return (
    <div className={`app-container ${isEditing ? 'editor-mode' : ''}`}>
      {!isEditing && (
        <header className="app-header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="app-title">✏️ Flashcard</h1>
              <p className="header-subtitle">Gói flashcard và thẻ học</p>
            </div>

            <div className="header-right">
              <span className="user-greeting">
                Chào, <strong>{user.email}</strong>
              </span>
              <button onClick={() => signOut(auth)} className="logout-btn">
                Đăng xuất
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="app-main">
        {currentPage === 'packages' && (
          <PackageList
            user={user}
            onAddPackage={handleAddPackage}
            onOpenPackage={handleOpenPackage}
          />
        )}

        {currentPage === 'cards' && selectedPackage && (
          <CardsList
            user={user}
            packageItem={selectedPackage}
            onBack={handleBackToPackages}
            onAddCard={handleAddCard}
            onEditCard={handleEditCard}
            onPackageUpdated={setSelectedPackage}
          />
        )}

        {currentPage === 'edit-card' && selectedPackage && (
          <EditCard
            user={user}
            packageItem={selectedPackage}
            card={editingCard}
            onBack={handleBackToCards}
            onCardSaved={handleBackToCards}
          />
        )}
      </main>
    </div>
  );
}

export default App;