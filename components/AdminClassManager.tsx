
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, Plus, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { User, Class, UserRole } from '../types';

const AdminClassManager: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [showAddClass, setShowAddClass] = useState(false);
    const [loading, setLoading] = useState(false);

    // New Class Form
    const [newClass, setNewClass] = useState({ name: '', courseName: '', teacherId: '' });

    // Enrollment State
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [cls, usrs] = await Promise.all([
                api.getClasses(),
                api.getUsers()
            ]);
            setClasses(cls);
            setTeachers(usrs.filter(u => u.role === UserRole.TEACHER));
            setStudents(usrs.filter(u => u.role === UserRole.STUDENT));
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClass.teacherId) return alert("Select a teacher");
        setLoading(true);
        try {
            await api.createClass(newClass);
            await loadData();
            setShowAddClass(false);
            setNewClass({ name: '', courseName: '', teacherId: '' });
        } catch (e) {
            alert("Failed to create class");
        } finally {
            setLoading(false);
        }
    };

    const toggleStudentSelection = (studentId: string) => {
        const next = new Set(selectedStudents);
        if (next.has(studentId)) next.delete(studentId);
        else next.add(studentId);
        setSelectedStudents(next);
    };

    const toggleSelectAll = () => {
        if (selectedStudents.size === students.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(students.map(s => s.id)));
        }
    };

    const handleBulkEnroll = async (classId: string) => {
        if (selectedStudents.size === 0) return;
        setLoading(true);
        try {
            await api.enrollStudents(classId, Array.from(selectedStudents));
            alert(`Enrolled ${selectedStudents.size} students!`);
            setSelectedStudents(new Set()); // Reset selection
            setExpandedClassId(null);
            loadData(); // Refresh counts
        } catch (e) {
            alert("Enrollment failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><Users className="text-blue-600" /> Class Management</h3>
                <button onClick={() => setShowAddClass(!showAddClass)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                    <Plus size={18} /> New Class
                </button>
            </div>

            {showAddClass && (
                <form onSubmit={handleCreateClass} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <input required placeholder="Class Name (e.g. Batch A)" className="p-3 rounded-xl border border-slate-200" value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })} />
                        <input required placeholder="Course Name (e.g. CS101)" className="p-3 rounded-xl border border-slate-200" value={newClass.courseName} onChange={e => setNewClass({ ...newClass, courseName: e.target.value })} />
                        <select required className="p-3 rounded-xl border border-slate-200" value={newClass.teacherId} onChange={e => setNewClass({ ...newClass, teacherId: e.target.value })}>
                            <option value="">Assign Teacher</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Create Class</button>
                </form>
            )}

            <div className="space-y-4">
                {classes.length === 0 && <p className="text-center text-slate-400 py-10">No classes found.</p>}
                {classes.map(cls => (
                    <div key={cls.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="p-4 flex items-center justify-between bg-slate-50 cursor-pointer" onClick={() => setExpandedClassId(expandedClassId === cls.id ? null : cls.id)}>
                            <div>
                                <h4 className="font-bold text-lg">{cls.name} <span className="text-slate-400 text-sm font-normal"> / {cls.courseName}</span></h4>
                                <p className="text-sm text-slate-500">Teacher: <span className="font-bold text-slate-700">{cls.teacherName}</span> • {cls.studentCount || 0} Students</p>
                            </div>
                            {expandedClassId === cls.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                        </div>

                        {expandedClassId === cls.id && (
                            <div className="p-6 border-t border-slate-200">
                                <div className="flex justify-between mb-4">
                                    <h5 className="font-bold text-slate-700">Enroll Students</h5>
                                    <div className="flex gap-4">
                                        <button onClick={toggleSelectAll} className="text-sm text-blue-600 font-bold flex items-center gap-1 hover:underline">
                                            {selectedStudents.size === students.length ? <CheckSquare size={16} /> : <Square size={16} />} Select All
                                        </button>
                                        {selectedStudents.size > 0 && (
                                            <button onClick={() => handleBulkEnroll(cls.id)} disabled={loading} className="bg-blue-600 text-white px-4 py-1 rounded-lg text-sm font-bold">
                                                {loading ? 'Enrolling...' : `Enroll ${selectedStudents.size} Selected`}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                                    {students.map(std => (
                                        <label key={std.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedStudents.has(std.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}>
                                            <input type="checkbox" className="hidden" checked={selectedStudents.has(std.id)} onChange={() => toggleStudentSelection(std.id)} />
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedStudents.has(std.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                {selectedStudents.has(std.id) && <CheckSquare size={14} className="text-white" />}
                                            </div>
                                            <img src={std.avatar} className="w-8 h-8 rounded-full" />
                                            <div className="truncate">
                                                <p className="font-bold text-sm truncate">{std.name}</p>
                                                <p className="text-xs text-slate-400 truncate">{std.email}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminClassManager;
