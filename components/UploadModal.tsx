
import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { PLATFORMS } from '../constants';

interface UploadModalProps {
  onClose: () => void;
  onUpload: (data: { title: string; platform: string; date: string; file: File }) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState(PLATFORMS[0].name);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && title) {
      onUpload({ title, platform, date, file });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800">Upload Certificate</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-slate-200">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Course Title</label>
              <input 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                type="text" 
                placeholder="e.g. Advanced Machine Learning"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Platform</label>
                <select 
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                >
                  {PLATFORMS.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Issue Date</label>
                <input 
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  type="date" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Certificate File</label>
              <div className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-blue-300'}`}>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {file ? (
                  <div className="text-center animate-in fade-in scale-in">
                    <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                    <p className="text-xs text-emerald-600 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-700">Click or drag to upload</p>
                    <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, or PDF (Max 5MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={!file || !title}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <FileText size={20} />
              Submit Certificate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
