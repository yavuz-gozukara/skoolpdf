import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, X, ArrowLeft, Send } from 'lucide-react';
import { useTask } from '../context/TaskContext';
import CustomPdfPreview from './CustomPdfPreview';

const ALL_DOCS   = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';
const ALL_IMAGES = '.jpg,.jpeg,.png,.webp,.gif,.tiff';
const PDF_ONLY   = 'application/pdf';

export default function DropZone({ onContinue }) {
  const { currentTask, setCurrentTask, files, setFiles } = useTask();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) addFiles(Array.from(e.dataTransfer.files));
  };

  const isAcceptable = (file) => {
    if (currentTask === 'convert' || currentTask === 'protect') return true;
    return file.type === 'application/pdf';
  };

  const addFiles = (newFiles) => {
    const valid = newFiles.filter(isAcceptable);
    const single = ['split','compress','ocr','protect','unlock','watermark','to-images','to-word','to-pdf'];
    setFiles(single.includes(currentTask) ? valid.slice(0,1) : prev => [...prev, ...valid]);
  };

  const removeFile = (i) => setFiles(prev => prev.filter((_,j) => j !== i));

  const getTaskInfo = () => {
    switch (currentTask) {
      case 'merge':     return { title:'Merge PDFs',            desc:'Upload the PDFs you want to combine.',                                                 accept:PDF_ONLY };
      case 'split':     return { title:'Extract Pages',         desc:'Upload the PDF you want to split.',                                                    accept:PDF_ONLY };
      case 'compress':  return { title:'Compress PDF',          desc:'Upload a PDF to optimise its file size.',                                              accept:PDF_ONLY };
      case 'ocr':       return { title:'OCR — Make Searchable', desc:'Upload a scanned PDF to extract its text layer.',                                      accept:PDF_ONLY };
      case 'protect':   return { title:'Add Password',          desc:'Upload any file — PDF, Word, Excel, PowerPoint or image — to encrypt with AES-256.',   accept:`${ALL_DOCS},${ALL_IMAGES}` };
      case 'unlock':    return { title:'Unlock PDF',            desc:'Upload a password-protected PDF to remove its lock.',                                  accept:PDF_ONLY };
      case 'watermark': return { title:'Add Watermark',         desc:'Upload a PDF to stamp custom text on every page.',                                     accept:PDF_ONLY };
      case 'convert':   return { title:'Universal Converter',   desc:'Upload a PDF, Word, Excel, PowerPoint or image file.',                                 accept:`${ALL_DOCS},${ALL_IMAGES}` };
      case 'to-images': return { title:'PDF to Images',         desc:'Upload a PDF — each page will be exported as a PNG image.',                            accept:PDF_ONLY };
      default:          return { title:'Upload',                desc:'',                                                                                     accept:'*' };
    }
  };

  const info = getTaskInfo();
  const canMerge  = currentTask === 'merge'  && files.length >= 2;
  const canSingle = currentTask !== 'merge'  && files.length === 1;

  return (
    <motion.div
      initial={{ opacity:0, scale:0.97 }}
      animate={{ opacity:1, scale:1 }}
      className="w-full max-w-4xl mx-auto px-4 mt-8 z-10 relative"
    >
      {/* Back button */}
      <button
        onClick={() => { setCurrentTask('none'); setFiles([]); }}
        className="inline-flex items-center px-4 py-2 mb-6
                   bg-white dark:bg-slate-800
                   border border-slate-200 dark:border-slate-700
                   hover:border-slate-300 dark:hover:border-slate-600
                   hover:bg-slate-50 dark:hover:bg-slate-700/60
                   rounded-xl text-slate-600 dark:text-slate-300
                   hover:text-slate-800 dark:hover:text-slate-100
                   font-medium text-sm shadow-sm transition-all"
      >
        <ArrowLeft size={16} className="mr-2" /> Back to tools
      </button>

      <div className="bg-white dark:bg-slate-800/80 rounded-3xl
                      shadow-xl shadow-slate-200/40 dark:shadow-slate-900/60
                      border border-slate-100 dark:border-slate-700 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{info.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{info.desc}</p>
        </div>

        {/* Drop area */}
        <div
          className={`border-2 border-dashed rounded-2xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer
            ${isDragging
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
              : 'border-slate-200 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileUpload').click()}
        >
          <input type="file" id="fileUpload" className="hidden"
            multiple={currentTask === 'merge'} accept={info.accept}
            onChange={e => e.target.files?.length > 0 && addFiles(Array.from(e.target.files))} />
          <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mb-6 shadow-sm border border-brand-200 dark:border-brand-800">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Drag & drop your files here</h3>
          <p className="text-slate-400 dark:text-slate-500">or click to browse from your computer</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-8">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center justify-between">
              <span>Selected files ({files.length})</span>
              {canMerge && (
                <button onClick={onContinue}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md flex items-center transition-colors">
                  Continue to Merge <Send size={16} className="ml-2"/>
                </button>
              )}
              {canSingle && (
                <button onClick={onContinue}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md flex items-center transition-colors">
                  Continue <Send size={16} className="ml-2"/>
                </button>
              )}
            </h4>
            <div className="space-y-3">
              <AnimatePresence>
                {files.map((f,i) => (
                  <motion.div key={f.name+i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}}
                    className="flex flex-col p-4 bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <File size={22} className="text-brand-500 dark:text-brand-400 shrink-0"/>
                        <span className="truncate text-slate-700 dark:text-slate-200 font-medium">{f.name}</span>
                      </div>
                      <button onClick={e => { e.stopPropagation(); removeFile(i); }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <X size={18}/>
                      </button>
                    </div>
                    {(f.type === 'application/pdf' || f.type.startsWith('image/')) && (
                      <div className="w-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden shadow-inner mt-2">
                        {f.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(f)} alt="preview" className="w-full max-h-[400px] object-contain bg-slate-100 dark:bg-slate-700"/>
                        ) : (
                          <CustomPdfPreview file={f}/>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
