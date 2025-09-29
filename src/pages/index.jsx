import Layout from "./Layout.jsx";
import Dashboard from "./Dashboard";
import RFPChatBot from "./RFPChatBot";
import RFPAnalysis from "./RFPAnalysis";
import Synopsis from "./Synopsis";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Dashboard: Dashboard,
    RFPChatBot: RFPChatBot,
    RFPAnalysis: RFPAnalysis,
    Synopsis: Synopsis,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Dashboard />} />
                <Route path="/Dashboard" element={<Dashboard />} />
                <Route path="/RFPChatBot" element={<RFPChatBot />} />
                <Route path="/RFPAnalysis" element={<RFPAnalysis />} />
                <Route path="/Synopsis" element={<Synopsis />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <ProtectedRoute>
                <PagesContent />
            </ProtectedRoute>
        </Router>
    );
}