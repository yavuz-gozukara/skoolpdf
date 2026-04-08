import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function parseRanges(str, maxPage) {
  const pages = new Set();
  str.split(',').forEach(part => {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return;
    const from = parseInt(m[1]);
    const to   = m[2] ? parseInt(m[2]) : from;
    for (let p = Math.max(1, from); p <= Math.min(maxPage, to); p++) pages.add(p);
  });
  return [...pages].sort((a, b) => a - b);
}

function pagesToRangeStr(pages) {
  if (!pages.length) return '';
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0], end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) { end = sorted[i]; }
    else { ranges.push(start === end ? `${start}` : `${start}–${end}`); start = end = sorted[i]; }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`);
  return ranges.join(', ');
}

/* ─── Component ────────────────────────────────────────────────────────────── */
export default function PageSelector({ file, selectedPages, onSelectionChange }) {
  const [pdfDoc, setPdfDoc]       = useState(null);
  const [pages, setPages]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [inputVal, setInputVal]   = useState('');
  const [inputError, setInputError] = useState(false);
  const isUserTyping = useRef(false);

  useEffect(() => {
    let active = true, docInstance = null;
    setLoading(true);
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        docInstance = pdf;
        if (active) {
          setPdfDoc(pdf);
          setPages(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
        }
      } catch (e) { console.error('Failed to load PDF', e); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; docInstance?.destroy(); };
  }, [file]);

  // Sync text input when selection changes from outside (thumbnail clicks, Select All)
  useEffect(() => {
    if (!isUserTyping.current) {
      setInputVal(pagesToRangeStr(selectedPages));
      setInputError(false);
    }
  }, [selectedPages]);

  const toggle = (p) =>
    onSelectionChange(selectedPages.includes(p)
      ? selectedPages.filter(x => x !== p)
      : [...selectedPages, p].sort((a, b) => a - b));

  const toggleAll = () =>
    onSelectionChange(selectedPages.length === pages.length ? [] : [...pages]);

  const handleInputChange = (e) => {
    isUserTyping.current = true;
    setInputVal(e.target.value);
    setInputError(false);
  };

  const applyInput = () => {
    isUserTyping.current = false;
    const val = inputVal.trim();
    if (!val) { onSelectionChange([]); setInputError(false); return; }
    const parsed = parseRanges(val, pages.length);
    if (parsed.length === 0 && val !== '') {
      setInputError(true);
    } else {
      setInputError(false);
      onSelectionChange(parsed);
      setInputVal(pagesToRangeStr(parsed)); // normalise display
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyInput(); }
    if (e.key === 'Escape') { isUserTyping.current = false; setInputVal(pagesToRangeStr(selectedPages)); setInputError(false); }
  };

  if (loading) return (
    <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
      <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full mb-4" />
      <p className="font-medium text-lg">Loading pages...</p>
      <p className="text-sm mt-1 opacity-60">Please wait</p>
    </div>
  );

  return (
    <div className="mb-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-tight">
          Select pages to include
          <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">({pages.length} total)</span>
        </label>
        <button
          onClick={toggleAll}
          className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300
                     px-4 py-2.5 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50
                     rounded-lg transition-colors shrink-0 min-h-[44px] touch-manipulation
                     focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {selectedPages.length === pages.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Manual range input */}
      <div className="mb-3">
        <div className="relative">
          <input
            type="text"
            value={inputVal}
            onChange={handleInputChange}
            onBlur={applyInput}
            onKeyDown={handleKeyDown}
            placeholder={`e.g. 1, 3–5, 8  (1–${pages.length})`}
            className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono
              bg-white dark:bg-slate-700/60
              border transition-all
              text-slate-800 dark:text-slate-100
              placeholder-slate-400 dark:placeholder-slate-500
              focus:ring-2 focus:outline-none
              ${inputError
                ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30 focus:border-red-500'
                : 'border-slate-200 dark:border-slate-600 focus:ring-brand-500/30 focus:border-brand-500 dark:focus:border-brand-400'
              }`}
          />
          {inputError && (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              Invalid page range. Use format: 1, 3–5, 8
            </p>
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 italic">
          Type page numbers or ranges, then press Enter — or click thumbnails below.
        </p>
      </div>

      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto p-3 sm:p-4
                      bg-slate-50 dark:bg-slate-800/50 shadow-inner rounded-xl
                      border border-slate-200 dark:border-slate-700 overscroll-contain">
        {pages.map(p => (
          <Thumbnail key={p} pdfDoc={pdfDoc} pageNum={p} isSelected={selectedPages.includes(p)} onToggle={() => toggle(p)} />
        ))}
      </div>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
        {selectedPages.length > 0
          ? `${selectedPages.length} of ${pages.length} pages selected`
          : 'No pages selected — all pages will be included'}
      </p>
    </div>
  );
}

function Thumbnail({ pdfDoc, pageNum, isSelected, onToggle }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let active = true, task = null;
    (async () => {
      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!active || !canvasRef.current) return;
        const vp = page.getViewport({ scale: 0.5 });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.height = vp.height;
        canvas.width  = vp.width;
        task = page.render({ canvasContext: ctx, viewport: vp });
        await task.promise;
      } catch (e) {
        if (e.name !== 'RenderingCancelledException') console.error('Render failed p.', pageNum, e);
      }
    })();
    return () => { active = false; task?.cancel(); };
  }, [pdfDoc, pageNum]);

  return (
    <div
      onClick={onToggle}
      onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && onToggle()}
      role="checkbox"
      tabIndex={0}
      aria-checked={isSelected}
      aria-label={`Page ${pageNum}`}
      className={`relative cursor-pointer transition-all duration-200 rounded-xl overflow-hidden
                  bg-white dark:bg-slate-700 touch-manipulation select-none
                  focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2
                  ${isSelected
                    ? 'border-4 border-brand-500 shadow-md ring-2 ring-brand-400/30 scale-[1.02]'
                    : 'border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-500 shadow-sm active:scale-[0.97]'}`}
    >
      {/* Page number badge */}
      <div className="absolute top-1.5 left-1.5 bg-slate-900/75 dark:bg-black/60 backdrop-blur-sm text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md z-10 shadow-sm">
        p.{pageNum}
      </div>
      {/* Check badge */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 bg-brand-500 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg z-10">
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full block aspect-[1/1.414]" />
    </div>
  );
}
