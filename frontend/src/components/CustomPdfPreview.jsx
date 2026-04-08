import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

export default function CustomPdfPreview({ file }) {
  const [pdfDoc, setPdfDoc]       = useState(null);
  const [numPages, setNumPages]   = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages]         = useState([]);
  const containerRef = useRef(null);
  const observer     = useRef(null);

  useEffect(() => {
    let active = true, docInstance = null;
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        docInstance = pdf;
        if (active) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setPages(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
        }
      } catch (e) { console.error('Preview load failed', e); }
    })();
    return () => { active = false; docInstance?.destroy(); };
  }, [file]);

  useEffect(() => {
    if (!containerRef.current) return;
    observer.current = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setCurrentPage(Number(e.target.getAttribute('data-page')));
      }),
      { root: containerRef.current, threshold: 0.5 }
    );
    return () => observer.current?.disconnect();
  }, [pages]);

  return (
    <div className="relative w-full h-[400px] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
      {/* Page indicator */}
      {numPages > 0 && (
        <div className="absolute top-3 left-3 bg-slate-900/80 dark:bg-black/70 backdrop-blur-md text-white text-sm font-bold px-3 py-1.5 rounded-lg z-20 shadow-md flex items-center">
          <span className="text-brand-400 mr-1">{currentPage}</span>
          <span className="text-slate-400">/</span>
          <span className="ml-1">{numPages}</span>
        </div>
      )}

      {/* Scrollable pages */}
      <div ref={containerRef} className="w-full h-full overflow-y-auto p-4 flex flex-col items-center gap-4">
        {!pdfDoc ? (
          <div className="flex w-full h-full items-center justify-center text-slate-500 dark:text-slate-400 font-medium">
            <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full mr-3" />
            Loading preview...
          </div>
        ) : (
          pages.map(p => <PreviewPage key={p} pdfDoc={pdfDoc} pageNum={p} observer={observer.current} />)
        )}
      </div>
    </div>
  );
}

function PreviewPage({ pdfDoc, pageNum, observer }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el && observer) { observer.observe(el); return () => observer.unobserve(el); }
  }, [observer]);

  useEffect(() => {
    let active = true, task = null;
    (async () => {
      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!active || !canvasRef.current) return;
        const vp = page.getViewport({ scale: 1.2 });
        const canvas = canvasRef.current;
        canvas.height = vp.height;
        canvas.width  = vp.width;
        task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
        await task.promise;
      } catch (e) {
        if (e.name !== 'RenderingCancelledException') console.error('Preview render failed p.', pageNum, e);
      }
    })();
    return () => { active = false; task?.cancel(); };
  }, [pdfDoc, pageNum]);

  return (
    <div
      ref={containerRef}
      data-page={pageNum}
      className="w-full max-w-2xl bg-white dark:bg-slate-700 shadow-md border border-slate-200 dark:border-slate-600 rounded min-h-[400px] flex items-center justify-center overflow-hidden shrink-0"
    >
      <canvas ref={canvasRef} className="max-w-full h-auto block" />
    </div>
  );
}
