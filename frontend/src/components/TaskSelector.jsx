import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Scissors, Minimize2, FileType, FileText, Unlock, Lock, Stamp, ImageDown, FileCheck } from 'lucide-react';
import { useTask } from '../context/TaskContext';

/* ─── Per-category hover gradient ───────────────────────────────────────────── */
const CARD_HOVER = {
  'Modify & Arrange':    'hover:from-violet-50 hover:to-purple-50   dark:hover:from-violet-900/25 dark:hover:to-purple-900/25 hover:border-violet-200 dark:hover:border-violet-800',
  'Process & Optimize':  'hover:from-cyan-50   hover:to-sky-50      dark:hover:from-cyan-900/25   dark:hover:to-sky-900/25   hover:border-cyan-200   dark:hover:border-cyan-800',
  'Convert':             'hover:from-fuchsia-50 hover:to-violet-50  dark:hover:from-fuchsia-900/25 dark:hover:to-violet-900/25 hover:border-fuchsia-200 dark:hover:border-fuchsia-800',
  'Security & Branding': 'hover:from-teal-50   hover:to-emerald-50  dark:hover:from-teal-900/25   dark:hover:to-emerald-900/25 hover:border-teal-200   dark:hover:border-teal-800',
};

const OFFICE_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const COMPAT_CHECK = {
  merge:      f => f?.type === 'application/pdf',
  split:      f => f?.type === 'application/pdf',
  compress:   f => f?.type === 'application/pdf',
  ocr:        f => f?.type === 'application/pdf',
  unlock:     f => f?.type === 'application/pdf',
  watermark:  f => f?.type === 'application/pdf',
  'to-images':f => f?.type === 'application/pdf',
  protect:    f => f?.type === 'application/pdf' || OFFICE_MIMES.has(f?.type),
  convert:    f => f?.type === 'application/pdf' || OFFICE_MIMES.has(f?.type) || f?.type?.startsWith('image/'),
};

const categories = [
  {
    title: 'Modify & Arrange',
    desc: 'Change structure & order pages',
    tools: [
      { id: 'merge',     title: 'Merge PDFs',              desc: 'Combine multiple PDFs into one',             icon: Layers,     color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30' },
      { id: 'split',     title: 'Extract Pages',           desc: 'Split into sections by page selection',      icon: Scissors,   color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30' },
    ],
  },
  {
    title: 'Process & Optimize',
    desc: 'Enhance documents for sharing',
    tools: [
      { id: 'compress',  title: 'Compress PDF',            desc: 'Reduce file size via Ghostscript',           icon: Minimize2,  color: 'text-cyan-600 dark:text-cyan-400',    bg: 'bg-cyan-100 dark:bg-cyan-900/30'    },
      { id: 'ocr',       title: 'OCR — Make Searchable',   desc: 'Convert scanned images to text',             icon: FileType,   color: 'text-cyan-600 dark:text-cyan-400',    bg: 'bg-cyan-100 dark:bg-cyan-900/30'    },
    ],
  },
  {
    title: 'Convert',
    desc: 'Transform between formats',
    tools: [
      { id: 'convert',   title: 'Universal Converter',     desc: 'PDF ↔ Word · Office · Images',               icon: FileText,   color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },
      { id: 'to-images', title: 'PDF to Images',           desc: 'Export each page as a high-res PNG',         icon: ImageDown,  color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },
    ],
  },
  {
    title: 'Security & Branding',
    desc: 'Manage access & identity',
    tools: [
      { id: 'protect',   title: 'Add Password',            desc: 'Encrypt any file with AES-256',              icon: Lock,       color: 'text-teal-600 dark:text-teal-400',    bg: 'bg-teal-100 dark:bg-teal-900/30'    },
      { id: 'unlock',    title: 'Unlock PDF',              desc: 'Remove password protection',                 icon: Unlock,     color: 'text-teal-600 dark:text-teal-400',    bg: 'bg-teal-100 dark:bg-teal-900/30'    },
      { id: 'watermark', title: 'Add Watermark',           desc: 'Stamp custom text on every page',            icon: Stamp,      color: 'text-teal-600 dark:text-teal-400',    bg: 'bg-teal-100 dark:bg-teal-900/30'    },
    ],
  },
];

export default function TaskSelector({ heroFile }) {
  const { setCurrentTask } = useTask();

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-8 mb-16 z-10 relative">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat, idx) => {
          const hoverCls = CARD_HOVER[cat.title] || '';
          return (
            <div key={cat.title} className="flex flex-col">
              {/* Category header */}
              <div className="mb-3 px-1">
                <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{cat.title}</h2>
              </div>

              {/* Tool cards */}
              <div className="flex flex-col gap-2.5 flex-1">
                {cat.tools.map((task, i) => {
                  const Icon = task.icon;
                  const compatible = heroFile ? (COMPAT_CHECK[task.id]?.(heroFile) ?? true) : null;
                  const dimmed = compatible === false;

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: dimmed ? 0.4 : 1, y: 0 }}
                      transition={{ delay: idx * 0.07 + i * 0.035 }}
                      whileHover={dimmed ? {} : { scale: 1.02 }}
                      whileTap={dimmed ? {} : { scale: 0.97 }}
                      onClick={() => !dimmed && setCurrentTask(task.id)}
                      title={dimmed ? 'This tool requires a PDF file' : undefined}
                      className={`group bg-gradient-to-br bg-white dark:bg-slate-800/80
                                  rounded-2xl p-4 border border-slate-100 dark:border-slate-700
                                  shadow-sm transition-all duration-200
                                  flex items-start space-x-3 touch-manipulation
                                  ${dimmed ? 'cursor-not-allowed' : 'cursor-pointer'}
                                  ${!dimmed ? hoverCls : ''}
                                  `}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 shrink-0 ${task.bg} rounded-xl flex items-center justify-center mt-0.5`}>
                        <Icon size={19} className={task.color} />
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{task.title}</h3>
                          {compatible === true && (
                            <FileCheck size={13} className="text-brand-500 dark:text-brand-400 shrink-0" title="Compatible with your file" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{task.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
