import express from 'express';
import { UploadedDocument, AnalysisResult } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import openRouterService from '../services/openrouter.js';
import documentService from '../services/documentParser.js';

const router = express.Router();

// Predefined RFP analysis questions (comprehensive list - 131 questions)
const PREDEFINED_QUESTIONS = [
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

// Quick RFP Analysis
router.post('/rfp-quick-analysis', authenticateToken, async (req, res) => {
  try {
    const { document_id, custom_questions } = req.body;

    if (!document_id) {
      return res.status(400).json({ error: 'document_id is required' });
    }

    // Get document
    const document = await UploadedDocument.findOne({
      where: { 
        id: document_id,
        user_id: req.user.id 
      },
      attributes: ['file_path', 'mime_type', 'original_name']
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { file_path, mime_type, original_name } = document;

    // Use custom questions if provided, otherwise use predefined ones
    const allQuestions = custom_questions && Array.isArray(custom_questions) 
      ? custom_questions 
      : PREDEFINED_QUESTIONS;

    console.log(`📄 Performing quick RFP analysis: ${original_name} (${allQuestions.length} questions)`);
    
    // Prepare document for AI
    const preparedDoc = await documentService.prepareDocumentForAI(file_path, mime_type);

    // Split questions into smaller chunks to avoid JSON parsing issues
    const CHUNK_SIZE = 20; // Process 20 questions at a time
    const questionChunks = [];
    for (let i = 0; i < allQuestions.length; i += CHUNK_SIZE) {
      questionChunks.push(allQuestions.slice(i, i + CHUNK_SIZE));
    }

    console.log(`📊 Processing ${allQuestions.length} questions in ${questionChunks.length} chunks of ${CHUNK_SIZE}`);

    let completeResults = {};

    // Process each chunk separately
    for (let chunkIndex = 0; chunkIndex < questionChunks.length; chunkIndex++) {
      const questions = questionChunks[chunkIndex];
      console.log(`🔄 Processing chunk ${chunkIndex + 1}/${questionChunks.length} (${questions.length} questions)`);

      try {

        // Create optimized prompt for this chunk
        const prompt = `As an expert RFP analyzer for ESDS, analyze the provided document and extract answers for the following ${questions.length} questions.

**Instructions:**
- Carefully read through the entire document to find relevant information for each question.
- Look for information that may be described differently but relates to the question.
- For infrastructure questions, look for sections on technical requirements, system architecture, hosting, deployment.
- Include source citations like (Page X, Section Y) when possible.
- If information is not explicitly stated but can be inferred, mention "Inferred from [context]".
- Only respond with "Not specified in RFP" if truly not available.
- Return a valid JSON object with questions as keys and answers as values.

**Questions:**
${questions.join('\n')}`;

        const schema = {
          type: "object",
          properties: questions.reduce((acc, question) => {
            acc[question] = { type: "string" };
            return acc;
          }, {}),
          additionalProperties: false
        };

        let chunkAnalysis;
        try {
          chunkAnalysis = await openRouterService.invokeLLM({
            prompt,
            documents: [preparedDoc],
            responseJsonSchema: schema
          });
        } catch (visionError) {
          console.warn(`Chunk ${chunkIndex + 1} vision-based analysis failed, trying text-only:`, visionError.message);
          
          const textOnlyPrompt = `Analyze RFP and answer these ${questions.length} questions based on typical software development RFP patterns:

${questions.join('\n')}

Return valid JSON with questions as keys and answers as values.`;

          chunkAnalysis = await openRouterService.invokeLLM({
            prompt: textOnlyPrompt,
            responseJsonSchema: schema
          });
        }

        // Process chunk results
        if (chunkAnalysis && typeof chunkAnalysis === 'object' && !chunkAnalysis.error) {
          // Successful chunk analysis
          questions.forEach(question => {
            completeResults[question] = chunkAnalysis[question] || "Not specified in RFP";
          });
          console.log(`✅ Chunk ${chunkIndex + 1} completed successfully`);
        } else {
          // Chunk failed
          console.warn(`❌ Chunk ${chunkIndex + 1} failed:`, chunkAnalysis?.error || 'Unknown error');
          questions.forEach(question => {
            completeResults[question] = "Analysis failed for this question. Please try again.";
          });
        }

      } catch (chunkError) {
        console.error(`❌ Chunk ${chunkIndex + 1} error:`, chunkError);
        questions.forEach(question => {
          completeResults[question] = "Analysis error occurred. Please try again.";
        });
      }

      // Add small delay between chunks to avoid rate limiting
      if (chunkIndex < questionChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`🎉 Analysis completed: ${Object.keys(completeResults).length} questions processed`);

    // Save analysis results
    await AnalysisResult.create({
      document_id: document_id,
      analysis_type: 'quick_rfp_analysis',
      questions: JSON.stringify(allQuestions),
      answers: JSON.stringify(completeResults),
      user_id: req.user.id
    });

    res.json({
      message: 'Quick RFP analysis completed successfully',
      analysis: completeResults,
      document: {
        id: document_id,
        name: original_name,
        type: mime_type
      },
      questions_analyzed: allQuestions.length,
      chunks_processed: questionChunks.length
    });

  } catch (error) {
    console.error('Quick RFP analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to perform quick RFP analysis',
      details: error.message 
    });
  }
});

// Custom document analysis with user-defined questions
router.post('/custom-analysis', authenticateToken, async (req, res) => {
  try {
    const { document_id, questions, analysis_name } = req.body;

    if (!document_id || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'document_id and questions array are required' });
    }

    if (questions.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 questions allowed per analysis' });
    }

    // Get document
    const document = await UploadedDocument.findOne({
      where: { 
        id: document_id,
        user_id: req.user.id 
      },
      attributes: ['file_path', 'mime_type', 'original_name']
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { file_path, mime_type, original_name } = document;

    console.log(`📄 Performing custom analysis: ${original_name}`);
    
    // Prepare document for AI
    const preparedDoc = await documentService.prepareDocumentForAI(file_path, mime_type);

    // Analyze with AI
    const analysis = await openRouterService.analyzeDocument([preparedDoc], questions);

    // Save analysis results
    await AnalysisResult.create({
      document_id: document_id,
      analysis_type: analysis_name || 'custom_analysis',
      questions: JSON.stringify(questions),
      answers: JSON.stringify(analysis),
      user_id: req.user.id
    });

    res.json({
      message: 'Custom analysis completed successfully',
      analysis,
      document: {
        id: document_id,
        name: original_name,
        type: mime_type
      },
      questions_analyzed: questions.length
    });

  } catch (error) {
    console.error('Custom analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to perform custom analysis',
      details: error.message 
    });
  }
});

// Get predefined questions
router.get('/predefined-questions', (req, res) => {
  res.json({
    questions: PREDEFINED_QUESTIONS,
    total: PREDEFINED_QUESTIONS.length,
    categories: {
      'Infrastructure': ['DC (Data Center)', 'DR (Disaster Recovery)', 'Cloud requirements'],
      'Users & Performance': ['Concurrent users', 'Total users per day', 'Non-functional requirements (Performance, Uptime, Security)'],
      'Timeline': ['Milestones', 'Delivery plan', 'Go Live deadline', 'Date of bid submission', 'Prebid date'],
      'Financial': ['Penalties', 'EMD (Earnest Money Deposit)', 'PBG (Performance Bank Guarantee)', 'Budget by Client'],
      'Security': ['Security Audit requirements', 'MFA (Multi-Factor Authentication)', 'SSO (Single Sign-On)', 'SSL requirements'],
      'Integration': ['Payment Gateway', 'Aadhaar integration', 'SMS integration', 'Email integration'],
      'Support': ['On Site Resource requirements', 'Handholding requirements', 'Training requirements', 'AMC (Annual Maintenance Contract)'],
      'Technical': ['Existing Technical Stack', 'Expected Technical Stack', 'Chatbot requirements', 'IVR (Interactive Voice Response)']
    }
  });
});

// Get analysis results by ID
router.get('/results/:id', authenticateToken, async (req, res) => {
  try {
    const result = await AnalysisResult.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      },
      include: [{
        model: UploadedDocument,
        as: 'document',
        attributes: ['id', 'original_name', 'mime_type', 'size_bytes']
      }]
    });

    if (!result) {
      return res.status(404).json({ error: 'Analysis result not found' });
    }

    res.json({ analysis: result.toJSON() });

  } catch (error) {
    console.error('Analysis result fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis result' });
  }
});

