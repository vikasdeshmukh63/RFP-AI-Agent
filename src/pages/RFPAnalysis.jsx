
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  FileSpreadsheet,
  Search,
  AlertCircle,
  X
} from "lucide-react";

// Optimized components with better performance
const DocumentCard = React.memo(({ doc, isSelected, onSelect, onRemove }) => (
  <div
    className={`flex items-center justify-between gap-2 p-2 border rounded-lg cursor-pointer transition-all duration-200 ${
      isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-blue-50 hover:shadow-sm'
    }`}
    onClick={() => onSelect(doc)}
  >
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate" title={doc.name}>{doc.name}</p>
        <p className="text-xs text-slate-500">
          From: {doc.uploaded_from} | {Math.round(doc.size / 1024)} KB
        </p>
      </div>
    </div>
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
      onClick={(e) => {
        e.stopPropagation(); // Prevent onSelect from firing
        onRemove(doc);
      }}
      title={`Delete ${doc.name}`}
    >
      <X className="w-4 h-4" />
    </Button>
  </div>
));

const QuestionPreview = React.memo(({ questions }) => (
  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
    {questions.map((question, index) => (
      <div key={`q-${index}`} className="flex items-start gap-2 p-2 bg-slate-50 rounded text-sm">
        <Badge variant="outline" className="text-xs flex-shrink-0 mt-0.5">
          {index + 1}
        </Badge>
        <span className="text-slate-700">{question}</span>
      </div>
    ))}
  </div>
));

const ResultItem = React.memo(({ question, answer, index }) => {
  const rowCount = useMemo(() => {
    return answer && answer.length > 100 ? 4 : 2;
  }, [answer]);

  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <Badge className="bg-blue-100 text-blue-800 flex-shrink-0 mt-1">
          {index + 1}
        </Badge>
        <div className="flex-1 space-y-2">
          <h4 className="font-medium text-slate-900">{question}</h4>
          <Textarea
            value={answer || "Not specified in RFP"}
            readOnly
            className="bg-slate-50 border-slate-200 text-sm resize-none"
            rows={rowCount}
          />
        </div>
      </div>
    </div>
  );
});

// Loading skeleton for better UX
const AnalysisLoadingSkeleton = React.memo(() => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-6 bg-slate-200 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
));

// Memoized predefined questions
const predefinedQuestions = [
  "DC (Data Center)", "DR (Disaster Recovery)", "Concurrent users", "Total users per day", "Milestones", "Delivery plan", "Go Live deadline",
  "Penalties", "SLA (Service Level Agreement)", "EMD (Earnest Money Deposit)", 
  "PBG (Performance Bank Guarantee)", "Budget by Client", "Date of bid submission", "Prebid date",
  "Cloud requirements", "Non-functional requirements (Performance, Uptime, Security)",
  "Security Audit requirements", "MFA (Multi-Factor Authentication)", "SSO (Single Sign-On)",
  "SSL requirements", "Payment Gateway", "Aadhaar integration", "SMS integration", "Email integration",
  "On Site Resource requirements", "Handholding requirements", "Training requirements", 
  "Data Migration", "On Site presence", "AMC (Annual Maintenance Contract)", 
  "O&M (Operation & Maintenance)", "Deliverables", "Documentation requirements",
  "Multilingual support", "KPIs (Key Performance Indicators)", "Success Factors",
  "Analytics Interactive Dashboard", "RBAC (Role Based Access Control)", "Telemetry",
  "Existing Technical Stack", "Expected Technical Stack", "Chatbot requirements",
  "IVR (Interactive Voice Response)", "Audit", "How Many Audit", 
  "RTO (Recovery Time Objective)", "RPO (Recovery Point Objective)", "Seismic zones", "Payment Type", "Pay Out Type",
  "Backup", "Backup Type", "Total size of the data"
];

