
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, X, Tag } from 'lucide-react';
import { Platform } from '../types';

const AdminPlatformManager: React.FC = () => {
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [newPlatform, setNewPlatform] = useState({ name: '', color: '#3b82f6', icon: '' });

    useEffect(() => {
        loadPlatforms();
    }, []);

    const loadPlatforms = async () => {
        try {
            const data = await api.getPlatforms();
            setPlatforms(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.addPlatform(newPlatform);
            await loadPlatforms();
            setShowAdd(false);
            setNewPlatform({ name: '', color: '#3b82f6', icon: '' });
        } catch (e) {
            alert("Failed to add platform");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><Tag className="text-blue-600" /> Platform Management</h3>
                <button onClick={() => setShowAdd(!showAdd)} className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                    {showAdd ? <X size={18} /> : <Plus size={18} />}
                    {showAdd ? 'Cancel' : 'Add Platform'}
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleAdd} className="mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="flex gap-4 mb-4">
                        <input required placeholder="Platform Name (e.g. Coursera)" className="flex-1 p-3 rounded-xl border border-slate-200" value={newPlatform.name} onChange={e => setNewPlatform({ ...newPlatform, name: e.target.value })} />
                        <input type="color" className="h-[50px] w-[60px] cursor-pointer rounded-xl border border-slate-200 p-1" value={newPlatform.color} onChange={e => setNewPlatform({ ...newPlatform, color: e.target.value })} />
                    </div>
                    <button disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">
                        {loading ? 'Saving...' : 'Add Platform'}
                    </button>
                </form>
            )}

            <div className="flex flex-wrap gap-3">
                {platforms.length === 0 && <p className="text-slate-400">No platforms added yet.</p>}
                {platforms.map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200" style={{ backgroundColor: `${p.color}15`, color: p.color }}>
                        <span className="font-bold">{p.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminPlatformManager;
