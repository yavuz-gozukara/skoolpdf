import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { LANGUAGES } from '../i18n';
import { useLang } from '../context/LanguageContext';

export default function LanguagePicker() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5
                   bg-slate-100 dark:bg-slate-800
                   border border-slate-200 dark:border-slate-700
                   hover:border-brand-400 dark:hover:border-brand-600
                   text-slate-600 dark:text-slate-300
                   hover:text-brand-600 dark:hover:text-brand-400
                   rounded-lg text-xs font-medium transition-all"
      >
        <Globe size={13} />
        <span>{current.label}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel — opens upward */}
      {open && (
        <div className="absolute bottom-full mb-2 right-0
                        bg-white dark:bg-slate-800
                        border border-slate-200 dark:border-slate-700
                        rounded-xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/80
                        p-3 z-50 min-w-[480px]">
          <div className="grid grid-cols-3 gap-0.5">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => { setLang(code); setOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all
                  ${lang === code
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                {lang === code
                  ? <Check size={12} className="shrink-0 text-brand-500" />
                  : <span className="w-3 shrink-0" />
                }
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
