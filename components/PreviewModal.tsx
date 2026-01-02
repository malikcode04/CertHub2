import React, { useState } from 'react';
import { Certificate, CertificateStatus } from '../types';
import { X, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PreviewModalProps {
  certificate: Certificate;
  onClose: () => void;
  onDownload: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ certificate, onClose, onDownload }) => {
  const [copied, setCopied] = useState(false);
  const verifyUrl = `${window.location.origin}/verify/${certificate.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // AI Analysis removed as requested

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">{certificate.title}</h3>
              <p className="text-sm text-slate-500">Issued by {certificate.platform}</p>
            </div>
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ml-4"
            >
              <Download size={16} /> Download
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          <div className="md:w-2/3 p-8 bg-slate-50 flex flex-col items-center justify-center gap-8">
            <div className="bg-white p-4 shadow-xl border border-slate-200 rounded-lg max-w-full">
              <img
                src={certificate.fileUrl}
                alt="Certificate"
                className="max-w-full h-auto object-contain max-h-[60vh]"
              />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 w-full max-w-md shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <QRCodeSVG value={verifyUrl} size={80} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-800">Public Verification</h4>
                  <p className="text-xs text-slate-500 mb-3">Scan or share this link to verify officially.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-all border border-blue-100"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy Link'}
                    </button>
                    <a
                      href={verifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-blue-600 border border-slate-100"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:w-1/3 p-8 border-l border-slate-100 bg-white">
            <h4 className="font-bold text-slate-800 mb-6 font-black uppercase text-xs tracking-widest text-blue-600">Verification Actions</h4>

            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Current Status</p>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${certificate.status === CertificateStatus.VERIFIED ? 'bg-emerald-100 text-emerald-700' :
                  certificate.status === CertificateStatus.REJECTED ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                  {certificate.status}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h5 className="text-xs font-bold uppercase text-slate-400 mb-4">Manual Decision</h5>
                <div className="grid grid-cols-2 gap-3">
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">Approve</button>
                  <button className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">Reject</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
