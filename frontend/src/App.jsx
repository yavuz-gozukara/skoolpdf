import React, { useState, useEffect } from 'react';
import { FileStack, Shield, Trash2, Lock, Zap, Moon, Sun } from 'lucide-react';
import Dashboard from './components/Dashboard';
import { TaskProvider, useTask } from './context/TaskContext';
import { LanguageProvider, useLang } from './context/LanguageContext';
import LanguagePicker from './components/LanguagePicker';

/* ─── Logo mark ─────────────────────────────────────────────────────────────── */
function Logo({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2.5 group focus:outline-none"
      aria-label="Go to homepage"
    >
      {/* Icon container — gradient square with FileStack */}
      <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-accent-500 rounded-xl
                      flex items-center justify-center shadow-md
                      group-hover:shadow-brand-500/30 group-hover:scale-105 transition-all duration-200">
        <FileStack size={18} className="text-white" strokeWidth={2.2} />
      </div>
      {/* Wordmark */}
      <span className="text-[1.45rem] font-black tracking-tight leading-none select-none">
        <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent
                         dark:from-brand-400 dark:to-accent-400">
          skool
        </span>
        <span className="text-slate-800 dark:text-slate-100">PDF</span>
      </span>
    </button>
  );
}

/* ─── Theme toggle ───────────────────────────────────────────────────────────── */
function ThemeToggle({ darkMode, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 flex items-center justify-center rounded-xl
                 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700
                 text-slate-600 dark:text-slate-300 transition-all duration-200"
    >
      {darkMode
        ? <Sun  size={17} strokeWidth={2} />
        : <Moon size={17} strokeWidth={2} />}
    </button>
  );
}

/* ─── Header ─────────────────────────────────────────────────────────────────── */
function Header({ darkMode, onToggle }) {
  const { setCurrentTask, setFiles } = useTask();

  const goHome = () => {
    setCurrentTask('none');
    setFiles([]);
  };

  return (
    <header className="px-6 py-4 z-20 sticky top-0
                       bg-white/80 dark:bg-slate-900/80
                       backdrop-blur-xl
                       border-b border-slate-100 dark:border-slate-800
                       shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Logo onClick={goHome} />
        <ThemeToggle darkMode={darkMode} onToggle={onToggle} />
      </div>
    </header>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────────── */
function Footer() {
  const { t } = useLang();

  const badges = [
    { icon: Trash2, title: 'Auto-Deleted',        desc: 'Files are permanently removed from the server immediately after download.' },
    { icon: Lock,   title: 'AES-256 Encryption',  desc: 'Password-protected PDFs use military-grade AES-256 encryption via qpdf.' },
    { icon: Shield, title: 'No Data Collection',  desc: 'We never read, store, or share your document contents. Zero telemetry.' },
    { icon: Zap,    title: 'Local Processing',    desc: 'All processing happens on your own server — files never leave your machine.' },
  ];

  return (
    <footer className="mt-auto border-t border-slate-100 dark:border-slate-800
                       bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {badges.map(({ icon: Icon, title, desc }) => (
            <div key={title}
              className="flex items-start space-x-3 p-4 rounded-xl
                         bg-slate-50 dark:bg-slate-800/60
                         border border-slate-100 dark:border-slate-700"
            >
              <Icon size={16} className="text-brand-500 dark:text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{title}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6
                        border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-brand-500 to-accent-500 rounded-lg
                            flex items-center justify-center shadow-sm">
              <FileStack size={12} className="text-white" strokeWidth={2.2} />
            </div>
            <span className="text-sm font-black tracking-tight">
              <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent
                               dark:from-brand-400 dark:to-accent-400">skool</span>
              <span className="text-slate-700 dark:text-slate-300">PDF</span>
            </span>
          </div>
<div className="flex items-center gap-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('copyright')}</p>
            <LanguagePicker />
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── App shell ──────────────────────────────────────────────────────────────── */
function AppContent() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('skoolpdf-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('skoolpdf-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[--color-background-light] dark:bg-slate-900">
      <Header darkMode={darkMode} onToggle={() => setDarkMode(d => !d)} />
      <Dashboard />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <TaskProvider>
        <AppContent />
      </TaskProvider>
    </LanguageProvider>
  );
}
