
import React, { useState } from 'react';
import { Upload, X, Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { api } from '../services/api';

interface BulkImportProps {
    onSuccess: () => void;
}

const BulkImport: React.FC<BulkImportProps> = ({ onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [data, setData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setData(results.data);
                }
            });
        }
    };

    const handleImport = async () => {
        if (data.length === 0) return;
        setIsProcessing(true);
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const user of data) {
            try {
                // Bulk import endpoint or loop register
                await api.register({
                    name: user.name,
                    email: user.email,
                    password: user.password || 'Student@123',
                    role: 'STUDENT',
                    rollNumber: user.rollNumber,
                    classId: user.classId
                });
                success++;
            } catch (err: any) {
                failed++;
                errors.push(`${user.email}: ${err.message}`);
            }
        }

        setResults({ success, failed, errors });
        setIsProcessing(false);
        if (success > 0) onSuccess();
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                    <Upload size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-800">Bulk Student Import</h2>
                    <p className="text-sm text-slate-500">Upload CSV with: name, email, rollNumber, classId</p>
                </div>
            </div>

            {!results ? (
                <div className="space-y-6">
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-all group relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="space-y-2">
                            <FileText className="mx-auto text-slate-400 group-hover:text-blue-500" size={48} />
                            <p className="font-bold text-slate-700">{file ? file.name : 'Select CSV File'}</p>
                            <p className="text-xs text-slate-400">Click or drag and drop</p>
                        </div>
                    </div>

                    {data.length > 0 && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-sm font-bold text-slate-600">Detected {data.length} students to import.</p>
                        </div>
                    )}

                    <button
                        onClick={handleImport}
                        disabled={data.length === 0 || isProcessing}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : 'Start Import'}
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                            <CheckCircle className="mx-auto text-emerald-600 mb-1" size={24} />
                            <p className="text-2xl font-black text-emerald-900">{results.success}</p>
                            <p className="text-xs text-emerald-600 uppercase font-bold">Success</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                            <AlertTriangle className="mx-auto text-red-600 mb-1" size={24} />
                            <p className="text-2xl font-black text-red-900">{results.failed}</p>
                            <p className="text-xs text-red-600 uppercase font-bold">Failed</p>
                        </div>
                    </div>

                    {results.errors.length > 0 && (
                        <div className="max-h-32 overflow-y-auto p-4 bg-slate-50 rounded-2xl space-y-1 text-xs text-red-500">
                            {results.errors.map((e, idx) => <p key={idx}>{e}</p>)}
                        </div>
                    )}

                    <button
                        onClick={() => { setResults(null); setFile(null); setData([]); }}
                        className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                    >
                        Import More
                    </button>
                </div>
            )}
        </div>
    );
};

export default BulkImport;
