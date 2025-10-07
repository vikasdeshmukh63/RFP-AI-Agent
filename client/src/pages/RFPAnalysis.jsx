
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

// Comprehensive predefined questions (131 total) - matches backend
const predefinedQuestions = [
  "DC (Data Center): Please share DC infrastructure details including VM configuration (vCPU, RAM, Storage), OS versions for app/DB, firewall and WAF throughput, load balancer specs, public IP count, required bandwidth/links (MPLS/P2P/ILL), redundancy, storage IOPS/block size, processor requirement, VPN needs, and daily data generation.",
  "DR (Disaster Recovery): Please confirm whether DR is required and its sizing (e.g., 100% or 50% of DC), expected RTO/RPO, number of DR drills per year, DR public IPs, and any DRM/tooling expectations.",
  "Concurrent users: Please confirm the number of concurrent users expected to access the setup at peak.",
  "Total users per day: Please provide the expected total unique users per day to size capacity and network appropriately.",
  "Milestones: Please list project milestones and dates (e.g., kickoff, MVP, UAT, go‑live).",
  "Delivery plan: Please share the phase‑wise delivery plan with dependencies, acceptance points, and transitions.",
  "Go‑live deadline: Please confirm the target go‑live date and any hard regulatory or business deadlines.",
  "Penalties: Please define penalties for delivery delays and SLA breaches, including rates, caps, and termination/forfeiture triggers.",
  "SLA (Service Level Agreement): Please specify availability targets, response and resolution times, and incident/security handling with measurement and reporting.",
  "EMD (Earnest Money Deposit): Please state the EMD amount, payment mode/timing, exemptions if any, and refund timelines/conditions.",
  "PBG (Performance Bank Guarantee): Please state the PBG value/percentage, submission timeline, validity, and forfeiture conditions.",
  "Budget by Client: Please share the sanctioned budget or acceptable range and any fiscal‑year constraints.",
  "Date of bid submission: Please confirm the bid submission deadline and required format.",
  "Pre‑bid date: Please confirm the pre‑bid meeting date/time, mode, and clarification process.",
  "Cloud requirements: Please detail cloud/DC requirements including OS and DB versions/editions, total VM count, load balancer needs, bandwidth, IPs, architecture, and required security components.",
  "Non‑functional requirements: Please specify performance/throughput/latency targets, availability objectives, storage IOPS/block size, and security expectations.",
  "Security audit requirements: Please specify scope, evidence, and frequency of audits, including audit trails for sensitive services.",
  "MFA: Please specify MFA use cases, deployment points, and the number of users who will avail MFA services.",
  "SSO: Please confirm SSO requirements, supported protocols/IdPs (e.g., SAML/OIDC), and access management expectations.",
  "SSL requirements: Please confirm SSL certificate types per domain (domain/organization/wildcard/EV) and quantities.",
  "Payment gateway: Please confirm whether payment gateway integration is required and specify providers, compliance, and payment methods.",
  "Aadhaar integration: Please confirm scope (Authentication/e‑KYC), AUA/KUA/ASA onboarding, API type (OTP/biometrics), encryption, and audit compliance per UIDAI specs.",
  "SMS integration: Please confirm SMS gateway requirement, expected volumes/throughput, and use cases (OTP/alerts/notifications).",
  "Email integration: Please confirm mailbox count, per‑mailbox size, SMTP service need, and total email IDs.",
  "On‑site resource requirements: Please specify onsite roles, counts, skills, duration, and working model.",
  "Handholding requirements: Please define scope and duration of post‑go‑live handholding/hypercare support.",
  "Training requirements: Please specify batch counts, mode (onsite/online), location, infra/bandwidth responsibility, and day‑wise schedule.",
  "Data migration: Please share migration scope including hypervisor details, VM count and nature, app/DB versions, total one‑time data size, wave plan, roles/responsibilities, and payment methodology.",
  "On‑site presence: Please confirm onsite presence expectations during implementation, cutover, and operations (residency/shift coverage).",
  "AMC: Please confirm AMC scope, duration, coverage (hardware/software), and response/resolution commitments.",
  "O&M: Please define O&M responsibilities, staffing, hours of coverage, and performance expectations post go‑live.",
  "Deliverables: Please list expected deliverables across phases (designs, configs, code, test plans/reports, runbooks, training, acceptance artifacts).",
  "Documentation: Please specify documentation standards, formats, and versioning for architecture, security, operations, and training.",
  "Multilingual support: Please confirm multilingual UI/content requirements and enumerate languages to be supported.",
  "KPIs: Please define KPIs and acceptance criteria used to evaluate project success and vendor performance.",
  "Success factors: Please list business and user‑centric success factors and how they will be measured.",
  "Analytics interactive dashboard: Please confirm analytics/dashboard scope, data sources, and reporting cadence.",
  "RBAC: Please define roles/permissions model, RBAC scope, and admin/governance requirements.",
  "Telemetry: Please specify monitoring, logging, and tracing requirements with retention and alerting.",
  "Existing technical stack: Please describe current environment, application flow, and components across DC/DR.",
  "Expected technical stack: Please outline preferred/target technologies, cloud services, and architecture standards.",
  "Chatbot requirements: Please confirm chatbot scope, channels, language/NLP needs, and integration points.",
  "IVR requirements: Please confirm IVR scope, call flows, telephony integration, and reporting needs.",
  "Audit types: Please define types of technical/security audits required (scope, evidence, timelines).",
  "Number of audits: Please specify number and frequency of audits per year during implementation and O&M.",
  "RTO: Please confirm target Recovery Time Objective for applications/services.",
  "RPO: Please confirm target Recovery Point Objective for data and transactions.",
  "Seismic zones: Please specify required DC/DR seismic zone compliance and siting constraints.",
  "Payment type: Please confirm payment type (fixed price, T&M, milestone‑based) and linked acceptance criteria.",
  "Pay‑out type: Please confirm payout schedule, invoicing cadence, and any retention/holdback terms.",
  "Backup required: Please confirm if backup is required and total backup space at DC/DR sites (GB/TB).",
  "Backup type/policy: Please specify backup policy (incremental/daily, weekly/monthly full), retention, media (disk‑to‑disk or disk‑to‑tape), and number of endpoints.",
  "Total size of data: Please provide current total data size and daily incremental size for migration, bandwidth, and backup sizing.",
  "Kindly share the details of VM's configuration (vCPU, RAM, Storage).",
  "Kindly confirm the OS version and edition along with App and DB servers.",
  "Kindly specify the operating system required per VM in the BoQ.",
  "In the computing requirements, OS details (Windows, RHEL, Ubuntu, CentOS) are not specified; kindly provide this information.",
  "Kindly provide the required firewall throughput so that an appropriate firewall can be selected.",
  "Kindly confirm the required WAF throughput so an appropriately sized WAF can be selected.",
  "Kindly provide database version and edition details (Community/Enterprise).",
  "Kindly confirm who will provision database licenses and who will manage the database (Client/partner/).",
  "Kindly share the total VM count for PostgreSQL Enterprise Version for licensing.",
  "Kindly specify the data archival space required in the DC/DR site (in GB/TB).",
  "Kindly specify the archival retention period.",
  "Kindly confirm required load balancer throughput and specifications.",
  "Kindly confirm whether a Global Load Balancer needs to be considered.",
  "Kindly confirm if VPN is required; if yes, provide approximate SSL VPN and IPsec VPN user counts for Windows and Linux.",
  "Kindly confirm the approximate number of VPN connections.",
  "Kindly mention how many public IPs are required.",
  "Please specify SSL certificate type per domain (domain/organization/wildcard/EV) and number of certificates.",
  "Please confirm the number of concurrent users who will access the setup.",
  "Kindly confirm any link terminating to the DC and its size; is it P2P/MPLS.",
  "Kindly confirm the required bandwidth for the DC site.",
  "Please specify the daily incremental data size needed for bandwidth and backup.",
  "Kindly specify which connectivity link is required (MPLS, P2P, ILL).",
  "Kindly specify the daily data incremental size for the replication link.",
  "Please confirm total data generated daily at the DC site, including log and flat files.",
  "Please clarify if there is redundancy at the DC level; if yes, share details.",
  "Kindly specify storage IOPS with block size.",
  "Kindly confirm whether the cores are physical or virtual.",
  "As per MeitY guidelines, CSPs need to provision a 2.4 GHz processor; kindly consider a 2.4 GHz processor.",
  "Kindly provide details about the three‑tier application architecture and the components of each tier.",
  "Kindly confirm the security components required at the DC site (Firewall, WAF, SSL, Antivirus+HIPS, SIEM, DDoS, IDS/IPS).",
  "Kindly confirm the network components required at the DC site (Load Balancer, Public IP, bandwidth, etc.).",
  "Kindly specify MFA use cases, deployment locations, and the count of users who will avail MFA.",
  "Total concurrent users at any point in time to size firewall throughput.",
  "Number of links that will be terminated at the site if MPLS is used.",
  "Mode of access for users to this setup: MPLS, VPN, or Internet.",
  "If MPLS is used, confirm the number of links that will terminate at the site.",
  "Required internet bandwidth for accessing the setup (e.g., 10 Mbps or 1 TB).",
  "If VPN, confirm whether it is Site‑to‑Site VPN or SSL VPN.",
  "Confirm OS version and edition and the latest patch level.",
  "Confirm database software version and edition and the latest patch level.",
  "Clarify who is responsible for providing the database licenses.",
  "Confirm whether database management services are to be provided.",
  "Confirm required backup space at the DC site in GB/TB (if yes).",
  "Confirm the backup policy (Incremental, Daily, Weekly Full).",
  "Verify the total number of endpoints that need to be backed up.",
  "Provide the current total size of the data.",
  "Confirm the backup data size to be provided per user.",
  "Specify the current backup software being used.",
  "Confirm the backup retention period.",
  "Confirm whether a load balancer is needed for application load distribution; if yes, specify the number required.",
  "Provide details on security components needed at DC and DR (firewall, WAF, antivirus, SIEM, DDoS, etc.).",
  "Confirm whether SSL certificates are required; if yes, confirm the certificate type (Alpha, Domain, Organization, Wildcard, Extended SSL).",
  "If mailboxes are to be provided, confirm the total number of mailboxes and the size of each mailbox.",
  "Confirm the total number of email IDs required.",
  "Confirm expected mailbox size per user (e.g., 1/2/5 GB).",
  "Confirm whether SMTP service is required per the email requirements.",
  "Confirm whether an SMS gateway is required for phone/SMS needs.",
  "DR sizing: Kindly share the sizing of the DR site.",
  "Kindly mention the expected RTO‑RPO.",
  "Confirm whether DC licenses can be used in DR and whether Software Assurance exists for DC DB and OS licenses.",
  "Share current DC architecture, application flow, and security services.",
  "Confirm whether DHCP is configured in the existing DC environment.",
  "Mention the total number of public IPs required at the DR site.",
  "Confirm whether DRM tool is required for all VMs or only DB servers.",
  "Confirm DRM tools required for monitoring applications to meet RTO‑RPO.",
  "Specify the daily increment of total data including database, log files, and flat files.",
  "As per the noted MeitY guideline, RTO is 15 minutes for transactions and RPO is 2 hours for data; confirm applicability.",
  "Kindly share the existing hypervisor details.",
  "Confirm applications and database details for DC and DR to be migrated wave‑wise, including app version, DB size, and instance.",
  "Share details of the physical servers and virtual servers.",
  "Confirm the count of total VMs to be migrated and the nature of each VM.",
  "Share total data size for one‑time migration and who will perform migration (Client or Vendor)",
  "Confirm exact data size to be migrated on new servers in MB/GB/TB.",
  "Mention if any additional data is to be migrated.",
  "Mention current software details.",
  "Describe the current environment and infrastructure for the applications and data.",
  "Clarify the nature and type of migration support expected from the bidder for moving from existing infra to cloud.",
  "As migration services have associated costs, confirm the payment methodology for these migration services."
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
