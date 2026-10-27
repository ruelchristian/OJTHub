import React, { useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ExternalLink, 
  FileText, 
  Maximize2 
} from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  pdfUrl: string | null;
  fileName: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onDownload?: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  pdfUrl,
  fileName,
  title = 'Official DTR PDF Preview',
  subtitle,
  onClose,
  onDownload
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !pdfUrl) return null;

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (err) {
        console.warn('Iframe print failed, falling back to new window', err);
      }
    }
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  };

  const handleDownloadFile = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-5xl h-[92dvh] sm:h-[88vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom,0px)] sm:pb-0">
        
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2">
                <span>{title}</span>
              </h3>
              {subtitle && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Print PDF directly"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleOpenNewTab}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Open PDF in new browser tab / fullscreen"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Open Fullscreen</span>
            </button>

            <button
              onClick={handleDownloadFile}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Save PDF file to your device"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0 ml-1"
              title="Close PDF preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / PDF Viewer Frame */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            className="w-full flex-1 border-0 bg-slate-950"
            title="DTR Document PDF Preview"
          />

          {/* Mobile Fallback Hint Banner */}
          <div className="p-2 sm:p-2.5 bg-slate-900/90 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-1 px-4">
            <span className="truncate">
              📄 Official institutional 1-page A4 Daily Time Record with trainee and coordinator certification.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOpenNewTab}
                className="text-sky-400 hover:text-sky-300 font-medium underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Tap for fullscreen viewer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
