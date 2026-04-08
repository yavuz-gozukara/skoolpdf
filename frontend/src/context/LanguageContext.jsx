import React, { createContext, useContext, useState } from 'react';
import { getTranslation, getStoredLang, setStoredLang } from '../i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getStoredLang);

  const setLang = (code) => {
    setStoredLang(code);
    setLangState(code);
  };

  const t = (key) => getTranslation(lang, key);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
