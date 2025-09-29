
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  MessageCircle,
  Sparkles,
  FileUp,
  BrainCircuit,
  FileText,
  FileSpreadsheet // Added FileSpreadsheet icon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Memoized feature card component for better performance
const FeatureCard = React.memo(({ icon: Icon, title, description, gradient }) => (
  <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
    <CardContent className="p-6 text-center">
      <div className={`w-12 h-12 ${gradient} rounded-xl flex items-center justify-center mx-auto mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </CardContent>
  </Card>
));

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative px-6 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bc74ec43e5ff59d952cca6/8d92656b2_image.png"
                alt="ESDS Logo"
                className="w-16 h-16 object-contain bg-white/10 rounded-2xl p-2 backdrop-blur-sm"
                loading="lazy"
                decoding="async"
                fetchPriority="high"
              />
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2">
                  Presales Agentic <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">AI</span>
                </h1>
                <p className="text-blue-100 text-lg md:text-xl font-medium">
                  Intelligent Document Analysis for the Presales & Sales Teams
                </p>
              </div>
            </div>
            <p className="text-blue-200 text-lg mb-10 max-w-2xl mx-auto">
              Leverage advanced AI to analyze RFP and technical documents, extract key insights, and accelerate your pre-sales workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl("RFPChatBot")} prefetch="intent">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 shadow-xl w-full sm:w-auto text-lg px-8 py-6 rounded-full">
                  <Sparkles className="w-6 h-6 mr-3" />
                  Start RFP Agentic Chat Bot
                </Button>
              </Link>
              <Link to={createPageUrl("RFPAnalysis")} prefetch="intent">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 shadow-xl w-full sm:w-auto text-lg px-8 py-6 rounded-full">
                  <FileText className="w-6 h-6 mr-3" />
                  RFP Quick Analysis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Changed grid-cols-3 to grid-cols-4 and added new FeatureCard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 md:-mt-16 relative z-10">
            <FeatureCard
              icon={FileUp}
              title="Upload Documents"
              description="Easily upload RFPs, PDFs, Word, and Excel files for analysis."
              gradient="bg-gradient-to-r from-blue-500 to-indigo-500"
            />
            <FeatureCard
              icon={BrainCircuit}
              title="AI-Powered Analysis"
              description="Get instant insights and extract key information from RFP documents."
              gradient="bg-gradient-to-r from-purple-500 to-pink-500"
            />
            <FeatureCard
              icon={MessageCircle}
              title="Interactive Chat"
              description="Ask questions and get detailed answers from uploaded documents."
              gradient="bg-gradient-to-r from-emerald-500 to-teal-500"
            />
            {/* Updated FeatureCard for Synopsis Management */}
            <FeatureCard
              icon={FileSpreadsheet}
              title="Synopsis"
              description="Create and manage tender synopsis with document"
              gradient="bg-gradient-to-r from-orange-500 to-red-500"
            />
          </div>

          <div className="text-center">
            <Card className="inline-block bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-3 text-xl font-bold text-slate-900">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  Choose Your Analysis Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Updated description text */}
                <p className="text-slate-600 mb-6 max-w-lg mx-auto">
                  Use our interactive Agentic ChatBot for detailed conversations, Quick Analysis for structured evaluation, or Synopsis for comprehensive tender management.
                </p>
                {/* Changed button layout to grid and added new Synopsis button */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 justify-center">
                  <Link to={createPageUrl("RFPChatBot")} prefetch="intent">
                    <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg w-full">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Agentic Chat Bot
                    </Button>
                  </Link>
                  <Link to={createPageUrl("RFPAnalysis")} prefetch="intent">
                    <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg w-full">
                      <FileText className="w-5 h-5 mr-2" />
                      Quick Analysis
                    </Button>
                  </Link>
                  {/* New Link and Button for Synopsis */}
                  <Link to={createPageUrl("Synopsis")} prefetch="intent">
                    <Button size="lg" className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg w-full">
                      <FileSpreadsheet className="w-5 h-5 mr-2" />
                      Synopsis
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
