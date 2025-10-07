import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileSpreadsheet,
  Plus,
  Save,
  FileText,
  RefreshCw,
  CheckCircle,
  Upload,
  Loader2,
  Brain,
  FileType,
  X, // Added for Remove icon
} from "lucide-react";
import { format } from "date-fns";

const SynopsisForm = React.memo(
  ({
    synopsis,
    onSubmit,
    onCancel,
    sharedDocuments,
    onRemoveDocument,
    onRefreshDocuments,
    loadSharedDocuments,
    isRefreshingDocuments,
    refreshSuccess,
  }) => {
    const [formData, setFormData] = useState(
      synopsis || {
        tender_name: "",
        customer_name: "",
        submission_date: "",
        prebid_meeting: "",
        prebid_query_submission_date: "",
        consultant_name: "",
        consultant_email: "",
        help_desk: "",
        tender_fee: "",
        tender_emd: "",
        branches: "",
        cbs_software: "",
        dc: "",
        dr: "",
        rfp_document_url: "",
        rfp_document_name: "",
      }
    );

    const [selectedDocument, setSelectedDocument] = useState(synopsis?.rfp_document_url || "");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisComplete, setAnalysisComplete] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fileInputRef = React.useRef(null);
    const isCancelledRef = React.useRef(false);

    // Effect to update selectedDocument when synopsis changes (e.g., for editing)
    useEffect(() => {
      isCancelledRef.current = false;
      setSelectedDocument(synopsis?.rfp_document_url || "");
      setFormData(
        synopsis || {
          tender_name: "",
          customer_name: "",
          submission_date: "",
          prebid_meeting: "",
          prebid_query_submission_date: "",
          consultant_name: "",
          consultant_email: "",
          help_desk: "",
          tender_fee: "",
          tender_emd: "",
          branches: "",
          cbs_software: "",
          dc: "",
          dr: "",
          rfp_document_url: "",
          rfp_document_name: "",
        }
      );
      // If a synopsis is being edited and already has a document, assume it might have been analyzed
      setAnalysisComplete(!!synopsis?.rfp_document_url);
    }, [synopsis]);

    const analyzeRFPDocument = useCallback(async (documentUrl, documentName) => {
      if (!documentUrl) return;

      isCancelledRef.current = false; // Reset on new analysis trigger
      setIsAnalyzing(true);
      setAnalysisComplete(false);

      try {
        const response = await apiClient.analyzeRFPForSynopsis(documentUrl, documentName);

        if (isCancelledRef.current) return; // Prevent state update if cancelled

        if (response && response.analysis && typeof response.analysis === "object") {
          // Pre-fill form with analyzed data
          setFormData((prev) => ({
            ...prev,
            ...response.analysis,
            rfp_document_url: documentUrl,
            rfp_document_name: documentName,
          }));
          setAnalysisComplete(true);
        }
      } catch (error) {
        console.error("RFP analysis failed:", error);

        if (isCancelledRef.current) return;

        // Show user-friendly error message
        const errorMessage = error.message?.includes("Network Error")
          ? "Network connection failed. Please check your internet connection and try again."
          : "Analysis failed. The document might be too complex or corrupted. Please try a different document or retry.";

        alert(errorMessage);

        // Reset analysis state on error
        setAnalysisComplete(false);
      } finally {
        if (!isCancelledRef.current) {
          setIsAnalyzing(false);
        }
      }
    }, []);

    // Handle document selection - NO AUTO-ANALYSIS HERE
    const handleDocumentSelect = useCallback(
      async (docUrl) => {
        const docDetails = sharedDocuments.find((doc) => doc.url === docUrl);
        setSelectedDocument(docUrl);

        if (docUrl && docDetails) {
          // Only set the document info, do NOT auto-analyze
          setFormData((prev) => ({
            ...prev,
            rfp_document_url: docUrl,
            rfp_document_name: docDetails.name,
          }));
          setAnalysisComplete(false); // Reset analysis state
        } else {
          // If docUrl is empty or docDetails not found, clear RFP document fields
          setFormData((prev) => ({
            ...prev,
            rfp_document_url: "",
            rfp_document_name: "",
          }));
          setAnalysisComplete(false);
        }
      },
      [sharedDocuments]
    );

    const handleReanalyze = useCallback(() => {
      // Check for either selected document or form data document
      const docUrl = selectedDocument || formData.rfp_document_url;
      const docName = formData.rfp_document_name || sharedDocuments.find((doc) => doc.url === selectedDocument)?.name;

      if (docUrl && docName) {
        analyzeRFPDocument(docUrl, docName);
      } else if (docUrl) {
        // If we have URL but no name, try to find it in shared documents
        const foundDoc = sharedDocuments.find((doc) => doc.url === docUrl);
        if (foundDoc) {
          analyzeRFPDocument(docUrl, foundDoc.name);
        } else {
          alert("Document information is incomplete. Please select a document first.");
        }
      } else {
        alert("No document is selected for re-analysis. Please upload or select a document first.");
      }
    }, [selectedDocument, formData.rfp_document_url, formData.rfp_document_name, sharedDocuments, analyzeRFPDocument]);

    // Handle file upload - NO AUTO-ANALYSIS HERE
    const handleFileUpload = useCallback(async (file) => {
      isCancelledRef.current = false; // Reset on new upload trigger
      setIsUploading(true);
      setUploadProgress(0);

      let progressValue = 0;
      const progressInterval = setInterval(() => {
        progressValue = Math.min(90, progressValue + 15);
        setUploadProgress(progressValue);
      }, 200);

      try {
        console.log("📤 Starting file upload:", file.name);
        const uploadResult = await apiClient.uploadFile(file, "synopsis");
        console.log("✅ Upload successful:", uploadResult);

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (uploadResult?.file_url) {
          console.log("📄 Setting document in form:", uploadResult.document);
          console.log("🔍 onRefreshDocuments function:", typeof onRefreshDocuments, onRefreshDocuments);

          // Call GET documents API directly after successful upload (same pattern as handleRemoveDocument)
          console.log("🔄 Calling GET documents API after successful upload...");
          try {
            // Add a small delay to ensure the database transaction is fully committed
            await new Promise((resolve) => setTimeout(resolve, 500));
            console.log("📡 Making API call: GET /documents to fetch updated document list...");
            await loadSharedDocuments(); // Direct call to loadSharedDocuments (exactly like handleRemoveDocument)
            console.log("✅ GET documents API call completed - Document list refreshed successfully");
          } catch (refreshError) {
            console.error("❌ Failed to call GET documents API:", refreshError);
            // Try again after a longer delay
            setTimeout(async () => {
              try {
                console.log("🔄 Retrying GET documents API call...");
                await loadSharedDocuments(); // Direct call on retry too
                console.log("✅ GET documents API retry successful");
              } catch (retryError) {
                console.error("❌ GET documents API retry failed:", retryError);
              }
            }, 1500);
          }

          // Only update form state if not cancelled
          if (!isCancelledRef.current) {
            setSelectedDocument(uploadResult.document.file_url);

            // Only set document info, do NOT auto-analyze
            setFormData((prev) => ({
              ...prev,
              rfp_document_url: uploadResult.document.file_url,
              rfp_document_name: file.name,
            }));
            setAnalysisComplete(false); // Reset analysis state

            console.log("✅ Upload completed and GET documents API called successfully - Client should now see the uploaded document");
          }
        } else {
          console.error("❌ Upload result missing file_url:", uploadResult);
        }
      } catch (error) {
        console.error("❌ Document upload failed:", error);
        alert(`Upload failed: ${error.message}`);

        // Even on error, try to refresh the document list in case the upload partially succeeded
        try {
          console.log("🔄 Refreshing documents after upload error...");
          await loadSharedDocuments(); // Direct call to loadSharedDocuments (same as handleRemoveDocument)
        } catch (refreshError) {
          console.error("❌ Failed to refresh documents after error:", refreshError);
        }
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }, []);

    const handleFileInputChange = useCallback(
      (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        e.target.value = ""; // Clear the input field for next selection

        const allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];

        if (!allowedTypes.includes(selectedFile.type) && !selectedFile.type.startsWith("image/")) {
          alert("Please upload PDF, Word, Excel, or image files only");
          return;
        }

        if (selectedFile.size > 25 * 1024 * 1024) {
          // Changed from 10MB to 25MB
          alert("File size must be less than 25MB"); // Updated alert message
          return;
        }

        handleFileUpload(selectedFile);
      },
      [handleFileUpload]
    );

    const handleSubmit = useCallback(
      (e) => {
        e.preventDefault();

        const finalData = {
          ...formData,
          tender_fee: formData.tender_fee ? Number(formData.tender_fee) : null,
          tender_emd: formData.tender_emd ? Number(formData.tender_emd) : null,
          branches: formData.branches ? Number(formData.branches) : null,
        };

        onSubmit(finalData);
      },
      [formData, onSubmit]
    );

    const handleInputChange = useCallback((field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleCancelClick = useCallback(() => {
      isCancelledRef.current = true; // Set ref to true to signal ongoing async operations to stop state updates
      setIsAnalyzing(false); // Stop any analysis indicators
      setIsUploading(false); // Stop any upload indicators
      setUploadProgress(0); // Reset upload progress
      onCancel(); // Call the parent's onCancel handler
    }, [onCancel]);

    const clearAssociatedDocument = useCallback(() => {
      setFormData((prev) => ({
        ...prev,
        rfp_document_url: "",
        rfp_document_name: "",
      }));
      setSelectedDocument("");
      setAnalysisComplete(false);
    }, []);

    // Download handlers within the form component
    const handleDownloadPDF = useCallback(async () => {
      if (!formData.tender_name) {
        alert("Please fill in at least the tender name before downloading.");
        return;
      }

      try {
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Synopsis - ${formData.tender_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
            .header h1 { color: #007bff; font-size: 28px; margin-bottom: 5px; }
            .header h2 { font-size: 22px; color: #555; }
            .section { margin-bottom: 25px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: bold; color: #007bff; margin-bottom: 10px; border-left: 4px solid #007bff; padding-left: 10px; }
            .field { margin-bottom: 8px; display: flex; align-items: baseline; }
            .field-label { font-weight: bold; min-width: 200px; margin-right: 10px; color: #444; }
            .field-value { flex-grow: 1; color: #555; }
            .note { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TENDER SYNOPSIS</h1>
            <h2>${formData.tender_name || "Untitled Synopsis"}</h2>
          </div>
          
          <div class="section">
            <div class="section-title">BASIC INFORMATION</div>
            <div class="field"><span class="field-label">Tender Name:</span> <span class="field-value">${
              formData.tender_name || "Not specified"
            }</span></div>
            <div class="field"><span class="field-label">Customer Name:</span> <span class="field-value">${
              formData.customer_name || "Not specified"
            }</span></div>
            <div class="field"><span class="field-label">Submission Date:</span> <span class="field-value">${
              formData.submission_date ? format(new Date(formData.submission_date), "dd/MM/yyyy") : "Not specified"
            }</span></div>
            <div class="field"><span class="field-label">Pre-bid Meeting:</span> <span class="field-value">${
              formData.prebid_meeting ? format(new Date(formData.prebid_meeting), "dd/MM/yyyy HH:mm") : "Not specified"
            }</span></div>
            <div class="field"><span class="field-label">Pre-bid Query Date:</span> <span class="field-value">${
              formData.prebid_query_submission_date ? format(new Date(formData.prebid_query_submission_date), "dd/MM/yyyy") : "Not specified"
            }</span></div>
          </div>

          <div class="section">
            <div class="section-title">CONTACT INFORMATION</div>
            <div class="field"><span class="field-label">Consultant Name:</span> <span class="field-value">${
              formData.consultant_name || "Not specified"
            }</span></div>
            <div class="field"><span class="field-label">Email ID:</span> <span class="field-value">${
              formData.consultant_email || "Not specified"
            }</span></div>
            <div class="field"><span class="field-label">Help Desk:</span> <span class="field-value">${
              formData.help_desk || "Not specified"
            }</span></div>
          </div>

          <div class="section">
            <div class="section-title">FINANCIAL DETAILS</div>
            <div class="field"><span class="field-label">Tender Fee:</span> <span class="field-value">${
              formData.tender_fee ? `₹${Number(formData.tender_fee).toLocaleString()}` : "Not specified"
            }</span></div>
            <div class="field"><span class="field-label">Tender EMD:</span> <span class="field-value">${
              formData.tender_emd ? `₹${Number(formData.tender_emd).toLocaleString()}` : "Not specified"
            }</span></div>
            <div class="field"><span class="field-label">Branches:</span> <span class="field-value">${
              formData.branches || "Not specified"
            }</span></div>
          </div>

          <div class="section">
            <div class="section-title">TECHNICAL REQUIREMENTS</div>
            <div class="field"><span class="field-label">CBS Software:</span> <span class="field-value">${
              formData.cbs_software || "Not specified"
            }</span></div>
            <div class="field"><span class="field-label">DC (Data Center):</span> <span class="field-value">${
              formData.dc || "Not specified"
            }</span></div>
            <div class="field"><span class="field-label">DR (Disaster Recovery):</span> <span class="field-value">${
              formData.dr || "Not specified"
            }</span></div>
          </div>

          ${
            formData.rfp_document_name
              ? `
          <div class="section">
            <div class="section-title">ASSOCIATED DOCUMENTS</div>
            <div class="field"><span class="field-label">RFP Document:</span> <span class="field-value">${formData.rfp_document_name}</span></div>
          </div>
          `
              : ""
          }
          <div class="note">Generated by ESDS AI Synopsis on ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
        </body>
        </html>`;

        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Synopsis_${formData.tender_name.replace(/[^a-zA-Z0-9]/g, "_") || "Untitled"}_${new Date().toISOString().split("T")[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("PDF generation failed:", error);
        alert("Failed to generate PDF. Please try again.");
      }
    }, [formData]);

    const handleDownloadWord = useCallback(() => {
      if (!formData.tender_name) {
        alert("Please fill in at least the tender name before downloading.");
        return;
      }

      try {
        const wordContent = `<html>
<head>
<meta charset="UTF-8">
<style>
.main-heading { color: #003366; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
.section-heading { color: #003366; font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; border-bottom: 2px solid #003366; padding-bottom: 5px; }
.content { font-family: Arial, sans-serif; line-height: 1.5; }
.field { margin-bottom: 8px; }
.field-label { font-weight: bold; color: #333; }
</style>
</head>
<body class="content">

<h1 class="main-heading">TENDER SYNOPSIS</h1>
<h2 class="main-heading" style="font-size: 20px;">${formData.tender_name || "Untitled Synopsis"}</h2>

<h3 class="section-heading">BASIC INFORMATION</h3>
<div class="field"><span class="field-label">Tender Name:</span> ${formData.tender_name || "Not specified"}</div>
<div class="field"><span class="field-label">Customer Name:</span> ${formData.customer_name || "Not specified"}</div>
<div class="field"><span class="field-label">Submission Date:</span> ${
          formData.submission_date ? format(new Date(formData.submission_date), "dd/MM/yyyy") : "Not specified"
        }</div>
<div class="field"><span class="field-label">Pre-bid Meeting:</span> ${
          formData.prebid_meeting ? format(new Date(formData.prebid_meeting), "dd/MM/yyyy HH:mm") : "Not specified"
        }</div>
<div class="field"><span class="field-label">Pre-bid Query Submission Date:</span> ${
          formData.prebid_query_submission_date ? format(new Date(formData.prebid_query_submission_date), "dd/MM/yyyy") : "Not specified"
        }</div>

<h3 class="section-heading">CONTACT INFORMATION</h3>
<div class="field"><span class="field-label">Consultant Name:</span> ${formData.consultant_name || "Not specified"}</div>
<div class="field"><span class="field-label">Email ID Consultant:</span> ${formData.consultant_email || "Not specified"}</div>
<div class="field"><span class="field-label">Help Desk:</span> ${formData.help_desk || "Not specified"}</div>

<h3 class="section-heading">FINANCIAL DETAILS</h3>
<div class="field"><span class="field-label">Tender Fee:</span> ${
          formData.tender_fee ? `₹${Number(formData.tender_fee).toLocaleString()}` : "Not specified"
        }</div>
<div class="field"><span class="field-label">Tender EMD:</span> ${
          formData.tender_emd ? `₹${Number(formData.tender_emd).toLocaleString()}` : "Not specified"
        }</div>
<div class="field"><span class="field-label">Branches:</span> ${formData.branches || "Not specified"}</div>

<h3 class="section-heading">TECHNICAL REQUIREMENTS</h3>
<div class="field"><span class="field-label">CBS Software:</span> ${formData.cbs_software || "Not specified"}</div>
<div class="field"><span class="field-label">DC (Data Center):</span> ${formData.dc || "Not specified"}</div>
<div class="field"><span class="field-label">DR (Disaster Recovery):</span> ${formData.dr || "Not specified"}</div>

${
  formData.rfp_document_name
    ? `
<h3 class="section-heading">ASSOCIATED DOCUMENTS</h3>
<div class="field"><span class="field-label">RFP Document:</span> ${formData.rfp_document_name}</div>
`
    : ""
}

<div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
Generated on: ${format(new Date(), "dd/MM/yyyy HH:mm")}<br>
Generated by: ESDS Software Solution - Presales & Sales Teams
</div>

</body>
</html>`;

        const blob = new Blob([wordContent], { type: "application/msword" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Synopsis_${formData.tender_name.replace(/[^a-zA-Z0-9]/g, "_") || "Untitled"}_${new Date().toISOString().split("T")[0]}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Word document generation failed:", error);
        alert("Failed to generate Word document. Please try again.");
      }
    }, [formData]);

    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            {synopsis ? "Edit Synopsis" : "Create New Synopsis with Manual AI Analysis"}
          </CardTitle>
          {analysisComplete && (
            <Badge className="bg-green-100 text-green-800 w-fit text-sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              Analysis Complete
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* RFP Document Upload/Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-slate-800">RFP Document Analysis</Label>

              {/* File Upload & Actions */}
              <div className="flex flex-wrap items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isUploading || isAnalyzing}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isAnalyzing}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Upload New RFP
                </Button>

                {(formData.rfp_document_url || selectedDocument) && (
                  <Button
                    type="button"
                    onClick={handleReanalyze}
                    disabled={isAnalyzing || isUploading}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Re-Analyze Document
                      </>
                    )}
                  </Button>
                )}

                {/* PDF and Word Download buttons */}
                <Button
                  type="button"
                  onClick={handleDownloadPDF}
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 text-sm font-medium"
                  disabled={!formData.tender_name}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>

                <Button
                  type="button"
                  onClick={handleDownloadWord}
                  variant="outline"
                  className="text-blue-600 hover:bg-blue-50 text-sm font-medium"
                  disabled={!formData.tender_name}
                >
                  <FileType className="w-4 h-4 mr-2" />
                  Download Word
                </Button>

                {/* Action buttons */}
                <div className="flex-grow" />

                <Button type="button" variant="outline" onClick={handleCancelClick} className="text-sm font-medium">
                  Cancel
                </Button>
              </div>

              {/* Existing Documents Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-700">Available Documents ({sharedDocuments.length})</Label>
                  <div className="flex items-center gap-2">
                    {refreshSuccess && (
                      <div className="flex items-center text-green-600 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Updated
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onRefreshDocuments}
                      disabled={isRefreshingDocuments}
                      className="text-xs text-slate-500 hover:text-slate-700"
                      title="Refresh document list"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshingDocuments ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </div>

                {isRefreshingDocuments ? (
                  <div className="border rounded-lg p-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-slate-500">Refreshing documents...</p>
                  </div>
                ) : sharedDocuments.length > 0 ? (
                  <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                    {sharedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                          selectedDocument === doc.url ? "bg-blue-100" : "hover:bg-slate-50"
                        }`}
                        onClick={() => handleDocumentSelect(doc.url)}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800 truncate" title={doc.name}>
                              {doc.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Uploaded from {doc.uploaded_from} • {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {doc.uploaded_from}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent selection when clicking remove
                            if (window.confirm(`Are you sure you want to delete "${doc.name}"? This will remove it from all modules.`)) {
                              onRemoveDocument(doc.id);
                            }
                          }}
                          title={`Delete ${doc.name}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No documents found</p>
                    <p className="text-xs mt-1">Upload RFP documents from Analysis or Chat modules, or upload directly here</p>
                  </div>
                )}
              </div>

              {/* Analysis Status */}
              {(isUploading || isAnalyzing) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 text-blue-500 mx-auto mb-2 animate-spin" />
                    <p className="text-sm font-medium text-blue-700 mb-2">{isUploading ? "Uploading document..." : "AI analyzing RFP document..."}</p>
                    {isUploading && (
                      <div className="w-48 mx-auto">
                        <div className="bg-blue-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">{uploadProgress}% complete</p>
                      </div>
                    )}
                    <p className="text-xs text-blue-500 mt-2">{isAnalyzing ? "This may take a few moments." : ""}</p>
                  </div>
                </div>
              )}
              {!isUploading && !isAnalyzing && formData.rfp_document_name && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-800 truncate" title={formData.rfp_document_name}>
                      Document Ready: {formData.rfp_document_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysisComplete && <CheckCircle className="w-4 h-4 text-green-600" />}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearAssociatedDocument}
                      className="h-6 w-6 text-blue-600 hover:bg-blue-100"
                      title="Remove associated document"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tender_name" className="text-sm font-medium text-slate-700">
                    Tender Name *
                  </Label>
                  <Input
                    id="tender_name"
                    value={formData.tender_name}
                    onChange={(e) => handleInputChange("tender_name", e.target.value)}
                    placeholder="Enter tender name"
                    required
                    className="text-sm h-11"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customer_name" className="text-sm font-medium text-slate-700">
                    Customer Name *
                  </Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange("customer_name", e.target.value)}
                    placeholder="Enter customer name"
                    required
                    className="text-sm h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branches" className="text-sm font-medium text-slate-700">
                    Branches
                  </Label>
                  <Input
                    id="branches"
                    type="number"
                    value={formData.branches}
                    onChange={(e) => handleInputChange("branches", e.target.value)}
                    placeholder="Number of branches"
                    min="0"
                    className="text-sm h-11"
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">Important Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="submission_date" className="text-sm font-medium text-slate-700">
                    Submission Date
                  </Label>
                  <Input
                    id="submission_date"
                    type="date"
                    value={formData.submission_date}
                    onChange={(e) => handleInputChange("submission_date", e.target.value)}
                    className="text-sm h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prebid_meeting" className="text-sm font-medium text-slate-700">
                    Pre-bid Meeting
                  </Label>
                  <Input
                    id="prebid_meeting"
                    type="datetime-local"
                    value={formData.prebid_meeting}
                    onChange={(e) => handleInputChange("prebid_meeting", e.target.value)}
                    className="text-sm h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prebid_query_submission_date" className="text-sm font-medium text-slate-700">
                    Pre-bid Query Submission Date
                  </Label>
                  <Input
                    id="prebid_query_submission_date"
                    type="date"
                    value={formData.prebid_query_submission_date}
                    onChange={(e) => handleInputChange("prebid_query_submission_date", e.target.value)}
                    className="text-sm h-11"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="consultant_name" className="text-sm font-medium text-slate-700">
                    Consultant Name
                  </Label>
                  <Input
                    id="consultant_name"
                    value={formData.consultant_name}
                    onChange={(e) => handleInputChange("consultant_name", e.target.value)}
                    placeholder="Enter consultant name"
                    className="text-sm h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultant_email" className="text-sm font-medium text-slate-700">
                    Email ID Consultant
                  </Label>
                  <Input
                    id="consultant_email"
                    type="email"
                    value={formData.consultant_email}
                    onChange={(e) => handleInputChange("consultant_email", e.target.value)}
                    placeholder="consultant@example.com"
                    className="text-sm h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="help_desk" className="text-sm font-medium text-slate-700">
                    Help Desk
                  </Label>
                  <Input
                    id="help_desk"
                    value={formData.help_desk}
                    onChange={(e) => handleInputChange("help_desk", e.target.value)}
                    placeholder="Help desk contact"
                    className="text-sm h-11"
                  />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">Financial Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tender_fee" className="text-sm font-medium text-slate-700">
                    Tender Fee (₹)
                  </Label>
                  <Input
                    id="tender_fee"
                    type="number"
                    value={formData.tender_fee}
                    onChange={(e) => handleInputChange("tender_fee", e.target.value)}
                    placeholder="0"
                    min="0"
                    className="text-sm h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tender_emd" className="text-sm font-medium text-slate-700">
                    Tender EMD (₹)
                  </Label>
                  <Input
                    id="tender_emd"
                    type="number"
                    value={formData.tender_emd}
                    onChange={(e) => handleInputChange("tender_emd", e.target.value)}
                    placeholder="0"
                    min="0"
                    className="text-sm h-11"
                  />
                </div>
              </div>
            </div>

            {/* Technical Requirements */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">Technical Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cbs_software" className="text-sm font-medium text-slate-700">
                    CBS Software
                  </Label>
                  <Textarea
                    id="cbs_software"
                    value={formData.cbs_software}
                    onChange={(e) => handleInputChange("cbs_software", e.target.value)}
                    placeholder="CBS software requirements"
                    rows={4}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dc" className="text-sm font-medium text-slate-700">
                    DC (Data Center)
                  </Label>
                  <Textarea
                    id="dc"
                    value={formData.dc}
                    onChange={(e) => handleInputChange("dc", e.target.value)}
                    placeholder="Data center requirements"
                    rows={4}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dr" className="text-sm font-medium text-slate-700">
                    DR (Disaster Recovery)
                  </Label>
                  <Textarea
                    id="dr"
                    value={formData.dr}
                    onChange={(e) => handleInputChange("dr", e.target.value)}
                    placeholder="Disaster recovery requirements"
                    rows={4}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }
);

export default function SynopsisPage() {
  const [synopses, setSynopses] = useState([]);
  const [, setShowForm] = useState(true); // Changed to true by default
  const [editingSynopsis, setEditingSynopsis] = useState(null);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingDocuments, setIsRefreshingDocuments] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const loadSynopses = useCallback(async () => {
    try {
      const response = await apiClient.getSynopsis({ limit: 50, sort: "-created_at" });
      setSynopses(response.synopsis || []);
    } catch (error) {
      console.error("Failed to load synopses:", error);
    }
  }, []);

  const loadSharedDocuments = useCallback(async () => {
    try {
      console.log("� CoALLING GET DOCUMENTS API for Synopsis page...");
      console.log("� AAPI endpoint: GET /api/documents");
      console.log("📡 API params:", { limit: 50, sort: "-created_at" });

      const response = await apiClient.getDocuments({ limit: 50, sort: "-created_at" });

      console.log("� GET DeOCUMENTS API RESPONSE:", response);
      console.log("✅ GET DOCUMENTS API SUCCESS - Documents loaded:", response.documents?.length || 0, "documents");
      console.log(
        "📄 Document details from API:",
        response.documents?.map((doc) => ({
          id: doc.id,
          name: doc.name,
          uploaded_from: doc.uploaded_from,
          created_at: doc.created_at,
          url: doc.url,
        }))
      );

      const documents = response.documents || [];
      setSharedDocuments(documents);

      console.log("✅ CLIENT STATE UPDATED - Documents now available in UI:", documents.length, "documents");
    } catch (error) {
      console.error("❌ Failed to load shared documents:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
      });
      // Show user-friendly error
      alert("Failed to load documents. Please refresh the page and try again.");
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadSynopses(), loadSharedDocuments()]);
      setIsLoading(false);
    };
    loadData();
  }, [loadSynopses, loadSharedDocuments]);

  const handleRemoveDocument = useCallback(
    async (docId) => {
      try {
        await apiClient.deleteDocument(docId);
        await loadSharedDocuments(); // Reload documents after deletion
      } catch (error) {
        console.error("Failed to delete document:", error);
        alert("Failed to remove document. Please try again.");
      }
    },
    [loadSharedDocuments]
  );

  const handleRefreshDocuments = useCallback(async () => {
    console.log("🔄 handleRefreshDocuments called - Refreshing documents after upload...");
    setIsRefreshingDocuments(true);
    setRefreshSuccess(false);
    try {
      await loadSharedDocuments(); // Direct call to loadSharedDocuments (same as handleRemoveDocument)
      console.log("✅ GET DOCUMENTS API completed successfully - Documents are now visible to client");
      setRefreshSuccess(true);
      // Hide success indicator after 3 seconds
      setTimeout(() => setRefreshSuccess(false), 3000);
    } catch (error) {
      console.error("❌ loadSharedDocuments failed:", error);
    } finally {
      setIsRefreshingDocuments(false);
    }
  }, [loadSharedDocuments]);

  const handleSubmit = useCallback(
    async (synopsisData) => {
      try {
        if (editingSynopsis) {
          await apiClient.updateSynopsis(editingSynopsis.id, synopsisData);
        } else {
          await apiClient.createSynopsis(synopsisData);
        }
        setShowForm(true);
        setEditingSynopsis(null);
        await loadSynopses();
      } catch (error) {
        console.error("Failed to save synopsis:", error);
      }
    },
    [editingSynopsis, loadSynopses]
  );

  const handleCancel = useCallback(() => {
    setEditingSynopsis(null);
    setShowForm(true);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading Synopsis Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="h-full p-6">
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Synopsis</h1>
              <p className="text-slate-600 mt-1">AI-powered tender analysis with auto-filled RFP data</p>
              {sharedDocuments.length === 0 && !isLoading && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>No documents found.</strong> Upload RFP documents from the Analysis or Chat modules, or upload directly below.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Always show the form */}
          <div className="flex-1">
            <SynopsisForm
              synopsis={editingSynopsis}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              sharedDocuments={sharedDocuments}
              onRemoveDocument={handleRemoveDocument}
              onRefreshDocuments={handleRefreshDocuments}
              loadSharedDocuments={loadSharedDocuments}
              isRefreshingDocuments={isRefreshingDocuments}
              refreshSuccess={refreshSuccess}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
