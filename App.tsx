import React, { useState, useEffect } from 'react';
import { User, UserRole, Certificate, CertificateStatus } from './types';
import Layout from './components/Layout';
import StatCard from './components/DashboardCard';
import CertificateTable from './components/CertificateTable';
import UploadModal from './components/UploadModal';
import PreviewModal from './components/PreviewModal';
import Analytics from './components/Analytics';
import AdminPlatformManager from './components/AdminPlatformManager';
import { api } from './services/api';
import { persistenceService } from './services/persistenceService';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import PublicCertificateView from './components/PublicCertificateView';
import BulkImport from './components/BulkImport';
import AuditLogViewer from './components/AuditLogViewer';
import AdminClassManager from './components/AdminClassManager';
import AdminUserManager from './components/AdminUserManager';
import StudentProfileModal from './components/StudentProfileModal';
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
  Lock,
  Search,
  Filter
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
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CertificateStatus>('ALL');

  const [regData, setRegData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    currentClass: '',
    section: '',
    rollNumber: '',
    mobileNumber: ''
  });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    try {
      const res = await api.forgotPassword(forgotEmail);
      alert(res.message);
      setShowForgot(false);
    } catch (e: any) {
      alert("Error requesting password reset");
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
      fetchData();
    } catch (e) {
      alert("Verification update failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handleStudentClick = (studentId: string) => {
    const student = allUsers.find(u => u.id === studentId);
    if (student) {
      setSelectedStudent(student);
    } else {
      const studentCerts = certificates.filter(c => c.studentId === studentId);
      if (studentCerts.length > 0) {
        const c = studentCerts[0];
        setSelectedStudent({
          id: c.studentId,
          name: c.studentName || 'Unknown',
          email: 'N/A',
          role: UserRole.STUDENT,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.studentName}`,
          department: 'N/A',
          currentClass: c.studentClass,
          section: c.studentSection,
          rollNumber: c.studentRoll,
          mobileNumber: 'N/A'
        });
      }
    }
  };

  const handleCourseClick = (title: string) => {
    setSearchQuery(title);
    if (activeTab !== 'certificates') {
      setActiveTab('certificates');
    }
  };

  const filteredCertificates = certificates.filter(c => {
    // 1. Status Filter
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;

    // 2. Search Query
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();

    // Check certificate title
    if (c.title.toLowerCase().includes(q)) return true;

    // Check student details (if available on cert or via lookup)
    const studentName = c.studentName?.toLowerCase();
    if (studentName && studentName.includes(q)) return true;

    const studentRoll = c.studentRoll?.toLowerCase();
    if (studentRoll && studentRoll.includes(q)) return true;

    const studentClass = c.studentClass?.toLowerCase();
    if (studentClass && studentClass.includes(q)) return true;

    return false;
  });

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
            !showForgot ? (
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
                  <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-blue-600 font-bold hover:underline mb-2 block text-right">Forgot Password?</button>
                  <button type="submit" disabled={isBusy} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all">
                    {isBusy ? <Loader2 className="animate-spin mx-auto" /> : 'Sign In'}
                  </button>
                </form>
                <button onClick={() => setIsRegistering(true)} className="mt-6 text-sm text-blue-600 font-bold hover:underline">Create an account</button>
              </div>
            ) : (
              <div className="text-center">
                <ShieldCheck size={64} className="text-blue-600 mx-auto mb-6" />
                <h2 className="text-2xl font-black mb-4">Reset Password</h2>
                <p className="text-slate-500 mb-6">Enter your email to receive a reset link.</p>
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
                    <input required type="email" placeholder="Email" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setForgotEmail(e.target.value)} />
                  </div>
                  <button type="submit" disabled={isBusy} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all">
                    {isBusy ? <Loader2 className="animate-spin mx-auto" /> : 'Send Reset Link'}
                  </button>
                </form>
                <button onClick={() => setShowForgot(false)} className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-sm font-bold mx-auto"><ArrowLeft size={16} /> Back to Login</button>
              </div>
            )
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
                      <input required placeholder="Department (e.g. CS)" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setRegData({ ...regData, department: e.target.value })} />
                      <div className="grid grid-cols-2 gap-4">
                        <input required placeholder="Class (e.g. FY A)" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setRegData({ ...regData, currentClass: e.target.value })} />
                        <input required placeholder="Section (e.g. A)" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setRegData({ ...regData, section: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input required placeholder="Roll No." className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setRegData({ ...regData, rollNumber: e.target.value })} />
                        <input required placeholder="Mobile Number" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none" onChange={e => setRegData({ ...regData, mobileNumber: e.target.value })} />
                      </div>
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
    <Layout
      user={user}
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchQuery={searchQuery}
      onSearch={setSearchQuery}
    >
      <div className="space-y-6">
        {/* Search Bar for Dashboards */}
        {(activeTab === 'dashboard' || activeTab === 'certificates') && (
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="text-[10px] font-black bg-blue-600 text-white px-2 py-1 rounded-md">LIVE SEARCH</div>
            <Search className="text-slate-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Roll No, Class, or Course..."
              className="flex-1 outline-none text-slate-700 font-medium bg-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-xs font-bold text-slate-400 hover:text-red-500">CLEAR</button>
            )}
          </div>
        )}

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
              <StatCard
                label="Total"
                value={certificates.length}
                icon={<FileCheck />}
                color="bg-blue-600"
                onClick={() => setStatusFilter('ALL')}
                isActive={statusFilter === 'ALL'}
              />
              <StatCard
                label="Verified"
                value={certificates.filter(c => c.status === CertificateStatus.VERIFIED).length}
                icon={<UserCheck />}
                color="bg-emerald-500"
                onClick={() => setStatusFilter(CertificateStatus.VERIFIED)}
                isActive={statusFilter === CertificateStatus.VERIFIED}
              />
              <StatCard
                label="Pending"
                value={certificates.filter(c => c.status === CertificateStatus.PENDING).length}
                icon={<Clock />}
                color="bg-amber-500"
                onClick={() => setStatusFilter(CertificateStatus.PENDING)}
                isActive={statusFilter === CertificateStatus.PENDING}
              />
              <StatCard
                label="Rejected"
                value={certificates.filter(c => c.status === CertificateStatus.REJECTED).length}
                icon={<AlertTriangle />}
                color="bg-red-500"
                onClick={() => setStatusFilter(CertificateStatus.REJECTED)}
                isActive={statusFilter === CertificateStatus.REJECTED}
              />
            </div>

            {/* AdminPlatformManager moved to 'platforms' tab */}

            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-6">Recent Certificates</h3>
              <CertificateTable
                certificates={filteredCertificates.slice(0, 5)}
                role={user.role}
                onPreview={setSelectedCert}
                onDownload={handleDownload}
                onVerify={handleVerify}
                onStudentClick={handleStudentClick}
                onCourseClick={handleCourseClick}
              />
            </div>
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900">All Certificates</h2>
              {/* Search query might be set by Course Click, but Navbar search is gone. */}
              {/* We can re-introduce a local search if needed, but for now just showing active filters */}
              <div className="flex gap-2">
                {searchQuery && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Search: {searchQuery}</span>
                )}
                {statusFilter !== 'ALL' && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Status: {statusFilter}</span>
                )}
              </div>
            </div>

            <CertificateTable
              certificates={filteredCertificates}
              role={user.role}
              onPreview={setSelectedCert}
              onDownload={handleDownload}
              onVerify={handleVerify}
              onStudentClick={handleStudentClick}
              onCourseClick={handleCourseClick}
            />
          </div>
        )}

        {activeTab === 'analytics' && <Analytics certificates={filteredCertificates} />}

        {activeTab === 'platforms' && user.role === UserRole.ADMIN && (
          <div className="grid grid-cols-1 gap-8">
            <AdminPlatformManager />
          </div>
        )}

        {activeTab === 'classes' && user.role === UserRole.ADMIN && (
          <AdminClassManager />
        )}

        {activeTab === 'bulk-import' && user.role === UserRole.ADMIN && (
          <BulkImport onSuccess={fetchData} />
        )}

        {activeTab === 'audit-logs' && user.role === UserRole.ADMIN && (
          <AuditLogViewer />
        )}

        {activeTab === 'users' && user.role === UserRole.ADMIN && (
          <AdminUserManager />
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} />}
      {selectedCert && (
        <PreviewModal
          certificate={selectedCert}
          onClose={() => setSelectedCert(null)}
          showAIAnalysis={true}
          onDownload={() => handleDownload(selectedCert)}
        />
      )}

      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          certificates={certificates.filter(c => c.studentId === selectedStudent.id)}
          onClose={() => setSelectedStudent(null)}
          onPreview={setSelectedCert}
          onDownload={handleDownload}
          onVerify={handleVerify}
          role={user.role}
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
