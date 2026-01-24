import React, { useState, useEffect } from 'react';
import { Bell, X, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { persistenceService } from '../services/persistenceService';

interface NotificationCenterProps {
    onClose?: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchLogs = async () => {
        try {
            // For now, repurpose Audit Logs as pseudo-notifications
            // Ideally this would be a real distinct table
            const res = await fetch('/api/audit-logs');
            if (res.ok) {
                const data = await res.json();
                setLogs(data.slice(0, 10)); // Top 10 recent
                setUnreadCount(Math.floor(Math.random() * 3)); // Mock unread for demo
            }
        } catch (e) {
            console.error("Failed to fetch notifications");
        }
    };

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div className="relative">
            <div
                onClick={toggleOpen}
                className="relative cursor-pointer text-slate-500 hover:text-blue-600 transition-colors p-2 hover:bg-slate-50 rounded-full"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full text-[10px] text-white flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Notifications</h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            {logs.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    No new notifications
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {logs.map((log) => (
                                        <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex gap-3">
                                                <div className={`mt-1 bg-blue-50 text-blue-600 p-2 rounded-lg h-fit`}>
                                                    <Info size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">{log.action}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{log.details}</p>
                                                    <p className="text-[10px] text-slate-400 mt-2">{new Date(log.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                            <button className="text-xs font-bold text-blue-600 hover:text-blue-700">Mark all read</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationCenter;
