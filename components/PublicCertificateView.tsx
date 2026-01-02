
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Calendar, Award, User, XCircle, Loader2, Download } from 'lucide-react';
import { Certificate, CertificateStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PublicCertificateView = () => {
    const { id } = useParams<{ id: string }>();
    const [cert, setCert] = useState<Certificate & { student_name?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`${API_URL}/public/certificates/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Certificate not found');
                return res.json();
            })
            .then(data => setCert(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    if (error || !cert) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <XCircle size={64} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-slate-800 mb-2">Verification Failed</h1>
                    <p className="text-slate-500">We could not find a valid certificate with this ID.</p>
                </div>
            </div>
        );
    }

    const isVerified = cert.status === CertificateStatus.VERIFIED;

    const handleDownload = async () => {
        if (!cert) return;
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
            window.open(cert.fileUrl, '_blank');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">

                {/* Header */}
                <div className={`p-8 text-center relative ${isVerified ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                    <div className="absolute top-6 right-6">
                        <button
                            onClick={handleDownload}
                            className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl backdrop-blur-md transition-all border border-white/20"
                            title="Download Certificate"
                        >
                            <Download size={20} />
                        </button>
                    </div>
                    {isVerified ? <ShieldCheck size={64} className="text-white mx-auto mb-4" /> : <Award size={64} className="text-white mx-auto mb-4" />}
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                        {isVerified ? 'Verified Certificate' : 'Certificate Pending'}
                    </h1>
                    <p className="text-white/90 font-medium">ID: {cert.id}</p>
                </div>

                {/* Content */}
                <div className="p-8 md:p-12 space-y-8">
                    <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                        <img src={cert.fileUrl} alt="Certificate" className="w-full md:w-1/2 rounded-2xl shadow-lg border border-slate-200" />
                        <div className="space-y-6 flex-1">
                            <div>
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Student Name</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <User className="text-blue-600" size={20} />
                                    <p className="text-xl font-bold text-slate-900">{cert.student_name || 'Unknown'}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Certificate Title</label>
                                <p className="text-xl font-bold text-slate-900 mt-1">{cert.title}</p>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Platform</label>
                                <p className="text-lg font-semibold text-slate-700 mt-1">{cert.platform}</p>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Issued Date</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="text-slate-400" size={18} />
                                    <p className="text-lg font-semibold text-slate-700">{new Date(cert.issuedDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isVerified && (
                        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-start gap-4">
                            <ShieldCheck className="text-emerald-600 shrink-0 mt-1" />
                            <div>
                                <h3 className="font-bold text-emerald-900">Officially Verified by CertHub</h3>
                                <p className="text-emerald-700 text-sm mt-1">
                                    This certificate was verified by {cert.verifiedBy ? 'Instructor' : 'CertHub Authority'} on {cert.verifiedAt ? new Date(cert.verifiedAt).toLocaleDateString() : 'Record'}.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicCertificateView;
