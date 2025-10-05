
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from "react";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Bot,
  User,
  MessageCircle,
  Loader2,
  RefreshCw,
  Trash2,
  FileText,
  File,
  Paperclip,
  X,
  Maximize,
  Minimize
} from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Optimized MessageItem with markdown support
const MessageItem = React.memo(({ message }) => {
  const formattedTime = useMemo(() => {
    return message.created_date ? format(new Date(message.created_date), "HH:mm") : '';
  }, [message.created_date]);

  const messageStyle = useMemo(() => ({
    user: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white ml-auto",
    ai: "bg-white border border-slate-200 text-slate-900 shadow-sm"
  }), []);

  // Check if message contains markdown patterns
  const hasMarkdown = useMemo(() => {
    if (message.sender !== 'ai') return false;
    const markdownPatterns = [
      /\*\*.*?\*\*/,  // Bold
      /\*.*?\*/,      // Italic
      /`.*?`/,        // Inline code
      /```[\s\S]*?```/, // Code blocks
      /^#{1,6}\s/m,   // Headers
      /^\*\s/m,       // Bullet lists
      /^\d+\.\s/m     // Numbered lists
    ];
    return markdownPatterns.some(pattern => pattern.test(message.message));
  }, [message.message, message.sender]);

  return (
    <div className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
      {message.sender === "ai" && (
        <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] p-4 rounded-2xl ${messageStyle[message.sender]}`} style={{ willChange: 'transform, opacity' }}>
        {message.sender === 'ai' && hasMarkdown ? (
          <div className="chat-markdown">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
            >
              {message.message}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">{message.message}</p>
        )}
        {message.file_name && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 rounded-lg">
            <Paperclip className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-600">{message.file_name}</span>
          </div>
        )}
        {formattedTime && (
          <p className="text-xs mt-2 opacity-70">{formattedTime}</p>
        )}
      </div>
      {message.sender === "user" && (
        <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
});

// Optimized DocumentItem with better performance
const DocumentItem = React.memo(({ doc, index, onRemove, uploadedFrom }) => {
  const fileIcon = useMemo(() => {
    if (doc.type?.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
    if (doc.type?.includes("word") || doc.type?.includes("document")) return <File className="w-4 h-4 text-blue-500" />;
    if (doc.type?.includes("excel") || doc.type?.includes("sheet")) return <File className="w-4 h-4 text-green-500" />;
    if (doc.type?.startsWith("image")) return <File className="w-4 h-4 text-purple-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
  }, [doc.type]);

  return (
    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
      {fileIcon}
      <span className="text-sm text-emerald-800 font-medium">{doc.name}</span>
      {uploadedFrom && (
        <Badge variant="outline" className="text-xs">
          {uploadedFrom}
        </Badge>
      )}
      <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="h-4 w-4 p-0 text-emerald-600 hover:text-emerald-800">
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
});

// Loading skeleton component
const LoadingSkeleton = React.memo(() => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex gap-3">
        <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
));

export default function RFPChatBot() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Optimized scroll with requestAnimationFrame
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, []);

  // Debounced message loading with caching
  const loadMessages = useCallback(async () => {
    if (!sessionId || !isInitialized) return;
    
    try {
      const { messages: data } = await apiClient.getMessages(sessionId);
      setMessages(prev => {
        const newData = data || [];
        if (prev.length !== newData.length || prev.some((msg, i) => msg.id !== newData[i]?.id)) {
          return newData;
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, [sessionId, isInitialized]);

  // Enhanced shared documents loading with Synopsis sync
  const loadSharedDocuments = useCallback(async () => {
    if (!sessionId || !isInitialized) return;
    
    try {
      const { documents: docs } = await apiClient.getDocuments({ 
        limit: 20, 
        sort: '-created_at' 
      });
      setSharedDocuments(prev => {
        const newDocs = docs || [];
        if (prev.length !== newDocs.length || prev.some((doc, i) => doc.id !== newDocs[i]?.id)) {
          setUploadedDocuments(newDocs);
          return newDocs;
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to load shared documents:", error);
    }
  }, [sessionId, isInitialized]);

  // Enhanced file upload with Synopsis sync
  const handleFileUpload = useCallback(async (file) => {
    setIsUploading(true);
    let progressValue = 0;
    
    const progressInterval = setInterval(() => {
      progressValue = Math.min(85, progressValue + 10);
      setUploadProgress(progressValue);
    }, 150);

    try {
      const uploadResult = await apiClient.uploadFile(file, "chatbot");
      clearInterval(progressInterval);
      setUploadProgress(95);

      if (!uploadResult?.file_url) {
        throw new Error("File upload failed - no URL returned");
      }

      const createdDoc = uploadResult.document;
      
      // Batch state updates
      setUploadedDocuments(prev => [createdDoc, ...prev]);
      setSharedDocuments(prev => [createdDoc, ...prev]);
      setUploadProgress(100);

      const systemMsg = await apiClient.sendMessage(
        sessionId,
        `📄 Document "${file.name}" uploaded successfully and synced across all modules (RFP Analysis, Synopsis). You can now ask questions about its content.`,
        "ai",
        uploadResult.file_url,
        file.name
      );

      await loadMessages();

    } catch (error) {
      console.error("Document upload failed:", error);
      const errorMsg = `❌ Failed to upload "${file.name}". Please try again or use a smaller file.`;
      
      await apiClient.sendMessage(sessionId, errorMsg, "ai");
      await loadMessages();
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [sessionId, loadMessages]);

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
      apiClient.sendMessage(sessionId, "❌ Please upload PDF, Word, Excel, or image files only.", "ai")
        .then(() => loadMessages());
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) { // Changed from 10MB to 25MB
      apiClient.sendMessage(sessionId, "❌ File size must be less than 25MB. Please try a smaller file.", "ai")
        .then(() => loadMessages());
      return;
    }

    handleFileUpload(selectedFile);
  }, [handleFileUpload, sessionId, loadMessages]);

  // Optimized document removal
  const removeDocument = useCallback(async (index) => {
    const docToRemove = sharedDocuments[index]; 
    if (docToRemove?.id) { 
      try {
        await apiClient.deleteDocument(docToRemove.id);
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
    
    // Batch state updates
    const newDocs = sharedDocuments.filter((_, i) => i !== index);
    setUploadedDocuments(newDocs);
    setSharedDocuments(newDocs);
  }, [sharedDocuments]);

  // Optimized message sending
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !sessionId || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    try {
      // Create or get session first
      await apiClient.createSession(sessionId, 'RFP Chat');

      // Send user message and get AI response automatically
      const fileUrl = sharedDocuments.length > 0 ? sharedDocuments[0].url : null;
      const fileName = sharedDocuments.length > 0 ? sharedDocuments[0].name : null;
      
      console.log('📤 Sending message with document:', { fileUrl, fileName, documentsCount: sharedDocuments.length });
      
      const result = await apiClient.sendMessage(
        sessionId, 
        userMessage, 
        'user',
        fileUrl,
        fileName
      );
      
    } catch (error) {
      console.error("AI response failed:", error);
      await apiClient.sendMessage(
        sessionId,
        "❌ I apologize, but I encountered an error processing your request. This could be due to:\n\n• Network connectivity issues\n• The document being too complex to process\n• Temporary service unavailability\n\nPlease try again, or try with a different document.",
        "ai"
      );
    } finally {
      setIsLoading(false);
      await loadMessages();
    }
  }, [inputMessage, sessionId, sharedDocuments, loadMessages, isLoading]);

  // Optimized key press handler
  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Optimized chat actions
  const startNewChat = useCallback(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setMessages([]);
    loadSharedDocuments(); 
  }, [loadSharedDocuments]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setInputMessage("");
    startNewChat();
  }, [startNewChat]);

  // Initialize session once
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setIsInitialized(true);
  }, []);

  // Load data on initialization - batch loading
  useEffect(() => {
    if (isInitialized && sessionId) {
      Promise.all([loadMessages(), loadSharedDocuments()]).catch(console.error);
    }
  }, [isInitialized, sessionId, loadMessages, loadSharedDocuments]);

  // Optimized scroll effect with debouncing
  useEffect(() => {
    if (messages.length > 0) {
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, scrollToBottom]);

  // Memoized document list
  const documentList = useMemo(() => {
    return sharedDocuments.map((doc, index) => (
      <DocumentItem
        key={`${doc.id || doc.url}-${index}`}
        doc={doc}
        index={index}
        onRemove={removeDocument}
        uploadedFrom={doc.uploaded_from}
      />
    ));
  }, [sharedDocuments, removeDocument]);

  // Memoized message list
  const messageList = useMemo(() => {
    return messages.map((message) => (
      <MessageItem 
        key={message.id || `${message.session_id}-${message.created_date}-${message.message.slice(0, 50)}`} 
        message={message} 
      />
    ));
  }, [messages]);

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className={`${isFullScreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'} flex flex-col`}>
      <Card className={`bg-white/80 backdrop-blur-sm border-0 shadow-xl flex flex-col flex-1 ${isFullScreen ? 'rounded-none' : ''}`}>
        <CardHeader className="pb-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <span>RFP Agentic Chat Bot</span>
                <Badge variant="secondary" className="ml-3 text-xs">
                  Document Analysis
                </Badge>
              </div>
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="text-slate-600 hover:text-slate-800"
              >
                {isFullScreen ? <Minimize className="w-4 h-4 mr-1" /> : <Maximize className="w-4 h-4 mr-1" />}
                {isFullScreen ? "Exit" : "Fullscreen"}
              </Button>
              <Button variant="outline" size="sm" onClick={clearChat} className="text-slate-600 hover:text-slate-800">
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={startNewChat} className="text-slate-600 hover:text-slate-800">
                <RefreshCw className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
          </div>
          <p className="text-slate-600 mt-2">
            Your AI assistant for analyzing RFP and technical documents.
          </p>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Welcome to the RFP Agentic Chat Bot</h3>
              <p className="mb-4 max-w-md mx-auto">
                Upload documents using the attachment button below or start asking questions directly.
              </p>
            </div>
          )}

          {sharedDocuments.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">📚 Available Documents (Synced):</p>
              <div className="flex flex-wrap gap-2">
                {documentList}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="text-center">
                <Loader2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-slate-600 font-medium mb-2">Uploading document...</p>
                <div className="w-48 mx-auto">
                  <div className="bg-emerald-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-200" style={{width: `${uploadProgress}%`}}></div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">{uploadProgress}% complete</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messageList}
          </div>

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span className="text-slate-600">AI is analyzing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="p-6 border-t border-slate-200 bg-slate-50/50">
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.bmp,.tiff"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="shrink-0 hover:bg-emerald-50 hover:border-emerald-300"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask questions about uploaded documents..."
              disabled={isLoading}
              className="flex-1 border-slate-200 focus:border-emerald-500 bg-white"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || isLoading} 
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 text-center mt-2">
            Powered by ESDS Software Solution - Presales Software Division
          </p>
        </div>
      </Card>
    </div>
  );
}
