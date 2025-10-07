import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  File, 
  X, 
  Loader2,
  Paperclip
} from "lucide-react";

export default function DocumentUpload({ onFileUpload, isUploading, uploadProgress }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => 
        file.type === "application/pdf" || 
        file.type === "application/msword" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/vnd.ms-excel" ||
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type.startsWith("image/")
    );

    if (droppedFiles.length === 0) {
      alert("Please upload PDF, Word, Excel, or image files only");
      return;
    }

    onFileUpload(droppedFiles[0]);
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", 
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.type.startsWith("image/")) {
      alert("Please upload PDF, Word, Excel, or image files only");
      return;
    }

    onFileUpload(selectedFile);
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes("pdf")) return <FileText className="w-6 h-6 text-red-500" />;
    if (fileType?.includes("word")) return <File className="w-6 h-6 text-blue-500" />;
    if (fileType?.includes("excel") || fileType?.includes("sheet")) return <File className="w-6 h-6 text-green-500" />;
    if (fileType?.startsWith("image")) return <File className="w-6 h-6 text-purple-500" />;
    return <File className="w-6 h-6 text-gray-500" />;
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={handleFileInput}
            className="hidden"
            id="document-upload"
            disabled={isUploading}
          />
          
          <label
            htmlFor="document-upload"
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
              dragActive 
                ? "border-emerald-400 bg-emerald-50" 
                : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50"
            } ${isUploading ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {isUploading ? (
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-slate-600 font-medium mb-2">Processing document...</p>
                <div className="w-48 mx-auto">
                  <Progress value={uploadProgress} className="h-2" />
                </div>
                <p className="text-xs text-slate-500 mt-1">{uploadProgress}% complete</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Paperclip className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm text-slate-700 font-medium mb-1">
                  Upload Document for Analysis
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Drag & drop or click to upload
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> PDF
                  </span>
                  <span className="flex items-center gap-1">
                    <File className="w-3 h-3" /> Word
                  </span>
                  <span className="flex items-center gap-1">
                    <File className="w-3 h-3" /> Excel
                  </span>
                  <span className="flex items-center gap-1">
                    <File className="w-3 h-3" /> Images
                  </span>
                </div>
              </div>
            )}
          </label>
        </div>
      </CardContent>
    </Card>
  );
}