import React, { useState, useEffect } from 'react';
import { Certificate, CertificateStatus } from '../types';
import { X, Sparkles, AlertCircle, CheckCircle2, Download, Link, Copy, Check, ExternalLink } from 'lucide-react';
import { analyzeCertificate, CertificateAnalysis } from '../services/geminiService';
import { QRCodeSVG } from 'qrcode.react';

interface PreviewModalProps {
  certificate: Certificate;
  onClose: () => void;
  showAIAnalysis?: boolean;
  onDownload: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ certificate, onClose, showAIAnalysis = true, onDownload }) => {
  const [analysis, setAnalysis] = useState<CertificateAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const verifyUrl = `${window.location.origin}/verify/${certificate.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (showAIAnalysis) {
      performAnalysis();
    }
  }, [certificate, showAIAnalysis]); // Added showAIAnalysis to dependency array

  const performAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real app, we'd fetch the image bytes. Here we use the placeholder URL
      // Since it's a seed picsum url, we'll simulate the data for demo purposes
      // if the URL is not a base64 string.
      const result = await analyzeCertificate(certificate.fileUrl);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      setError("AI Analysis failed. Please verify manually.");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-blue-600" size={20} />
              <h4 className="font-bold text-slate-800">Gemini AI Verification</h4>
            </div>

            {loading ? (
              <div className="space-y-4">
                <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse"></div>
                <p className="text-sm text-slate-400 text-center pt-8">Scanning certificate for authenticity...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                <div className={`p-4 rounded-2xl flex items-start gap-3 ${analysis.isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {analysis.isValid ? <CheckCircle2 size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
                  <div>
                    <p className="text-sm font-bold">{analysis.isValid ? 'Looks Authentic' : 'Suspected Inauthentic'}</p>
                    <p className="text-xs opacity-80">Confidence: {(analysis.confidence * 100).toFixed(0)}%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Detected Platform</p>
                    <p className="text-sm font-semibold text-slate-800">{analysis.platform}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Detected Course</p>
                    <p className="text-sm font-semibold text-slate-800">{analysis.courseTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Student Name</p>
                    <p className="text-sm font-semibold text-slate-800">{analysis.studentName}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 italic">" {analysis.extractedDetails} "</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Waiting for analysis...</p>
            )}

            <div className="mt-12 pt-8 border-t border-slate-100">
              <h5 className="text-xs font-bold uppercase text-slate-400 mb-4">Manual Verification</h5>
              <div className="grid grid-cols-2 gap-3">
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">Approve</button>
                <button className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">Reject</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