// Get all analysis results for user
router.get('/results', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, analysis_type } = req.query;

    const whereClause = { user_id: req.user.id };
    if (analysis_type) {
      whereClause.analysis_type = analysis_type;
    }

    const { count, rows: analyses } = await AnalysisResult.findAndCountAll({
      where: whereClause,
      include: [{
        model: UploadedDocument,
        as: 'document',
        attributes: ['id', 'original_name', 'mime_type']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      analyses: analyses.map(a => a.toJSON()),
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + analyses.length < count
      }
    });

  } catch (error) {
    console.error('Analysis results fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis results' });
  }
});

// Delete analysis result
router.delete('/results/:id', authenticateToken, async (req, res) => {
  try {
    const result = await AnalysisResult.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });

    if (!result) {
      return res.status(404).json({ error: 'Analysis result not found' });
    }

    await result.destroy();

    res.json({ message: 'Analysis result deleted successfully' });

  } catch (error) {
    console.error('Analysis result deletion error:', error);
    res.status(500).json({ error: 'Failed to delete analysis result' });
  }
});

// Compare multiple documents
router.post('/compare-documents', authenticateToken, async (req, res) => {
  try {
    const { document_ids, questions } = req.body;

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 document IDs are required for comparison' });
    }

    if (document_ids.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 documents can be compared at once' });
    }

    const questionsToUse = questions && Array.isArray(questions) ? questions : PREDEFINED_QUESTIONS.slice(0, 20);

    const comparisons = [];

    for (const docId of document_ids) {
      // Get document
      const document = await UploadedDocument.findOne({
        where: { 
          id: docId,
          user_id: req.user.id 
        },
        attributes: ['file_path', 'mime_type', 'original_name']
      });

      if (!document) {
        continue; // Skip missing documents
      }

      const { file_path, mime_type, original_name } = document;

      try {
        // Prepare and analyze document
        const preparedDoc = await documentService.prepareDocumentForAI(file_path, mime_type);
        const analysis = await openRouterService.analyzeDocument([preparedDoc], questionsToUse);

        comparisons.push({
          document_id: docId,
          document_name: original_name,
          analysis
        });

      } catch (docError) {
        console.error(`Error analyzing document ${docId}:`, docError);
        comparisons.push({
          document_id: docId,
          document_name: original_name,
          error: docError.message
        });
      }
    }

    res.json({
      message: 'Document comparison completed',
      comparisons,
      questions: questionsToUse,
      documents_analyzed: comparisons.filter(c => !c.error).length,
      documents_failed: comparisons.filter(c => c.error).length
    });

  } catch (error) {
    console.error('Document comparison error:', error);
    res.status(500).json({ 
      error: 'Failed to compare documents',
      details: error.message 
    });
  }
});

