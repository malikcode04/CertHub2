
import React, { useState } from 'react';
import NotificationCenter from './NotificationCenter';
import { User, UserRole } from '../types';
import {
  LayoutDashboard,
  FileCheck,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ShieldCheck,
  FileText,
  UploadCloud,
  History,
  BarChart3,
  Award,
  Layers
} from 'lucide-react';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface NavItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ id, label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, activeTab, setActiveTab }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.jpg" alt="CertHub" className="w-10 h-10 rounded-full object-cover" />
          <h1 className="text-2xl font-black tracking-tight text-white">CertHub</h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <NavItem id="dashboard" label="Dashboard" icon={<LayoutDashboard size={20} />} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
        <NavItem id="certificates" label="Certificates" icon={<Award size={20} />} active={activeTab === 'certificates'} onClick={() => { setActiveTab('certificates'); setIsMobileMenuOpen(false); }} />
        <NavItem id="analytics" label="Analytics" icon={<BarChart3 size={20} />} active={activeTab === 'analytics'} onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }} />

        {user.role === UserRole.ADMIN && (
          <>
            <div className="pt-4 pb-2 px-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Administration</p>
            </div>
            <NavItem id="platforms" label="Platform Management" icon={<Layers size={20} />} active={activeTab === 'platforms'} onClick={() => { setActiveTab('platforms'); setIsMobileMenuOpen(false); }} />
            <NavItem id="classes" label="Class Management" icon={<Users size={20} />} active={activeTab === 'classes'} onClick={() => { setActiveTab('classes'); setIsMobileMenuOpen(false); }} />
            <NavItem id="users" label="User Management" icon={<Users size={20} />} active={activeTab === 'users'} onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} />
            <NavItem id="bulk-import" label="Bulk Import" icon={<UploadCloud size={20} />} active={activeTab === 'bulk-import'} onClick={() => { setActiveTab('bulk-import'); setIsMobileMenuOpen(false); }} />
            <NavItem id="audit-logs" label="Audit Logs" icon={<History size={20} />} active={activeTab === 'audit-logs'} onClick={() => { setActiveTab('audit-logs'); setIsMobileMenuOpen(false); }} />
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden lg:flex border-r border-slate-800 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-slate-900 text-white flex flex-col z-50 transform transition-transform duration-300 lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-6 right-4 lg:hidden">
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>

            <div className="flex lg:hidden items-center gap-2">
              <img src="/logo.jpg" alt="CertHub" className="w-8 h-8 rounded-full object-cover" />
              <span className="text-xl font-black tracking-tight text-slate-900">CertHub</span>
            </div>


          </div>


          <div className="flex items-center gap-3 sm:gap-6">
            <NotificationCenter />

            <div className="hidden xs:block h-8 w-[1px] bg-slate-200"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight truncate max-w-[120px]">{user.name}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