export default function RFPAnalysis() {
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  
  const fileInputRef = useRef(null);

  // Optimized shared documents loading with better caching
  const loadSharedDocuments = useCallback(async () => {
    try {
      const { documents: docs } = await apiClient.getDocuments({ 
        limit: 20, 
        sort: '-created_at' 
      });
      setSharedDocuments(prev => {
        const newDocs = docs || [];
        // Deep comparison to prevent unnecessary state updates
        if (prev.length !== newDocs.length || prev.some((doc, i) => doc.id !== newDocs[i]?.id)) {
          // Auto-select most recent if no document selected
          if (!uploadedDocument && newDocs.length > 0) {
            setUploadedDocument(newDocs[0]);
          }
          return newDocs;
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to load shared documents:", error);
    }
  }, [uploadedDocument]);

  useEffect(() => {
    loadSharedDocuments();
  }, [loadSharedDocuments]);

  const handleRemoveDocument = useCallback(async (docToRemove) => {
    if (!docToRemove?.id) return;
    if (!window.confirm(`Are you sure you want to delete "${docToRemove.name}"? This will remove it from all modules.`)) {
      return;
    }

    try {
      await apiClient.deleteDocument(docToRemove.id);
      
      // If the removed document was the currently selected one, clear selection and results
      if (uploadedDocument?.id === docToRemove.id) {
        setUploadedDocument(null);
        setAnalysisResults({});
      }

      await loadSharedDocuments(); // Reload the list to reflect deletion
      setError(null);
    } catch (error) {
      console.error("Failed to delete document:", error);
      setError("Failed to remove document. Please try again.");
    }
  }, [loadSharedDocuments, uploadedDocument]);

  // Enhanced file upload with Synopsis sync
  const handleFileUpload = useCallback(async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    setAnalysisResults({});
    setError(null);

    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue = Math.min(90, progressValue + 15);
      setUploadProgress(progressValue);
    }, 200);

    try {
      const uploadResult = await apiClient.uploadFile(file, "analysis");
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadResult?.file_url) {
        const createdDoc = uploadResult.document;
        setUploadedDocument(createdDoc);
        setSharedDocuments(prev => [createdDoc, ...prev]);
        setError(null);
        
        // Show sync confirmation
        console.log(`Document "${file.name}" uploaded and synced across all modules (Chat Bot, Synopsis)`);
      } else {
        throw new Error("File upload failed. The server did not return a file URL.");
      }
    } catch (error) {
      console.error("Document upload failed:", error);
      setError("Failed to upload document. Please check your network and try again.");
      setUploadedDocument(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  // Optimized file input handler
  const handleFileInputChange = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    e.target.value = '';

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.type.startsWith("image/")) {
      setError("Please upload PDF, Word, Excel, or image files only");
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) { // Increased from 10MB to 25MB
      setError("File size must be less than 25MB");
      return;
    }

    handleFileUpload(selectedFile);
  }, [handleFileUpload]);

  // Optimized RFP analysis with better error handling
  const analyzeRFP = useCallback(async () => {
    if (!uploadedDocument?.id) {
      setError("Please upload an RFP document first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { analysis } = await apiClient.quickRFPAnalysis(uploadedDocument.id);

      if (analysis && typeof analysis === 'object') {
        setAnalysisResults(analysis);
        setError(null);
      } else {
        throw new Error("Invalid response format from AI");
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      
      // Provide specific error messages based on error type
      let errorMessage = "Analysis failed. ";
      
      if (error.message?.includes('Network Error') || error.message?.includes('network')) {
        errorMessage += "Network connection issue detected. This could be due to:\n\n" +
                      "• Large document size (try a smaller file)\n" +
                      "• Slow internet connection\n" +
                      "• Server timeout\n\n" +
                      "Please try again with a smaller document or check your internet connection.";
      } else if (error.message?.includes('timeout')) {
        errorMessage += "The analysis is taking too long. Please try with a smaller document or simpler RFP.";
      } else if (error.message?.includes('size') || error.message?.includes('large')) {
        errorMessage += "Document is too large or complex to process. Please try with a smaller file.";
      } else {
        errorMessage += "The AI could not process this document. It might be:\n\n" +
                      "• Too complex or corrupted\n" +
                      "• In an unsupported format\n" +
                      "• Too large for processing\n\n" +
                      "Please try another document or contact support.";
      }
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadedDocument]);

  // Optimized Excel download with styling
  const downloadExcel = useCallback(() => {
    if (Object.keys(analysisResults).length === 0) {
      setError("Please analyze the RFP first");
      return;
    }

    try {
      const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
      };

      const tableRows = Object.entries(analysisResults)
        .map(([question, answer], index) => 
          `<tr>
            <td style="border: 1px solid #cccccc; padding: 5px;">${index + 1}</td>
            <td style="border: 1px solid #cccccc; padding: 5px;">${escapeHtml(question)}</td>
            <td style="border: 1px solid #cccccc; padding: 5px;">${escapeHtml(answer || 'Not specified in RFP')}</td>
          </tr>`
        )
        .join("");

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>RFP Analysis</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body>
          <table style="border-collapse: collapse;">
            <thead>
              <tr>
                <th style="font-weight: bold; color: #00008B; background-color: #F0F0F0; border: 1px solid #cccccc; padding: 5px;">Serial No</th>
                <th style="font-weight: bold; color: #00008B; background-color: #F0F0F0; border: 1px solid #cccccc; padding: 5px;">Question</th>
                <th style="font-weight: bold; color: #00008B; background-color: #F0F0F0; border: 1px solid #cccccc; padding: 5px;">Answer</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `RFP_Analysis_${uploadedDocument?.name.replace(/\.[^/.]+$/, "") || 'document'}_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      setError("Failed to download file");
    }
  }, [analysisResults, uploadedDocument]);

  // Optimized document selection
  const selectSharedDocument = useCallback((doc) => {
    setUploadedDocument(doc);
    setAnalysisResults({});
    setError(null);
  }, []);

  // Optimized document clearing
  const clearDocument = useCallback(() => {
    setUploadedDocument(null);
    setAnalysisResults({});
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Memoized components
  const sharedDocumentsList = useMemo(() => {
    return sharedDocuments.map((doc, index) => (
      <DocumentCard
        key={`${doc.id || doc.url}-${index}`}
        doc={doc}
        isSelected={uploadedDocument?.url === doc.url}
        onSelect={selectSharedDocument}
        onRemove={handleRemoveDocument}
      />
    ));
  }, [sharedDocuments, uploadedDocument?.url, selectSharedDocument, handleRemoveDocument]);

  const analysisResultsList = useMemo(() => {
    return Object.entries(analysisResults).map(([question, answer], index) => (
      <ResultItem
        key={`result-${index}-${question.slice(0, 20)}`}
        question={question}
        answer={answer}
        index={index}
      />
    ));
  }, [analysisResults]);

  const hasResults = Object.keys(analysisResults).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto flex flex-col h-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">RFP Quick Analysis</h1>
          <p className="text-slate-600">Upload an RFP document or select from synced documents to extract answers for {predefinedQuestions.length} predefined questions</p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 text-red-800">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">Analysis Error:</span>
                  <pre className="whitespace-pre-wrap text-sm mt-1 font-normal">{error}</pre>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-600 hover:text-red-800 flex-shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Upload RFP Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Shared Documents Section */}
                {sharedDocuments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">📚 Available Documents (Synced):</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {sharedDocumentsList}
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-xs text-slate-500 text-center">Or upload a new document:</p>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileInputChange}
                  className="hidden"
                  ref={fileInputRef}
                  disabled={isUploading}
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Select RFP Document
                    </>
                  )}
                </Button>

                {isUploading && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-slate-500 text-center">{uploadProgress}% complete</p>
                  </div>
                )}

                {uploadedDocument && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <div>
                          <span className="text-sm font-medium text-green-800">Document Ready</span>
                          <p className="text-xs text-green-700">{uploadedDocument.name}</p>
                          <p className="text-xs text-green-600">{Math.round(uploadedDocument.size / 1024)} KB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearDocument} className="text-green-600 hover:text-green-800">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={analyzeRFP}
                  disabled={!uploadedDocument || isAnalyzing || isUploading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing RFP...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Analyze RFP ({predefinedQuestions.length} Questions)
                    </>
                  )}
                </Button>

                {hasResults && (
                  <Button
                    onClick={downloadExcel}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Excel Report
                  </Button>
                )}

                <div className="text-xs text-slate-500 space-y-1">
                  <p>• Supported formats: PDF, Word, Excel, Images</p>
                  <p>• Maximum file size: 25MB</p>
                  <p>• Analysis covers {predefinedQuestions.length} key RFP aspects</p>
                  <p>• For large files, analysis may take 2-3 minutes</p>
                </div>
              </CardContent>
            </Card>

            {/* Questions Preview */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Analysis Coverage ({predefinedQuestions.length} Questions)</CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionPreview questions={predefinedQuestions} />
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-xl flex flex-col ${hasResults ? 'flex-1' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    Analysis Results
                  </CardTitle>
                  {hasResults && (
                    <Badge className="bg-green-100 text-green-800">
                      {Object.keys(analysisResults).length} Questions Answered
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {isAnalyzing ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
                      <h3 className="font-medium text-blue-800 mb-2">AI is analyzing your RFP document...</h3>
                      <p className="text-sm text-blue-600">This may take 2-3 minutes for large documents. Please wait.</p>
                    </div>
                    <AnalysisLoadingSkeleton />
                  </div>
                ) : !hasResults ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">No Analysis Yet</h3>
                    <p className="text-slate-500 mb-4">Upload and analyze an RFP document to see detailed results here</p>
                    <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
                      <span>📄 Upload Document</span>
                      <span>→</span>
                      <span>🔍 Analyze Content</span>
                      <span>→</span>
                      <span>📊 View Results</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysisResultsList}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
