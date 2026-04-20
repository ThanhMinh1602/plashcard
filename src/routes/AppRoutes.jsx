import React, { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import { addPackage } from '../services/flashcardService';

import Login from '../components/Auth/Login';
import Register from '../components/Auth/Register';
import ForgotPassword from '../components/Auth/ForgotPassword';
import PackageList from '../components/Packages/PackageList';
import CardsList from '../components/CardsList/CardsList';
import StudyScreen from '../components/Study/StudyScreen';

import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes({ user }) {
  const navigate = useNavigate();

  const [selectedPackage, setSelectedPackage] = useState(null);
  const [studyCards, setStudyCards] = useState([]);

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
      navigate('/packages/edit');
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
    navigate('/packages/edit');
  };

  const handleStudyPackage = (packageItem, cards) => {
    setSelectedPackage(packageItem);
    setStudyCards(cards || []);
    navigate('/packages/study');
  };

  const handleBackToPackages = () => {
    setSelectedPackage(null);
    setStudyCards([]);
    navigate('/packages');
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/packages" replace />
          ) : (
            <Login
              onSwitch={() => navigate('/register')}
              onForgot={() => navigate('/forgot-password')}
            />
          )
        }
      />

      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/packages" replace />
          ) : (
            <Register onSwitch={() => navigate('/login')} />
          )
        }
      />

      <Route
        path="/forgot-password"
        element={
          user ? (
            <Navigate to="/packages" replace />
          ) : (
            <ForgotPassword onBack={() => navigate('/login')} />
          )
        }
      />

      <Route
        path="/packages"
        element={
          <ProtectedRoute user={user}>
            <PackageList
              user={user}
              onAddPackage={handleAddPackage}
              onOpenPackage={handleOpenPackage}
              onStudyPackage={handleStudyPackage}
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/packages/edit"
        element={
          <ProtectedRoute user={user}>
            {selectedPackage ? (
              <CardsList
                user={user}
                packageItem={selectedPackage}
                onBack={handleBackToPackages}
                onPackageUpdated={handlePackageUpdated}
              />
            ) : (
              <Navigate to="/packages" replace />
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/packages/study"
        element={
          <ProtectedRoute user={user}>
            {selectedPackage ? (
              <StudyScreen
                packageItem={selectedPackage}
                cards={studyCards}
                onBack={handleBackToPackages}
              />
            ) : (
              <Navigate to="/packages" replace />
            )}
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={<Navigate to={user ? '/packages' : '/login'} replace />}
      />

      <Route
        path="*"
        element={<Navigate to={user ? '/packages' : '/login'} replace />}
      />
    </Routes>
  );
}