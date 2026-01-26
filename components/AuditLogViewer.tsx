
import React, { useEffect, useState } from 'react';
import { History, Search, Filter, Shield, User, Activity, Calendar } from 'lucide-react';
import { api } from '../services/api';

const AuditLogViewer = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const data = await api.getAuditLogs();
                setLogs(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Fetch Logs Error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const getActionColor = (action: string) => {
        switch (action) {
            case 'REGISTER': return 'text-blue-600 bg-blue-50';
            case 'VERIFY': return 'text-emerald-600 bg-emerald-50';
            case 'REJECT': return 'text-red-600 bg-red-50';
            case 'UPLOAD': return 'text-purple-600 bg-purple-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm w-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                        <History size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">System Audit Logs</h2>
                        <p className="text-sm text-slate-500">Track all security and data activities</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all">
                        <Filter size={20} />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input placeholder="Search logs..." className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-sm" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50">
                                <th className="pb-4 pl-4">Timestamp</th>
                                <th className="pb-4">User</th>
                                <th className="pb-4">Action</th>
                                <th className="pb-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.map((log) => (
                                <tr key={log.id} className="group hover:bg-slate-50 transition-all">
                                    <td className="py-4 pl-4">
                                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                                            <Calendar size={14} />
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                                                <User size={14} />
                                            </div>
                                            <span className="font-bold text-slate-700">{log.user_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tight uppercase ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        <p className="text-slate-600 text-sm">{log.details}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AuditLogViewer;
