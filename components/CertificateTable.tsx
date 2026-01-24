
import React from 'react';
import { Certificate, CertificateStatus, UserRole } from '../types';
import { ExternalLink, CheckCircle, XCircle, Clock, MoreVertical, Eye, Download } from 'lucide-react';

interface CertificateTableProps {
  certificates: Certificate[];
  role: UserRole;
  onVerify?: (id: string, status: CertificateStatus, remarks?: string) => void;
  onPreview: (cert: Certificate) => void;
  onDownload: (cert: Certificate) => void;
  onStudentClick?: (studentId: string) => void;
  onCourseClick?: (courseTitle: string) => void;
  hideStudentInfo?: boolean;
}

const CertificateTable: React.FC<CertificateTableProps> = ({
  certificates,
  role,
  onVerify,
  onPreview,
  onDownload,
  onStudentClick,
  onCourseClick,
  hideStudentInfo = false
}) => {
  const getStatusBadge = (status: CertificateStatus) => {
    switch (status) {
      case CertificateStatus.VERIFIED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle size={14} /> Verified
          </span>
        );
      case CertificateStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
            <XCircle size={14} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            <Clock size={14} /> Pending
          </span>
        );
    }
  };

  const showStudentColumn = !hideStudentInfo && role !== UserRole.STUDENT;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              {showStudentColumn && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>}
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course Details</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Platform</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {certificates.length === 0 ? (
              <tr>
                <td colSpan={showStudentColumn ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                  No certificates found.
                </td>
              </tr>
            ) : (
              certificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors group">
                  {showStudentColumn && (
                    <td className="px-6 py-4">
                      <div
                        onClick={() => onStudentClick?.(cert.studentId)}
                        className="cursor-pointer hover:opacity-75"
                      >
                        <p className="font-bold text-slate-800 text-sm hover:text-blue-600 hover:underline">
                          {cert.studentName && !cert.studentName.startsWith('u') ? cert.studentName : 'Unknown Student'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {cert.studentRoll ? `Roll: ${cert.studentRoll}` : ''}
                          {cert.studentClass ? ` • ${cert.studentClass}` : ''}
                        </p>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p
                          onClick={() => onCourseClick?.(cert.title)}
                          className={`font-semibold text-slate-800 text-sm ${onCourseClick ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                        >
                          {cert.title}
                        </p>
                        <p className="text-xs text-slate-400">ID: {cert.id.toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">{cert.platform}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{new Date(cert.issuedDate).toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(cert.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onPreview(cert)}
                        className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all font-bold text-xs"
                        title="View Certificate"
                      >
                        <Eye size={16} /> <span>Preview</span>
                      </button>
                      <button
                        onClick={() => onDownload(cert)}
                        className="flex items-center gap-2 px-3 py-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all font-bold text-xs"
                        title="Download Certificate"
                      >
                        <Download size={16} /> <span>Download</span>
                      </button>

                      {role === UserRole.TEACHER && cert.status === CertificateStatus.PENDING && (
                        <>
                          <button
                            onClick={() => onVerify?.(cert.id, CertificateStatus.VERIFIED)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Verify"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => onVerify?.(cert.id, CertificateStatus.REJECTED)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Simple icon for table cell
const FileText = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export default CertificateTable;
