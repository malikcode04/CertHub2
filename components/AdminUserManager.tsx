
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, UserRole } from '../types';
import { Search, Trash2, User as UserIcon, Mail, Shield, Loader2, UserCircle } from 'lucide-react';

const AdminUserManager: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (user: User) => {
        if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone and will remove all their records.`)) return;

        setIsDeleting(user.id);
        try {
            await api.deleteUser(user.id);
            setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (error: any) {
            alert(error.message || "Failed to delete user");
        } finally {
            setIsDeleting(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-black text-slate-900">User Management</h2>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">User</th>
                                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Role</th>
                                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium">No users found matching your search.</td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-slate-50 border-2 border-slate-100 shadow-sm flex items-center justify-center text-slate-400">
                                                    <UserCircle size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-tight">{user.name}</p>
                                                    <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                                                        <Mail size={14} />
                                                        <span className="text-xs font-medium">{user.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' :
                                                    user.role === UserRole.TEACHER ? 'bg-blue-100 text-blue-600' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                <span className="text-sm font-bold text-slate-600">Active</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {user.role !== UserRole.ADMIN && (
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    disabled={isDeleting === user.id}
                                                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete User"
                                                >
                                                    {isDeleting === user.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUserManager;
