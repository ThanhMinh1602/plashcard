import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  LANGUAGE_STORAGE_KEY,
  LANGUAGES,
  translations,
} from './translations';

const LanguageContext = createContext(null);

function getNestedValue(source, key) {
  return key.split('.').reduce((current, part) => current?.[part], source);
}

function interpolate(value, params = {}) {
  return Object.entries(params).reduce(
    (text, [key, replacement]) =>
      text.replaceAll(`{{${key}}}`, String(replacement ?? '')),
    value,
  );
}

function getInitialLanguage() {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (translations[saved]) return saved;

  const browserLanguage = navigator.language?.slice(0, 2);
  if (translations[browserLanguage]) return browserLanguage;

  return 'vi';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = (nextLanguage) => {
    if (!translations[nextLanguage]) return;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  };

  const value = useMemo(() => {
    const t = (key, params) => {
      const translated =
        getNestedValue(translations[language], key) ??
        getNestedValue(translations.en, key) ??
        getNestedValue(translations.vi, key) ??
        key;

      return typeof translated === 'string'
        ? interpolate(translated, params)
        : key;
    };

    return {
      language,
      languages: LANGUAGES,
      setLanguage,
      t,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
}
