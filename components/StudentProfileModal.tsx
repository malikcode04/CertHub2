import React from 'react';
import { User, Certificate, CertificateStatus } from '../types';
import { X, Mail, Phone, Book, Hash, GraduationCap, Building2, UserCircle } from 'lucide-react';
import CertificateTable from './CertificateTable';

interface StudentProfileModalProps {
    student: User;
    certificates: Certificate[];
    onClose: () => void;
    onPreview: (cert: Certificate) => void;
    onDownload: (cert: Certificate) => void;
    onVerify: (id: string, status: CertificateStatus, remarks?: string) => void;
    role: string | undefined;
}

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
    student,
    certificates,
    onClose,
    onPreview,
    onDownload,
    onVerify,
    role
}) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50 relative">
                    <div className="flex gap-6 items-center">
                        <div className="w-24 h-24 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200">
                            <UserCircle size={48} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800">{student.name}</h2>
                            <div className="flex gap-2 mt-2">
                                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">{student.role}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-slate-200 shadow-sm">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                <div className="overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm"><Mail className="text-blue-500" size={20} /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                <p className="font-bold text-slate-700">{student.email}</p>
                            </div>
                        </div>

                        {student.mobileNumber && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm"><Phone className="text-emerald-500" size={20} /></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mobile</p>
                                    <p className="font-bold text-slate-700">{student.mobileNumber}</p>
                                </div>
                            </div>
                        )}

                        {student.department && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm"><Building2 className="text-indigo-500" size={20} /></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Department</p>
                                    <p className="font-bold text-slate-700">{student.department}</p>
                                </div>
                            </div>
                        )}

                        {student.currentClass && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm"><GraduationCap className="text-amber-500" size={20} /></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class</p>
                                    <p className="font-bold text-slate-700">{student.currentClass} {student.section ? `(Sec ${student.section})` : ''}</p>
                                </div>
                            </div>
                        )}

                        {student.rollNumber && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm"><Hash className="text-rose-500" size={20} /></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Roll Number</p>
                                    <p className="font-bold text-slate-700">{student.rollNumber}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Certificates Section */}
                    <div>
                        <h3 className="text-xl font-black text-slate-800 mb-4">Certificates</h3>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                            <CertificateTable
                                certificates={certificates}
                                role={role}
                                onPreview={onPreview}
                                onDownload={onDownload}
                                onVerify={onVerify}
                                hideStudentInfo={true} // Don't show student column since we are inside their profile
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfileModal;
