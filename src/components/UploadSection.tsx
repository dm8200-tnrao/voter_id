import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Sparkles, ArrowRight, Layers, FileDown } from 'lucide-react';
import { PDFFileInfo } from '../types/voter';
import { generateSampleGujaratiPdf } from '../utils/sampleRollGenerator';

interface UploadSectionProps {
  fileInfo: PDFFileInfo | null;
  onFileSelect: (file: File, arrayBuffer: ArrayBuffer) => void;
  onStartExtraction: (pageRange: 'all' | 'custom', customRange: string) => void;
  onLoadRajkotRoll: () => void;
  onLoadPart2Roll: () => void;
  onLoadPart3Roll?: () => void;
  isProcessing: boolean;
  isLoadingOfficial: boolean;
  onCancelProcessing: () => void;
  error: string | null;
  wipeoutMessage?: string | null;
  onDismissWipeoutMessage?: () => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  fileInfo,
  onFileSelect,
  onStartExtraction,
  onLoadRajkotRoll,
  onLoadPart2Roll,
  onLoadPart3Roll,
  isProcessing,
  isLoadingOfficial,
  onCancelProcessing,
  error,
  wipeoutMessage,
  onDismissWipeoutMessage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [customRangeText, setCustomRangeText] = useState('1-31');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const [localErr, setLocalErr] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setLocalErr(null);
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setLocalErr('કૃપા કરીને માત્ર PDF ફાઇલ અપલોડ કરો (Please upload a valid PDF file)');
      return;
    }
    const arrayBuffer = await file.arrayBuffer();
    onFileSelect(file, arrayBuffer);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const handleLoadSamplePdf = async () => {
    try {
      setLocalErr(null);
      setIsGeneratingSample(true);
      const { file, arrayBuffer } = await generateSampleGujaratiPdf();
      onFileSelect(file, arrayBuffer);
    } catch (err: any) {
      console.error('Error generating sample:', err);
      setLocalErr('Failed to generate sample PDF: ' + err.message);
    } finally {
      setIsGeneratingSample(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              પગલું ૧: ગુજરાતી મતદાર યાદી પીડીએફ અપલોડ કરો
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              ચૂંટણી પંચ દ્વારા પ્રકાશિત થયેલ કોઈપણ સ્કેન કરેલ અથવા ડિજિટલ ગુજરાતી મતદાર યાદી PDF અપલોડ કરો.
              દરેક મતદારનો ક્રમ, ઓળખપત્ર, નામ, સગપણ, ઘર નંબર, ઉંમર, જાતિ, વિભાગ, વોર્ડ અને ભાગ એક્સટ્રેક્ટ થશે.
            </p>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-5 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-orange-500 bg-orange-50/50 scale-[1.01]'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="w-14 h-14 mx-auto rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-3">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-semibold text-slate-800">
            પીડીએફ ફાઇલ અહીં ખેંચીને મૂકો (Drag & Drop PDF here)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            અથવા તમારા કમ્પ્યુટરથી પીડીએફ પસંદ કરવા માટે બ્રાઉઝ કરો
          </p>

          <button
            type="button"
            className="mt-4 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-50 pointer-events-none"
          >
            ફાઇલ પસંદ કરો (Browse Files)
          </button>

          <div className="mt-3 flex items-center justify-center space-x-4 text-xs text-slate-500">
            <span>સપોર્ટ: મલ્ટી-પેજ ગુજરાતી મતદાર યાદી</span>
            <span>•</span>
            <span>સ્કેન કરેલ / ટેક્સ્ટ પીડીએફ બંને સમર્થિત</span>
          </div>
        </div>

        {/* Mobile sample load button */}
        <div className="sm:hidden mt-3 text-center">
          <button
            onClick={handleLoadSamplePdf}
            disabled={isGeneratingSample || isProcessing}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-orange-600" />
            નમૂનાની મતદાર યાદી લોડ કરો (Sample PDF)
          </button>
        </div>
      </div>

      {/* Wipeout Success Banner */}
      {wipeoutMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start justify-between text-emerald-900 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-emerald-950 flex items-center space-x-1.5">
                <span>ડેટા સફળતાપૂર્વક સાચવાયો અને ક્લિયર થયો!</span>
                <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-200/60 text-emerald-800">
                  નવી પીડીએફ માટે તૈયાર
                </span>
              </h4>
              <p className="mt-1 text-xs text-emerald-800 leading-relaxed">{wipeoutMessage}</p>
            </div>
          </div>
          {onDismissWipeoutMessage && (
            <button
              onClick={onDismissWipeoutMessage}
              className="text-emerald-500 hover:text-emerald-700 p-1 rounded-md transition-colors cursor-pointer"
              title="સંદેશ બંધ કરો"
            >
              <span className="text-sm font-bold">✕</span>
            </button>
          )}
        </div>
      )}

      {/* Error Banner */}
      {(error || localErr) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-semibold">ભૂલ આવી છે (Error Occurred)</h4>
            <p className="mt-0.5 text-xs text-red-700">{error || localErr}</p>
          </div>
        </div>
      )}

      {/* Detected PDF Information Card */}
      {fileInfo && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">
                  {fileInfo.name}
                </h3>
                <p className="text-xs text-slate-500">
                  કદ: {formatFileSize(fileInfo.size)} | શોધાયેલ પેજ સંખ્યા:{' '}
                  <span className="font-semibold text-slate-800">{fileInfo.pageCount} પેજ</span>
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> તૈયાર છે (Ready)
            </span>
          </div>

          {/* Page Range Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                એક્સટ્રેક્શન શ્રેણી પસંદ કરો (Select Page Range)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPageRangeMode('all')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                    pageRangeMode === 'all'
                      ? 'border-orange-500 bg-orange-50 text-orange-800 font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  તમામ પેજ (All {fileInfo.pageCount} Pages)
                </button>
                <button
                  type="button"
                  onClick={() => setPageRangeMode('custom')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                    pageRangeMode === 'custom'
                      ? 'border-orange-500 bg-orange-50 text-orange-800 font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  કસ્ટમ પેજ (Custom Range)
                </button>
              </div>
            </div>

            {pageRangeMode === 'custom' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  પેજ નંબર દાખલ કરો (દા.ત. 1-3, 5, 8-10)
                </label>
                <input
                  type="text"
                  value={customRangeText}
                  onChange={(e) => setCustomRangeText(e.target.value)}
                  placeholder="દા.ત. 1-3 અથવા 2, 4"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-3">
            <div className="flex items-center text-xs text-slate-500">
              <Layers className="w-4 h-4 mr-1 text-slate-400" />
              <span>પ્રક્રિયા: પેજ વાઇઝ બેચ સ્કેનિંગ + ગુજરાતી ઓસીઆર</span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {isProcessing ? (
                <button
                  type="button"
                  onClick={onCancelProcessing}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                >
                  રદ કરો (Cancel Processing)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartExtraction(pageRangeMode, customRangeText)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>એક્સટ્રેક્શન શરૂ કરો (Start Extraction)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
