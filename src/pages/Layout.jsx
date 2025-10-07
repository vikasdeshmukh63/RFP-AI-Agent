

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart3, MessageCircle, FileText, FileSpreadsheet, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Memoized navigation items - added Synopsis
const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: BarChart3,
  },
  {
    title: "RFP Agentic Chat Bot",
    url: createPageUrl("RFPChatBot"),
    icon: MessageCircle,
  },
  {
    title: "RFP Analysis",
    url: createPageUrl("RFPAnalysis"),
    icon: FileText,
  },
  {
    title: "Synopsis",
    url: createPageUrl("Synopsis"),
    icon: FileSpreadsheet,
  },
];

// Memoized navigation item component
const NavigationItem = React.memo(({ item, isActive }) => (
  <SidebarMenuItem>
    <SidebarMenuButton 
      asChild 
      className={`hover:bg-blue-50/80 hover:text-blue-700 transition-all duration-300 rounded-xl mb-2 group ${
        isActive
          ? 'esds-gradient text-white shadow-lg border-0 hover:text-white' 
          : 'text-slate-700'
      }`}
    >
      <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
        <item.icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
        <span className="font-medium">{item.title}</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
));

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      // ProtectedRoute will automatically redirect to login when user becomes null
    }
  };

  return (
    <SidebarProvider>
      <style>
        {`
          :root {
            --primary: 220 100% 50%;
            --primary-foreground: 0 0% 98%;
            --secondary: 220 14.3% 95.9%;
            --secondary-foreground: 220 8.9% 46.1%;
            --muted: 220 14.3% 95.9%;
            --muted-foreground: 220 8.9% 46.1%;
            --accent: 220 14.3% 95.9%;
            --accent-foreground: 220 8.9% 46.1%;
            --border: 220 13% 91%;
            --input: 220 13% 91%;
            --ring: 220 100% 50%;
            --radius: 0.75rem;
          }
          
          .esds-gradient {
            background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
          }
          
          .esds-text {
            background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .glass-morphism {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          }

          /* Enhanced performance optimizations */
          * {
            box-sizing: border-box;
          }
          
          body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          .sidebar-optimized {
            will-change: transform;
            transform: translateZ(0);
          }
          
          .main-content {
            contain: layout style paint;
            transform: translateZ(0);
          }

          /* Optimize image loading */
          img {
            will-change: transform;
          }

          /* Optimize transitions */
          .transition-all {
            transition-property: all;
          }

          /* Performance optimizations */
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Sidebar className="border-r border-slate-200/60 glass-morphism sidebar-optimized">
          <SidebarHeader className="border-b border-slate-200/60 p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bc74ec43e5ff59d952cca6/8d92656b2_image.png"
                  alt="ESDS Logo"
                  className="w-12 h-12 object-contain"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
              <div>
                <h2 className="font-bold text-xl">
                  <span className="text-blue-800">Agentic</span> <span className="esds-text">AI</span>
                </h2>
                <p className="text-xs text-slate-600 font-medium">Presales & Sales Teams</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <NavigationItem 
                      key={item.title} 
                      item={item} 
                      isActive={location.pathname.startsWith(item.url)}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200/60 p-4 space-y-4">
            {/* User Info and Logout */}
            {user && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                >
                  <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            )}
            
            {/* ESDS Branding */}
            <div className="text-center space-y-2 pt-2 border-t border-slate-200/60">
              <div className="flex justify-center">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bc74ec43e5ff59d952cca6/8d92656b2_image.png"
                  alt="ESDS Logo"
                  className="w-6 h-6 object-contain opacity-80"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Powered by</p>
                <p className="text-xs font-bold">
                  <span className="text-blue-800">ESDS</span>
                  <span className="esds-text"> Software Solution</span>
                </p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col main-content">
          <header className="glass-morphism border-b border-slate-200/60 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-3">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bc74ec43e5ff59d952cca6/8d92656b2_image.png"
                  alt="ESDS Logo"
                  className="w-8 h-8 object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <h1 className="text-xl font-bold">
                  <span className="text-blue-800">Agentic</span> <span className="esds-text">AI Portal</span>
                </h1>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

