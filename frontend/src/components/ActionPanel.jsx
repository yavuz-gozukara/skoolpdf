import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle, FileUp, AlertTriangle, Terminal } from 'lucide-react';
import axios from 'axios';
import { useTask } from '../context/TaskContext';
import PageSelector from './PageSelector';

// Dev → local backend  |  Production → same-origin (Express serves the build)
const API_BASE = import.meta.env.DEV ? 'http://localhost:5005/api/pdf' : '/api/pdf';

const TOOL_HINTS = {
  gs:       { label: 'Ghostscript', cmd: 'brew install ghostscript' },
  qpdf:     { label: 'qpdf',        cmd: 'brew install qpdf' },
  ocrmypdf: { label: 'ocrmypdf',    cmd: 'brew install ocrmypdf' },
  soffice:  { label: 'LibreOffice', cmd: 'https://www.libreoffice.org/download/' },
};

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
function OcrProgressBar({ progress }) {
  const label =
    progress < 20  ? 'Uploading file...' :
    progress < 70  ? 'Analysing document with OCR — this may take a few minutes.' :
    progress < 100 ? 'Applying compression...' :
                     'Done! Preparing download...';
  return (
    <div className="mb-6">
      <div className="flex justify-between text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
        <span>OCR Progress</span>
        <span className="text-brand-600 dark:text-brand-400 font-bold">{progress}%</span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-600">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 italic">{label}</p>
    </div>
  );
}

function ToolMissingError({ tool, hint }) {
  const info = TOOL_HINTS[tool] || { label: tool, cmd: `Install ${tool}` };
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">
            System tool not found:{' '}
            <code className="bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded font-mono">{info.label}</code>
          </p>
          <p className="text-amber-700 dark:text-amber-400 text-xs mt-1 mb-2">
            Run the command below in your terminal to install it.
          </p>
          <div className="flex items-center space-x-2 bg-slate-800 dark:bg-slate-900 text-green-400 rounded-lg px-3 py-2 text-xs font-mono">
            <Terminal size={12} className="shrink-0 opacity-70" />
            <span>{hint || info.cmd}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-4 py-2 mb-6
                 bg-white dark:bg-slate-800
                 border border-slate-200 dark:border-slate-700
                 hover:border-slate-300 dark:hover:border-slate-600
                 hover:bg-slate-50 dark:hover:bg-slate-700/60
                 rounded-xl text-slate-600 dark:text-slate-300
                 hover:text-slate-800 dark:hover:text-slate-100
                 font-medium text-sm shadow-sm transition-all"
    >
      <ArrowLeft size={16} className="mr-2" /> Back to files
    </button>
  );
}

/* ─── Shared input / select styles ──────────────────────────────────────────── */
const inputCls = `w-full px-4 py-3 rounded-xl
  bg-white dark:bg-slate-700/60
  border border-slate-200 dark:border-slate-600
  text-slate-800 dark:text-slate-100
  placeholder-slate-400 dark:placeholder-slate-500
  focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:border-brand-400
  transition-all outline-none`;

