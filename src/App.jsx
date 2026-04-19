import React, { useEffect, useState } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { addPackage } from './services/flashcardService';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import PackageList from './components/Packages/PackageList';
import CardsList from './components/CardsList/CardsList';
import StudyScreen from './components/Study/StudyScreen';
import ConfirmModal from './components/Common/ConfirmModal';

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');

  const [currentPage, setCurrentPage] = useState('packages');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [studyCards, setStudyCards] = useState([]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setCurrentPage('packages');
        setSelectedPackage(null);
        setStudyCards([]);
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

  const handlePackageUpdated = (patch) => {
    setSelectedPackage((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleOpenPackage = (packageItem) => {
    setSelectedPackage(packageItem);
    setCurrentPage('cards');
  };

  const handleStudyPackage = (packageItem, cards) => {
    setSelectedPackage(packageItem);
    setStudyCards(cards || []);
    setCurrentPage('study');
  };

  const handleBackToPackages = () => {
    setCurrentPage('packages');
    setSelectedPackage(null);
    setStudyCards([]);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut(auth);
      setShowLogoutModal(false);
    } catch (err) {
      console.error(err);
      alert('Lỗi đăng xuất');
    } finally {
      setIsLoggingOut(false);
    }
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

  return (
    <>
      <div className="app-container">
        {currentPage === 'packages' && (
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
                <button onClick={handleLogoutClick} className="logout-btn">
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
              onStudyPackage={handleStudyPackage}
            />
          )}

          {currentPage === 'cards' && selectedPackage && (
            <CardsList
              user={user}
              packageItem={selectedPackage}
              onBack={handleBackToPackages}
              onPackageUpdated={handlePackageUpdated}
            />
          )}

          {currentPage === 'study' && selectedPackage && (
            <StudyScreen
              packageItem={selectedPackage}
              cards={studyCards}
              onBack={handleBackToPackages}
            />
          )}
        </main>
      </div>

      <ConfirmModal
        open={showLogoutModal}
        title="Đăng xuất?"
        message="Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng."
        confirmText="Đăng xuất"
        cancelText="Ở lại"
        variant="logout"
        loading={isLoggingOut}
        onConfirm={handleConfirmLogout}
        onClose={() => setShowLogoutModal(false)}
      />
    </>
  );
}

export default App;