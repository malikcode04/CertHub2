
import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, activeTab, setActiveTab }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN] },
    { id: 'certificates', icon: <FileCheck size={20} />, label: 'Certificates', roles: [UserRole.STUDENT, UserRole.TEACHER] },
    { id: 'students', icon: <Users size={20} />, label: 'My Students', roles: [UserRole.TEACHER, UserRole.ADMIN] },
    { id: 'analytics', icon: <Settings size={20} />, label: 'Analytics', roles: [UserRole.ADMIN] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  const BrandLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
    const sizes = {
      sm: { container: "w-8 h-8", icon: 16, text: "text-lg" },
      md: { container: "w-10 h-10", icon: 20, text: "text-xl" },
      lg: { container: "w-16 h-16", icon: 32, text: "text-3xl" }
    };
    const s = sizes[size];

    return (
      <div className="flex items-center gap-3">
        <div className={`relative ${s.container} rounded-full bg-gradient-to-tr from-[#3b82f6] via-[#10b981] to-[#34d399] flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden border border-white/20`}>
          <ShieldCheck size={s.icon} className="text-white relative z-10" />
        </div>
        <div className="flex flex-col leading-none">
          <span className={`${s.text} font-black tracking-tight text-white`}>CertHub</span>
          {size === "lg" && <span className="text-[10px] text-white/60 font-bold uppercase tracking-[0.2em] mt-1">One Hub. All Certificates.</span>}
        </div>
      </div>
    );
  };

  const SidebarContent = () => (
    <>
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.jpg" alt="CertHub" className="w-10 h-10 rounded-full object-cover" />
          <h1 className="text-2xl font-black tracking-tight text-white">CertHub</h1>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredMenu.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
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

            {/* Logo in Navbar for Mobile */}
            <div className="flex lg:hidden items-center gap-2">
              <img src="/logo.jpg" alt="CertHub" className="w-8 h-8 rounded-full object-cover" />
              <span className="text-xl font-black tracking-tight text-slate-900">CertHub</span>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all ml-4 lg:ml-0">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none focus:ring-0 text-slate-600 w-32 md:w-64 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative cursor-pointer text-slate-500 hover:text-blue-600 transition-colors p-2 hover:bg-slate-50 rounded-full">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full text-[10px] text-white flex items-center justify-center">2</span>
            </div>

            <div className="hidden xs:block h-8 w-[1px] bg-slate-200"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight truncate max-w-[120px]">{user.name}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{user.role}</p>
              </div>
              {/* Avatar Removed */}
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
