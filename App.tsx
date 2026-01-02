
import React, { useState, useEffect } from 'react';
import { User, UserRole, Certificate, CertificateStatus } from './types';
import Layout from './components/Layout';
import StatCard from './components/DashboardCard';
import CertificateTable from './components/CertificateTable';
import UploadModal from './components/UploadModal';
import PreviewModal from './components/PreviewModal';
import Analytics from './components/Analytics';
import AdminPlatformManager from './components/AdminPlatformManager';
import AdminClassManager from './components/AdminClassManager';
import { api } from './services/api';
import { persistenceService } from './services/persistenceService';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import PublicCertificateView from './components/PublicCertificateView';
import BulkImport from './components/BulkImport';
import AuditLogViewer from './components/AuditLogViewer';
import {
  FileCheck,
  Clock,
  AlertTriangle,
  UserCheck,
  Plus,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  Mail,
  Lock
} from 'lucide-react';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/verify/:id" element={<PublicCertificateView />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
};

const MainApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(persistenceService.getCurrentUser());
  const [isRegistering, setIsRegistering] = useState(false);
  const [regRole, setRegRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<{ id: string, name: string, teacherName: string }[]>([]);

  const [regData, setRegData] = useState({ name: '', email: '', password: '', rollNumber: '', classId: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  useEffect(() => {
    if (isRegistering && regRole === UserRole.STUDENT) {
      api.getClasses().then(cls => setAvailableClasses(cls)).catch(console.error);
    }
  }, [isRegistering, regRole]);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setIsInitialLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch certificates: Students only see theirs, Admin/Teachers see all (for now)
      const params = user?.role === UserRole.STUDENT ? { studentId: user.id } : {};
      const certs = await api.getCertificates(params);
      setCertificates(Array.isArray(certs) ? certs : []);

      // If admin, fetch all users
      if (user?.role === UserRole.ADMIN) {
        const users = await api.getUsers();
        setAllUsers(users);
      }
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    try {
      const data = await api.login(loginData);
      if (data.user) {
        // Save token (handled in api.ts helper usually, but here manually for now)
        localStorage.setItem('token', data.token);
        persistenceService.setCurrentUser(data.user);
        setUser(data.user);
      } else {
        alert("Login failed");
      }
    } catch (e: any) {
      alert(e.message || "Connection to backend failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    try {
      const data = await api.register({ ...regData, role: regRole });
      if (data.user) {
        localStorage.setItem('token', data.token);
        persistenceService.setCurrentUser(data.user);
        setUser(data.user);
      }
    } catch (e: any) {
      alert(e.message || "Registration failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    persistenceService.setCurrentUser(null);
    localStorage.removeItem('token');
  };

  const handleUpload = async (data: { title: string; platform: string; date: string; file: File }) => {
    setIsBusy(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(data.file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const newCert = await api.uploadCertificate({
          title: data.title,
          platform: data.platform,
          issuedDate: data.date,
          studentId: user?.id,
          imageBase64: base64
        });

        // Optimistically update list or refetch
        setCertificates(prev => [newCert, ...prev]);
        setShowUpload(false);
      };
    } catch (e) {
      alert("Upload failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDownload = async (cert: Certificate) => {
    try {
      const response = await fetch(cert.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cert.title.replace(/\s+/g, '_')}_Certificate.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback
      const link = document.createElement('a');
      link.href = cert.fileUrl;
      link.target = '_blank';
      link.download = `${cert.title.replace(/\s+/g, '_')}_Certificate.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleVerify = async (id: string, status: CertificateStatus, remarks?: string) => {
    setIsBusy(true);
    try {
      await api.updateCertificate(id, {
        status,
        remarks: remarks || '',
        verifiedBy: user?.id || 'anonymous'
      });
      fetchData(); // Refetch to show updated status
    } catch (e) {
      alert("Verification update failed");
    } finally {
      setIsBusy(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
          {!isRegistering ? (
            <div className="text-center">
              <ShieldCheck size={64} className="text-blue-600 mx-auto mb-6" />
              <h1 className="text-3xl font-black mb-2">CertHub</h1>
              <p className="text-slate-500 mb-8">Login to your centralized hub</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input required type="email" placeholder="Email" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setLoginData({ ...loginData, email: e.target.value })} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input required type="password" placeholder="Password" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
                </div>
                <button type="submit" disabled={isBusy} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all">
                  {isBusy ? <Loader2 className="animate-spin mx-auto" /> : 'Sign In'}
                </button>
              </form>
              <button onClick={() => setIsRegistering(true)} className="mt-6 text-sm text-blue-600 font-bold hover:underline">Create an account</button>
            </div>
          ) : (
            <div>
              <button onClick={() => setIsRegistering(false)} className="mb-6 flex items-center gap-2 text-slate-400 text-sm font-bold"><ArrowLeft size={16} /> Back</button>
              <h2 className="text-2xl font-black mb-8">Join the Hub</h2>
              {!regRole ? (
                <div className="grid grid-cols-1 gap-3">
                  {Object.values(UserRole).map(role => (
                    <button key={role} onClick={() => setRegRole(role)} className="p-4 border-2 border-slate-100 rounded-2xl font-bold hover:border-blue-600 hover:bg-blue-50 transition-all">{role}</button>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <input required placeholder="Full Name" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setRegData({ ...regData, name: e.target.value })} />
                  <input required type="email" placeholder="Email" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setRegData({ ...regData, email: e.target.value })} />

                  {regRole === UserRole.STUDENT && (
                    <>
                      <input required placeholder="Roll Number" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setRegData({ ...regData, rollNumber: e.target.value })} />
                      <select className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none text-slate-500" onChange={e => setRegData({ ...regData, classId: e.target.value })}>
                        <option value="">Select Class (Optional)</option>
                        {availableClasses.map(c => (
                          <option key={c.id} value={c.id}>{c.name} - {c.teacherName}</option>
                        ))}
                      </select>
                    </>
                  )}

                  <input required type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setRegData({ ...regData, password: e.target.value })} />
                  <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">Register as {regRole}</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-10">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black text-slate-900">Dashboard</h2>
            {user.role === UserRole.STUDENT && (
              <button
                onClick={() => setShowUpload(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-all"
              >
                <Plus size={20} /> Upload
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard label="Total" value={certificates.length} icon={<FileCheck />} color="bg-blue-600" />
            <StatCard label="Verified" value={certificates.filter(c => c.status === CertificateStatus.VERIFIED).length} icon={<UserCheck />} color="bg-emerald-500" />
            <StatCard label="Pending" value={certificates.filter(c => c.status === CertificateStatus.PENDING).length} icon={<Clock />} color="bg-amber-500" />
            <StatCard label="Rejected" value={certificates.filter(c => c.status === CertificateStatus.REJECTED).length} icon={<AlertTriangle />} color="bg-red-500" />
          </div>

          {user.role === UserRole.ADMIN && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AdminClassManager />
              <AdminPlatformManager />
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-6">Recent Certificates</h3>
            <CertificateTable
              certificates={certificates.slice(0, 5)}
              role={user.role}
              onPreview={setSelectedCert}
              onDownload={handleDownload}
              onVerify={handleVerify}
            />
          </div>
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900 mb-8">All Certificates</h2>
          <CertificateTable
            certificates={certificates}
            role={user.role}
            onPreview={setSelectedCert}
            onDownload={handleDownload}
            onVerify={handleVerify}
          />
        </div>
      )}

      {activeTab === 'analytics' && <Analytics certificates={certificates} />}

      {activeTab === 'bulk-import' && user.role === UserRole.ADMIN && (
        <BulkImport onSuccess={fetchData} />
      )}

      {activeTab === 'audit-logs' && user.role === UserRole.ADMIN && (
        <AuditLogViewer />
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} />}
      {selectedCert && (
        <PreviewModal
          certificate={selectedCert}
          onClose={() => setSelectedCert(null)}
          showAIAnalysis={true}
          onDownload={() => handleDownload(selectedCert)}
        />
      )}

      {isBusy && (
        <div className="fixed inset-0 z-[100] bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
      )}
    </Layout>
  );
};

export default App;