// Test OpenRouter connection
router.get('/test-ai', authenticateToken, async (req, res) => {
  try {
    const testResponse = await openRouterService.invokeLLM({
      prompt: 'Hello, please respond with "AI connection successful" to confirm the connection is working.'
    });

    res.json({
      message: 'OpenRouter connection test successful',
      response: testResponse
    });

  } catch (error) {
    console.error('OpenRouter test failed:', error);
    res.status(500).json({ 
      error: 'OpenRouter connection test failed',
      details: error.message 
    });
  }
});

// Get analysis statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await AnalysisResult.getStatsByUser(req.user.id);

    const dailyActivity = await AnalysisResult.findAll({
      where: { user_id: req.user.id },
      attributes: [
        [AnalysisResult.sequelize.fn('DATE_TRUNC', 'day', AnalysisResult.sequelize.col('created_at')), 'analysis_date'],
        [AnalysisResult.sequelize.fn('COUNT', AnalysisResult.sequelize.col('id')), 'daily_count']
      ],
      group: [AnalysisResult.sequelize.fn('DATE_TRUNC', 'day', AnalysisResult.sequelize.col('created_at'))],
      order: [[AnalysisResult.sequelize.fn('DATE_TRUNC', 'day', AnalysisResult.sequelize.col('created_at')), 'DESC']],
      limit: 30,
      raw: true
    });

    res.json({
      overall: stats.overall,
      by_type: stats.by_type,
      daily_activity: dailyActivity
    });

  } catch (error) {
    console.error('Analysis stats error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis statistics' });
  }
});

export default router;