const selectCls = `${inputCls} cursor-pointer font-medium`;

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function ActionPanel({ onBack }) {
  const { currentTask, files } = useTask();
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess]           = useState(false);
  const [errorType, setErrorType]       = useState(null);

  const [splitPages, setSplitPages]       = useState([]);
  const [mergePages, setMergePages]       = useState({});
  const [compressLevel, setCompressLevel] = useState('ebook');
  const [password, setPassword]           = useState('');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [imageDpi, setImageDpi]           = useState('150');
  const [ocrProgress, setOcrProgress]     = useState(0);
  const pollRef = useRef(null);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const baseName = (f) => (f?.name || 'skoolPDF').replace(/\.[^.]+$/, '');

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const handleOcrJob = async (fd) => {
    const { data: { jobId } } = await axios.post(`${API_BASE}/ocr`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setOcrProgress(5);

    await new Promise((resolve, reject) => {
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await axios.get(`${API_BASE}/ocr/status/${jobId}`);
          setOcrProgress(data.progress || 0);
          if (data.status === 'error') { stopPolling(); data.error === 'TOOL_MISSING' ? reject({ isTool: true, tool: data.tool }) : reject(new Error(data.error)); }
          else if (data.status === 'done') { stopPolling(); setOcrProgress(100); resolve(jobId); }
        } catch (e) { stopPolling(); reject(e); }
      }, 2000);
    });

    const { data } = await axios.get(`${API_BASE}/ocr/download/${jobId}`, { responseType: 'blob' });
    triggerDownload(new Blob([data]), `${baseName(files[0])}-ocr.pdf`);
  };

  const handleProcess = async () => {
    setIsProcessing(true); setErrorType(null); setOcrProgress(0);
    try {
      const fd = new FormData();

      if (currentTask === 'ocr') {
        fd.append('file', files[0]); fd.append('language', 'eng');
        await handleOcrJob(fd); setSuccess(true); return;
      }

      let endpoint = '', outputExt = '.pdf';

      if (currentTask === 'merge') {
        files.forEach(f => fd.append('files', f));
        fd.append('ranges', files.map((_,i) => (mergePages[i]||[]).length > 0 ? mergePages[i].join(',') : 'all').join('|'));
        endpoint = '/merge';
      } else {
        fd.append('file', files[0]);
        switch (currentTask) {
          case 'split':     fd.append('ranges', splitPages.length > 0 ? splitPages.join(',') : '1'); endpoint = '/split'; break;
          case 'compress':  fd.append('level', compressLevel); endpoint = '/compress'; break;
          case 'protect':   fd.append('password', password); endpoint = '/protect'; break;
          case 'unlock':    fd.append('password', password); endpoint = '/unlock'; break;
          case 'watermark': fd.append('text', watermarkText || 'CONFIDENTIAL'); endpoint = '/watermark'; break;
          case 'to-images': fd.append('dpi', imageDpi); endpoint = '/convert/to-images'; outputExt = '.zip'; break;
          case 'convert':
            endpoint = files[0].name.toLowerCase().endsWith('.pdf') ? '/convert/to-word' : '/convert/to-pdf';
            outputExt = endpoint === '/convert/to-word' ? '.docx' : '.pdf';
            break;
          default: throw new Error('Unknown task');
        }
      }

      const res = await axios.post(`${API_BASE}${endpoint}`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob' });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      triggerDownload(new Blob([res.data]), match ? match[1] : `${baseName(files[0])}${outputExt}`);
      setSuccess(true);

    } catch (err) {
      stopPolling();
      if (err?.isTool) { setErrorType({ type: 'tool', tool: err.tool }); return; }
      if (err.response) {
        const raw = err.response.data;
        const json = raw instanceof Blob ? await raw.text().then(t => { try { return JSON.parse(t); } catch { return null; } }) : raw;
        if (json?.error === 'TOOL_MISSING')    { setErrorType({ type: 'tool',    tool: json.tool, hint: json.hint }); return; }
        if (json?.error === 'WRONG_PASSWORD')  { setErrorType({ type: 'message', message: 'Incorrect password. Please try again.' }); return; }
        if (err.response.status === 503)       { setErrorType({ type: 'message', message: 'A required system tool is missing. Check backend logs.' }); return; }
      }
      setErrorType({ type: 'message', message: 'An error occurred. Is the backend server running?' });
    } finally { setIsProcessing(false); }
  };

  const TITLES = { merge:'Merge Settings', split:'Extract Pages', compress:'Compression Settings', protect:'Encryption Settings', unlock:'Unlock PDF', convert:'Convert Settings', ocr:'OCR Settings', watermark:'Watermark Settings', 'to-images':'PDF to Images' };
  const isOcrRunning = currentTask === 'ocr' && isProcessing;

  /* ─── Shared label style ── */
  const labelCls = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2';
  const hintCls  = 'mt-2 text-xs text-slate-400 dark:text-slate-500 italic';

  return (
    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} className="w-full max-w-2xl mx-auto px-4 mt-8 z-10 relative">
      <BackButton onClick={onBack} />

      <div className="bg-white dark:bg-slate-800/80 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/60 border border-slate-100 dark:border-slate-700 p-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">{TITLES[currentTask] || 'Settings'}</h2>

        {/* Split */}
        {currentTask === 'split' && <PageSelector file={files[0]} selectedPages={splitPages} onSelectionChange={setSplitPages} />}

        {/* Compress */}
        {currentTask === 'compress' && (
          <div className="mb-8">
            <label className={labelCls}>Compression Level</label>
            <select value={compressLevel} onChange={e => setCompressLevel(e.target.value)} className={selectCls}>
              <option value="screen">🚀 Maximum (72 dpi — smallest file, screen only)</option>
              <option value="ebook">📖 Balanced (150 dpi — e-readers & digital sharing)</option>
              <option value="printer">🖨️ High Quality (300 dpi — print-ready / archival)</option>
            </select>
            <p className={hintCls}>Image quality is adjusted to your chosen level while reducing file size.</p>
          </div>
        )}

        {/* Protect / Unlock */}
        {(currentTask === 'protect' || currentTask === 'unlock') && (
          <div className="mb-8">
            <label className={labelCls}>{currentTask === 'protect' ? 'Set a password' : 'Enter password to unlock'}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
            {currentTask === 'protect' && <p className={hintCls}>Non-PDF files are automatically converted to PDF before encryption.</p>}
          </div>
        )}

        {/* Watermark */}
        {currentTask === 'watermark' && (
          <div className="mb-8">
            <label className={labelCls}>Watermark Text</label>
            <input type="text" value={watermarkText} onChange={e => setWatermarkText(e.target.value)} maxLength={50} className={inputCls} placeholder="e.g. CONFIDENTIAL, DRAFT, DO NOT COPY" />
            <p className={hintCls}>Stamped diagonally at 50% opacity across every page.</p>
          </div>
        )}

        {/* Convert */}
        {currentTask === 'convert' && (
          <div className="mb-8 flex gap-4">
            <div className="flex-1">
              <label className={labelCls}>From</label>
              <select disabled className={`${selectCls} opacity-60 cursor-not-allowed`}>
                <option>{files[0]?.name.split('.').pop().toUpperCase() || 'Auto-detected'}</option>
              </select>
            </div>
            <div className="flex-1">
              <label className={labelCls}>To</label>
              <select className={selectCls}>
                {files[0]?.name.toLowerCase().endsWith('.pdf')
                  ? <option value="docx">Word Document (.docx)</option>
                  : <option value="pdf">PDF Document (.pdf)</option>}
              </select>
            </div>
          </div>
        )}

        {/* PDF to Images */}
        {currentTask === 'to-images' && (
          <div className="mb-8">
            <label className={labelCls}>Image Resolution (DPI)</label>
            <select value={imageDpi} onChange={e => setImageDpi(e.target.value)} className={selectCls}>
              <option value="72">72 dpi — Screen / preview</option>
              <option value="150">150 dpi — Balanced (default)</option>
              <option value="300">300 dpi — Print quality</option>
            </select>
            <p className={hintCls}>Multi-page PDFs are packaged as a .zip archive. Single pages return as .png.</p>
          </div>
        )}

        {/* OCR */}
        {currentTask === 'ocr' && !isOcrRunning && (
          <div className="mb-8 p-5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border border-brand-100 dark:border-brand-800 rounded-xl font-medium flex items-start">
            <span className="mr-3 mt-0.5">💡</span>
            <span>Smart OCR engine ready. Your scanned PDF will be deeply analysed — making it fully searchable and copy-able without losing image quality.</span>
          </div>
        )}
        {isOcrRunning && <OcrProgressBar progress={ocrProgress} />}

        {/* Merge */}
        {currentTask === 'merge' && (
          <div className="mb-8">
            <div className="bg-brand-50 dark:bg-brand-900/20 p-4 rounded-xl border border-brand-100 dark:border-brand-800 flex items-start mb-6 text-brand-700 dark:text-brand-300">
              <span className="mr-3 opacity-80 mt-0.5">💡</span>
              <span className="font-medium">Files will be merged in order. Optionally select specific pages from each file to include only those in the output.</span>
            </div>
            <div className="flex flex-col gap-6">
              {files.map((f, i) => (
                <div key={i} className="p-5 bg-white dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 shadow-sm rounded-2xl">
                  <div className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center text-base">
                    <span className="w-7 h-7 bg-brand-500 text-white rounded-lg flex items-center justify-center mr-3 text-xs font-extrabold shadow-sm">{i+1}</span>
                    {f.name}
                  </div>
                  <PageSelector file={f} selectedPages={mergePages[i]||[]} onSelectionChange={pages => setMergePages({...mergePages,[i]:pages})} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors */}
        {errorType?.type === 'tool' && <ToolMissingError tool={errorType.tool} hint={errorType.hint} />}
        {errorType?.type === 'message' && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 text-sm font-medium border border-red-100 dark:border-red-800">
            {errorType.message}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleProcess}
          disabled={isProcessing || success}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed
                     text-white text-lg font-bold py-4 rounded-2xl flex items-center justify-center
                     transition-all shadow-xl shadow-brand-500/25"
        >
          {isProcessing ? (
            <><Loader2 size={22} className="animate-spin mr-2"/>{currentTask === 'ocr' ? 'Running OCR...' : 'Processing...'}</>
          ) : success ? (
            <><CheckCircle size={22} className="mr-2"/>Done! File Downloaded</>
          ) : (
            <><FileUp size={22} className="mr-2"/>Process & Download</>
          )}
        </button>

        {success && (
          <div className="mt-6 text-center">
            <button onClick={() => { setSuccess(false); onBack(); }} className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
              Process another file
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
