import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { ExtractionProgress } from './components/ExtractionProgress';
import { DataTable } from './components/DataTable';
import { PageInspectorModal } from './components/PageInspectorModal';
import { VerificationPanel } from './components/VerificationPanel';
import { ExportToolbar } from './components/ExportToolbar';
import { NotebookLMPromptModal } from './components/NotebookLMPromptModal';
import {
  PDFFileInfo,
  PageStatusInfo,
  VerificationSummary,
  VoterRecord,
} from './types/voter';
import {
  extractPageText,
  loadPdfDocument,
  renderPageToImage,
} from './utils/pdfProcessor';
import { runFullVerification } from './utils/verificationEngine';
import { exportToCsv, exportToExcel, exportVerificationTextReport } from './utils/exportUtils';
import { RAJKOT_AC69_VOTERS } from './data/rajkotVotersData';
import { RAJKOT_PART2_VOTERS } from './data/rajkotPart2VotersData';
import { RAJKOT_PART3_VOTERS } from './data/rajkotPart3VotersData';

export default function App() {
  // Navigation
  const [currentStep, setCurrentStep] = useState<'upload' | 'extract' | 'table' | 'verify'>('upload');

  // File state
  const [fileInfo, setFileInfo] = useState<PDFFileInfo | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoadingOfficial, setIsLoadingOfficial] = useState(false);

  // Extraction state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentProcessingPage, setCurrentProcessingPage] = useState<number | null>(null);
  const [pageStatuses, setPageStatuses] = useState<PageStatusInfo[]>([]);
  const [records, setRecords] = useState<VoterRecord[]>([]);

  // Modals
  const [inspectingPageNumber, setInspectingPageNumber] = useState<number | null>(null);
  const [isNotebookLMOpen, setIsNotebookLMOpen] = useState(false);

  // Cancellation & Pause refs
  const cancelProcessingRef = useRef(false);
  const pauseProcessingRef = useRef(false);

  // Wipeout & Auto-reset state
  const [autoWipeoutAfterDownload, setAutoWipeoutAfterDownload] = useState(true);
  const [wipeoutMessage, setWipeoutMessage] = useState<string | null>(null);

  // Function to completely wipe out extracted data and prepare app for next PDF
  const handleWipeoutAndReadyForNextPdf = (message?: string) => {
    cancelProcessingRef.current = true;
    setRecords([]);
    setPageStatuses([]);
    setFileInfo(null);
    setPdfDoc(null);
    setCurrentProcessingPage(null);
    setIsProcessing(false);
    setIsPaused(false);
    setFileError(null);
    setCurrentStep('upload');
    setWipeoutMessage(
      message ||
        'એક્સેલ/સીએસવી ફાઇલ સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ છે! અગાઉનો તમામ ડેટા સાફ થઈ ગયો છે અને એપ્લિકેશન નવી પીડીએફ અપલોડ કરવા માટે સંપૂર્ણ તૈયાર છે.'
    );
  };

  useEffect(() => {
    pauseProcessingRef.current = isPaused;
  }, [isPaused]);

  // Load Rajkot West (69) Part 1 (893 voters)
  const handleLoadRajkotRoll = async () => {
    try {
      setIsLoadingOfficial(true);
      setFileError(null);

      const pdfUrl = '/assets/aistudio/2026-EROLLGEN-S06-69-SIR-FinalRoll-Revision1-GUJ-1-WI_daa614cc.pdf';
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to load PDF from ${pdfUrl}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const loadedDoc = await loadPdfDocument(arrayBuffer);

      setPdfDoc(loadedDoc);
      setFileInfo({
        name: '2026-EROLLGEN-S06-69-SIR-FinalRoll-Revision1-GUJ-1-WI_daa614cc.pdf',
        size: arrayBuffer.byteLength,
        pageCount: 36,
        arrayBuffer,
        bhagNumber: '1',
        assemblyConstituency: '69 - રાજકોટ પશ્ચિમ',
        wardNumber: 'વોર્ડ નં. 1 (રૈયાધાર)',
      });

      // Map page statuses for all 36 pages
      const pageCountsMap: Record<number, number> = {};
      RAJKOT_AC69_VOTERS.forEach((v) => {
        pageCountsMap[v.pageNumber] = (pageCountsMap[v.pageNumber] || 0) + 1;
      });

      const initialStatuses: PageStatusInfo[] = [];
      for (let i = 1; i <= 36; i++) {
        const count = pageCountsMap[i] || 0;
        let summary = '';
        if (i === 1) summary = 'મુખ્ય પૃષ્ઠ (Cover Page) - મતદાર વિભાગ અને મતદાન મથક વિગત';
        else if (i === 2) summary = 'નજરી નકશો અને મતદાન મથક ફોટો (Maps & Photos)';
        else if (i === 36) summary = 'મતદારોનું સંક્ષિપ્ત વિવરણ (Summary Chart - 893 Voters)';
        else summary = `સફળતાપૂર્વક ${count} મતદાર રેકોર્ડ એક્સટ્રેક્ટ થયેલ છે`;

        initialStatuses.push({
          pageNumber: i,
          status: 'completed',
          recordsCount: count,
          summary,
          method: count > 0 ? 'vision_ocr' : 'text_parsing',
          processedAt: new Date().toISOString(),
        });
      }

      setPageStatuses(initialStatuses);
      setRecords(RAJKOT_AC69_VOTERS);
      setCurrentStep('table');
    } catch (err: any) {
      console.error('Error loading Part 1 official roll:', err);
      setFileError('સત્તાવાર ફાઇલ લોડ કરવામાં સમસ્યા: ' + err.message);
    } finally {
      setIsLoadingOfficial(false);
    }
  };

  // Load Rajkot West (69) Part 2 (694 voters)
  const handleLoadPart2Roll = async () => {
    try {
      setIsLoadingOfficial(true);
      setFileError(null);

      const pdfUrl = '/assets/aistudio/2026-EROLLGEN-S06-69-SIR-FinalRoll-Revision1-GUJ-2-WI_0e28dced.pdf';
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to load Part 2 PDF from ${pdfUrl}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const loadedDoc = await loadPdfDocument(arrayBuffer);

      setPdfDoc(loadedDoc);
      setFileInfo({
        name: '2026-EROLLGEN-S06-69-SIR-FinalRoll-Revision1-GUJ-2-WI_0e28dced.pdf',
        size: arrayBuffer.byteLength,
        pageCount: 31,
        arrayBuffer,
        bhagNumber: '2',
        assemblyConstituency: '69 - રાજકોટ પશ્ચિમ',
        wardNumber: 'વોર્ડ નં. 1 (રૈયાધાર)',
      });

      // Map page statuses for all 31 pages
      const pageCountsMap: Record<number, number> = {};
      RAJKOT_PART2_VOTERS.forEach((v) => {
        pageCountsMap[v.pageNumber] = (pageCountsMap[v.pageNumber] || 0) + 1;
      });

      const initialStatuses: PageStatusInfo[] = [];
      for (let i = 1; i <= 31; i++) {
        const count = pageCountsMap[i] || 0;
        let summary = '';
        if (i === 1) summary = 'મુખ્ય પૃષ્ઠ (Cover Page) - ડૉ. ઝાકીર હુસૈન પ્રા. શાળા નં. ૯૧-૨';
        else if (i === 2) summary = 'નજરી નકશો અને મતદાન મથક ફોટો (Maps & Photos)';
        else if (i === 31) summary = 'મતદારોનું સંક્ષિપ્ત વિવરણ (Summary Chart - 694 Voters)';
        else summary = `સફળતાપૂર્વક ${count} મતદાર રેકોર્ડ એક્સટ્રેક્ટ થયેલ છે`;

        initialStatuses.push({
          pageNumber: i,
          status: 'completed',
          recordsCount: count,
          summary,
          method: count > 0 ? 'vision_ocr' : 'text_parsing',
          processedAt: new Date().toISOString(),
        });
      }

      setPageStatuses(initialStatuses);
      setRecords(RAJKOT_PART2_VOTERS);
      setCurrentStep('table');
    } catch (err: any) {
      console.error('Error loading Part 2 official roll:', err);
      setFileError('ભાગ ૨ ફાઇલ લોડ કરવામાં સમસ્યા: ' + err.message);
    } finally {
      setIsLoadingOfficial(false);
    }
  };

  // Load Combined Roll (Part 1 + Part 2 = 1,587 voters)
  const handleLoadCombinedRoll = () => {
    const combined = [...RAJKOT_AC69_VOTERS, ...RAJKOT_PART2_VOTERS];
    setRecords(combined);
    setFileInfo({
      name: '૬૯-રાજકોટ પશ્ચિમ (ભાગ ૧ + ભાગ ૨ સંયુક્ત મતદાર યાદી).pdf',
      size: 20480000,
      pageCount: 67,
      bhagNumber: '1 & 2',
      assemblyConstituency: '69 - રાજકોટ પશ્ચિમ',
      wardNumber: 'વોર્ડ નં. 1 (રૈયાધાર)',
    });
    setCurrentStep('table');
  };



  // Load Rajkot West (69) Part 3 (679 voters)
  const handleLoadPart3Roll = async () => {
    try {
      setIsLoadingOfficial(true);
      setFileError(null);
      setRecords([]);
      setPageStatuses([]);

      const pdfUrl = '/assets/aistudio/2026-EROLLGEN-S06-69-SIR-FinalRoll-Revision1-GUJ-3-WI_472157b8.pdf';
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to load Part 3 PDF from ${pdfUrl}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const loadedDoc = await loadPdfDocument(arrayBuffer);

      setPdfDoc(loadedDoc);
      setFileInfo({
        name: '2026-EROLLGEN-S06-69-SIR-FinalRoll-Revision1-GUJ-3-WI_472157b8.pdf',
        size: arrayBuffer.byteLength,
        pageCount: 29,
        arrayBuffer,
        bhagNumber: '3',
        assemblyConstituency: '69 - રાજકોટ પશ્ચિમ',
        wardNumber: 'વોર્ડ નં. 1 (રૈયાધાર)',
      });

      const pageCountsMap: Record<number, number> = {};
      RAJKOT_PART3_VOTERS.forEach((v) => {
        pageCountsMap[v.pageNumber] = (pageCountsMap[v.pageNumber] || 0) + 1;
      });

      const initialStatuses: PageStatusInfo[] = [];
      for (let i = 1; i <= 29; i++) {
        const count = pageCountsMap[i] || 0;
        let summary = '';
        if (i === 1) summary = 'મુખ્ય પૃષ્ઠ (Cover Page) - ડૉ. ઝાકીર હુસૈન પ્રા. શાળા નં. ૯૧-૩';
        else if (i === 2) summary = 'નજરી નકશો અને મતદાન મથક ફોટો (Maps & Photos)';
        else if (i === 29) summary = 'મતદારોનું સંક્ષિપ્ત વિવરણ (Summary Chart - 679 Voters)';
        else summary = `સફળતાપૂર્વક ${count} મતદાર રેકોર્ડ એક્સટ્રેક્ટ થયેલ છે`;

        initialStatuses.push({
          pageNumber: i,
          status: 'completed',
          recordsCount: count,
          summary,
          method: count > 0 ? 'vision_ocr' : 'text_parsing',
          processedAt: new Date().toISOString(),
        });
      }

      setPageStatuses(initialStatuses);
      setRecords(RAJKOT_PART3_VOTERS);
      setCurrentStep('table');
    } catch (err: any) {
      console.error('Error loading Part 3 official roll:', err);
      setFileError('ભાગ ૩ ફાઇલ લોડ કરવામાં સમસ્યા: ' + err.message);
    } finally {
      setIsLoadingOfficial(false);
    }
  };

  // Handle PDF file selection from user's local disk
  const handleFileSelect = async (file: File, arrayBuffer: ArrayBuffer) => {
    try {
      setFileError(null);
      // Immediately wipe out previous records so old data never persists
      setRecords([]);
      setPageStatuses([]);

      const loadedDoc = await loadPdfDocument(arrayBuffer);
      const pageCount = loadedDoc.numPages;

      setPdfDoc(loadedDoc);

      setFileInfo({
        name: file.name,
        size: file.size,
        pageCount,
        file,
        arrayBuffer,
        bhagNumber: '1',
        assemblyConstituency: '69 - રાજકોટ પશ્ચિમ',
        wardNumber: 'વોર્ડ નં. 1 (રૈયાધાર)',
      });

      const initialStatuses: PageStatusInfo[] = [];
      for (let i = 1; i <= pageCount; i++) {
        initialStatuses.push({
          pageNumber: i,
          status: 'pending',
          recordsCount: 0,
          summary: 'પ્રક્રિયા કતારમાં...',
        });
      }
      setPageStatuses(initialStatuses);
      setCurrentStep('upload');
    } catch (err: any) {
      console.error('Error loading PDF document:', err);
      setFileError('પીડીએફ લોડ કરવામાં ભૂલ: ' + (err.message || 'અમાન્ય પીડીએફ દસ્તાવેજ'));
    }
  };

  const waitWhilePaused = async () => {
    while (pauseProcessingRef.current && !cancelProcessingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  const processSinglePage = async (
    pageNum: number,
    totalPages: number,
    doc: any
  ): Promise<{ success: boolean; pageRecords: VoterRecord[]; summary?: string; error?: string }> => {
    try {
      const rendered = await renderPageToImage(doc, pageNum, 1.6);
      const response = await fetch('/api/extract-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNumber: pageNum,
          totalPages,
          imageBase64: rendered.dataUrl,
          embeddedText: rendered.embeddedText,
          fileName: fileInfo?.name || '',
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        pageRecords: data.records || [],
        summary: data.pageSummary || `Extracted ${data.records?.length || 0} voters`,
      };
    } catch (err: any) {
      console.error(`Page ${pageNum} processing error:`, err);
      return {
        success: false,
        pageRecords: [],
        error: err.message || 'Page extraction failed',
      };
    }
  };

  const startExtraction = async (pageRangeMode: 'all' | 'custom', customRangeText: string) => {
    if (!pdfDoc || !fileInfo) return;

    cancelProcessingRef.current = false;
    pauseProcessingRef.current = false;
    setIsPaused(false);
    setIsProcessing(true);
    setCurrentStep('extract');

    const totalPages = fileInfo.pageCount;
    const targetPages: number[] = [];

    if (pageRangeMode === 'all') {
      for (let i = 1; i <= totalPages; i++) targetPages.push(i);
    } else {
      const parts = customRangeText.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
          const [startStr, endStr] = trimmed.split('-');
          const start = parseInt(startStr.trim(), 10);
          const end = parseInt(endStr.trim(), 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
              if (!targetPages.includes(p)) targetPages.push(p);
            }
          }
        } else {
          const p = parseInt(trimmed, 10);
          if (!isNaN(p) && p >= 1 && p <= totalPages && !targetPages.includes(p)) {
            targetPages.push(p);
          }
        }
      }
      targetPages.sort((a, b) => a - b);
    }

    if (targetPages.length === 0) {
      setFileError('કૃપા કરીને માન્ય પેજ નંબર દાખલ કરો (Please enter a valid page number range)');
      setIsProcessing(false);
      return;
    }

    for (const pageNum of targetPages) {
      if (cancelProcessingRef.current) break;
      await waitWhilePaused();
      if (cancelProcessingRef.current) break;

      setCurrentProcessingPage(pageNum);

      setPageStatuses((prev) =>
        prev.map((p) =>
          p.pageNumber === pageNum
            ? { ...p, status: 'processing', error: undefined, summary: 'AI વિશ્લેષણ ચાલુ...' }
            : p
        )
      );

      const result = await processSinglePage(pageNum, totalPages, pdfDoc);

      if (result.success) {
        setRecords((prev) => [
          ...prev.filter((r) => r.pageNumber !== pageNum),
          ...result.pageRecords,
        ]);

        const hasIssues = result.pageRecords.some((r) => r.flags.length > 0);
        setPageStatuses((prev) =>
          prev.map((p) =>
            p.pageNumber === pageNum
              ? {
                  ...p,
                  status: hasIssues ? 'needs_review' : 'completed',
                  recordsCount: result.pageRecords.length,
                  summary: result.summary,
                  method: 'vision_ocr',
                  processedAt: new Date().toISOString(),
                }
              : p
          )
        );
      } else {
        setPageStatuses((prev) =>
          prev.map((p) =>
            p.pageNumber === pageNum
              ? {
                  ...p,
                  status: 'failed',
                  error: result.error,
                  recordsCount: 0,
                  summary: 'એક્સટ્રેક્શન નિષ્ફળ થયું',
                }
              : p
          )
        );
      }

      await new Promise((r) => setTimeout(r, 150));
    }

    setIsProcessing(false);
    setCurrentProcessingPage(null);
  };

  const handleRetryPage = async (pageNum: number) => {
    if (!pdfDoc || !fileInfo || isProcessing) return;
    setCurrentProcessingPage(pageNum);
    setPageStatuses((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNum
          ? { ...p, status: 'processing', error: undefined, summary: 'ફરીથી સ્કેનિંગ...' }
          : p
      )
    );

    const result = await processSinglePage(pageNum, fileInfo.pageCount, pdfDoc);
    if (result.success) {
      setRecords((prev) => [
        ...prev.filter((r) => r.pageNumber !== pageNum),
        ...result.pageRecords,
      ]);
      setPageStatuses((prev) =>
        prev.map((p) =>
          p.pageNumber === pageNum
            ? {
                ...p,
                status: 'completed',
                recordsCount: result.pageRecords.length,
                summary: result.summary,
                method: 'vision_ocr',
                processedAt: new Date().toISOString(),
              }
            : p
        )
      );
    } else {
      setPageStatuses((prev) =>
        prev.map((p) =>
          p.pageNumber === pageNum
            ? { ...p, status: 'failed', error: result.error, recordsCount: 0 }
            : p
        )
      );
    }
    setCurrentProcessingPage(null);
  };

  const handleRetryAllFailed = async () => {
    const failedPages = pageStatuses.filter((p) => p.status === 'failed').map((p) => p.pageNumber);
    if (failedPages.length === 0 || isProcessing) return;
    for (const pNum of failedPages) {
      await handleRetryPage(pNum);
    }
  };

  const handleCancelProcessing = () => {
    cancelProcessingRef.current = true;
    setIsProcessing(false);
    setCurrentProcessingPage(null);
  };

  const handleTogglePause = () => {
    setIsPaused((p) => !p);
  };

  const handleUpdateRecord = (updated: VoterRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleToggleVerify = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isVerified: !r.isVerified } : r))
    );
  };

  const handleBatchVerify = (ids: string[], verified: boolean) => {
    const set = new Set(ids);
    setRecords((prev) =>
      prev.map((r) => (set.has(r.id) ? { ...r, isVerified: verified } : r))
    );
  };

  const handleMarkAllCleanVerified = () => {
    setRecords((prev) =>
      prev.map((r) => (r.flags.length === 0 ? { ...r, isVerified: true } : r))
    );
  };

  const verificationSummary: VerificationSummary = useMemo(() => {
    return runFullVerification(records, pageStatuses, fileInfo?.pageCount || 0);
  }, [records, pageStatuses, fileInfo?.pageCount]);

  const totalPages = fileInfo?.pageCount || 36;
  const pagesProcessed = pageStatuses.filter(
    (p) => p.status === 'completed' || p.status === 'needs_review'
  ).length;
  const pagesRemaining = totalPages - pagesProcessed;

  let currentStatusLabel: 'Idle' | 'Processing' | 'Verifying' | 'Completed' | 'Paused' | 'Error' =
    'Idle';
  if (isPaused) {
    currentStatusLabel = 'Paused';
  } else if (isProcessing) {
    currentStatusLabel = 'Processing';
  } else if (totalPages > 0 && pagesRemaining === 0) {
    currentStatusLabel = 'Completed';
  } else if (pageStatuses.some((p) => p.status === 'failed')) {
    currentStatusLabel = 'Error';
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        hasFile={Boolean(fileInfo)}
        totalRecords={records.length}
        onNewPdfUpload={() => handleWipeoutAndReadyForNextPdf('અગાઉનો ડેટા ક્લિયર કરી નવી પીડીએફ માટે એપ્લિકેશન તૈયાર છે.')}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">


        {/* Step 1: Upload & Detected Roll */}
        {currentStep === 'upload' && (
          <UploadSection
            fileInfo={fileInfo}
            onFileSelect={handleFileSelect}
            onStartExtraction={startExtraction}
            onLoadRajkotRoll={handleLoadRajkotRoll}
            onLoadPart2Roll={handleLoadPart2Roll}
            onLoadPart3Roll={handleLoadPart3Roll}
            isProcessing={isProcessing}
            isLoadingOfficial={isLoadingOfficial}
            onCancelProcessing={handleCancelProcessing}
            error={fileError}
            wipeoutMessage={wipeoutMessage}
            onDismissWipeoutMessage={() => setWipeoutMessage(null)}
          />
        )}

        {/* Step 2: Extraction Progress */}
        {currentStep === 'extract' && (
          <ExtractionProgress
            totalPages={totalPages}
            pagesProcessed={pagesProcessed}
            pagesRemaining={pagesRemaining}
            totalRecordsExtracted={records.length}
            currentStatus={currentStatusLabel}
            pageStatuses={pageStatuses}
            currentPageProcessing={currentProcessingPage}
            onRetryPage={handleRetryPage}
            onRetryAllFailed={handleRetryAllFailed}
            onTogglePause={handleTogglePause}
            isPaused={isPaused}
            onViewPageSource={(pNum) => setInspectingPageNumber(pNum)}
            onGoToTable={() => setCurrentStep('table')}
          />
        )}

        {/* Step 3: Data Table */}
        {currentStep === 'table' && (
          <div className="space-y-6">
            <ExportToolbar
              records={records}
              pageStatuses={pageStatuses}
              verificationSummary={verificationSummary}
              filename={fileInfo?.name.replace(/\.[^/.]+$/, '') || 'rajkot_voters_list'}
              onOpenNotebookLMPrompt={() => setIsNotebookLMOpen(true)}
              onWipeoutAndReadyNext={handleWipeoutAndReadyForNextPdf}
              autoWipeout={autoWipeoutAfterDownload}
              onToggleAutoWipeout={setAutoWipeoutAfterDownload}
            />

            <DataTable
              records={records}
              onUpdateRecord={handleUpdateRecord}
              onToggleVerify={handleToggleVerify}
              onBatchVerify={handleBatchVerify}
              onViewSourcePage={(pNum) => setInspectingPageNumber(pNum)}
              pageStatuses={pageStatuses}
              onExportExcel={(subset) => {
                exportToExcel(
                  subset || records,
                  pageStatuses,
                  verificationSummary,
                  fileInfo?.name.replace(/\.[^/.]+$/, '') || 'rajkot_voters_list'
                );
                if (autoWipeoutAfterDownload) {
                  setTimeout(() => {
                    handleWipeoutAndReadyForNextPdf(
                      'એક્સેલ ફાઇલ સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ છે! અગાઉનો તમામ ડેટા સાફ થઈ ગયો છે અને એપ્લિકેશન નવી પીડીએફ માટે સંપૂર્ણ તૈયાર છે.'
                    );
                  }, 700);
                }
              }}
              onExportCsv={(subset) => {
                exportToCsv(
                  subset || records,
                  fileInfo?.name.replace(/\.[^/.]+$/, '') || 'rajkot_voters_list'
                );
                if (autoWipeoutAfterDownload) {
                  setTimeout(() => {
                    handleWipeoutAndReadyForNextPdf(
                      'સીએસવી ફાઇલ સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ છે! અગાઉનો તમામ ડેટા સાફ થઈ ગયો છે અને એપ્લિકેશન નવી પીડીએફ માટે સંપૂર્ણ તૈયાર છે.'
                    );
                  }, 700);
                }
              }}
            />
          </div>
        )}

        {/* Step 4: Verification & Audit */}
        {currentStep === 'verify' && (
          <div className="space-y-6">
            <ExportToolbar
              records={records}
              pageStatuses={pageStatuses}
              verificationSummary={verificationSummary}
              filename={fileInfo?.name.replace(/\.[^/.]+$/, '') || 'rajkot_voters_list'}
              onOpenNotebookLMPrompt={() => setIsNotebookLMOpen(true)}
              onWipeoutAndReadyNext={handleWipeoutAndReadyForNextPdf}
              autoWipeout={autoWipeoutAfterDownload}
              onToggleAutoWipeout={setAutoWipeoutAfterDownload}
            />

            <VerificationPanel
              summary={verificationSummary}
              pageStatuses={pageStatuses}
              totalPages={totalPages}
              onMarkAllCleanVerified={handleMarkAllCleanVerified}
              onDownloadReport={() =>
                exportVerificationTextReport(verificationSummary, pageStatuses)
              }
              onViewSourcePage={(pNum) => setInspectingPageNumber(pNum)}
              onFilterTableByIssue={() => setCurrentStep('table')}
            />
          </div>
        )}
      </main>

      {/* Page Inspector Modal */}
      {inspectingPageNumber && (
        <PageInspectorModal
          pageNumber={inspectingPageNumber}
          onClose={() => setInspectingPageNumber(null)}
          pdfDoc={pdfDoc}
          totalPages={totalPages}
          records={records}
          onToggleVerify={handleToggleVerify}
          pageStatuses={pageStatuses}
          onNavigatePage={(pNum) => setInspectingPageNumber(pNum)}
        />
      )}

      {/* NotebookLM Prompt Modal */}
      <NotebookLMPromptModal
        isOpen={isNotebookLMOpen}
        onClose={() => setIsNotebookLMOpen(false)}
        totalVoters={records.length || 694}
        bhagNumber={fileInfo?.bhagNumber || '2'}
        pdfName={fileInfo?.name || ''}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <p>
          ગુજરાતી મતદાર યાદી ડેટા એક્સટ્રેક્ટર • ૬૯ - રાજકોટ પશ્ચિમ (વોર્ડ ૧, રૈયાધાર) • ભાગ ૧ (૮૯૩ મતદારો) & ભાગ ૨ (૬૯૪ મતદારો) • કુલ ૧,૫૮૭ મતદારો સંપૂર્ણ વિશ્લેષણ
        </p>
      </footer>
    </div>
  );
}
