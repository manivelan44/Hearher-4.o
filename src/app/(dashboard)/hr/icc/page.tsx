'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getICCMembers, getComplaints, addICCMember, deleteICCMember } from '@/lib/data-service';
import type { ICCMember, Complaint } from '@/lib/database.types';
import Link from 'next/link';
import { Shield, UserPlus, Crown, User, ExternalLink, FileText, Clock, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    presiding: { label: 'Presiding Officer', color: '#f5a623', icon: <Crown size={16} /> },
    member: { label: 'Internal Member', color: '#a855f7', icon: <User size={16} /> },
    external: { label: 'External Member', color: '#10b981', icon: <ExternalLink size={16} /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', color: '#f5a623', bg: '#f5a62315', icon: <Clock size={12} /> },
    investigating: { label: 'Investigating', color: '#a855f7', bg: '#a855f715', icon: <AlertTriangle size={12} /> },
    resolved: { label: 'Resolved', color: '#10b981', bg: '#10b98115', icon: <CheckCircle size={12} /> },
    closed: { label: 'Closed', color: '#64748b', bg: '#64748b15', icon: <CheckCircle size={12} /> },
};

const SEVERITY_COLOR = (s: number) =>
    s >= 9 ? '#ef4444' : s >= 7 ? '#f5a623' : s >= 4 ? '#a855f7' : '#10b981';

export default function ICCManagementPage() {
    const { user } = useAuth();
    const [members, setMembers] = useState<ICCMember[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', email: '', role: 'member' as 'presiding' | 'member' | 'external' });

    useEffect(() => {
        const orgId = user?.org_id || '11111111-1111-1111-1111-111111111111';
        Promise.all([
            getICCMembers(orgId),
            getComplaints({ orgId }),
        ]).then(([m, c]) => {
            setMembers(m);
            setComplaints(c);
            setLoading(false);
        });
    }, [user]);

    // Cases assigned to any ICC members
    const assignedCases = complaints.filter((c) => c.assigned_icc_ids && c.assigned_icc_ids.length > 0);
    // Cases NOT assigned to any ICC
    const unassignedCases = complaints.filter((c) => (!c.assigned_icc_ids || c.assigned_icc_ids.length === 0) && c.status !== 'resolved' && c.status !== 'closed');

    // Group assigned cases by ICC member (a case appears under each member it's assigned to)
    const casesByMember: Record<string, Complaint[]> = {};
    assignedCases.forEach((c) => {
        (c.assigned_icc_ids || []).forEach((uid) => {
            if (!casesByMember[uid]) casesByMember[uid] = [];
            casesByMember[uid].push(c);
        });
    });

    const handleAddMember = async () => {
        if (!newMember.name.trim() || !newMember.email.trim()) return;
        setAddLoading(true);
        const orgId = user?.org_id || '11111111-1111-1111-1111-111111111111';
        const result = await addICCMember({ orgId, name: newMember.name.trim(), email: newMember.email.trim(), role: newMember.role });
        if (result) {
            setMembers((prev) => [...prev, result]);
            setNewMember({ name: '', email: '', role: 'member' });
            setShowAddForm(false);
        }
        setAddLoading(false);
    };

    const handleDeleteMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Remove "${memberName}" from the ICC Committee? This action cannot be undone.`)) return;
        const ok = await deleteICCMember(memberId);
        if (ok) {
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
        }
    };

    return (
        <div className="page-enter max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#a855f715' }}>
                        <Shield size={20} className="text-[#a855f7]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">ICC Committee</h1>
                        <p className="text-xs text-slate-400">Manage ICC members & view assigned cases</p>
                    </div>
                </div>
                <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary text-sm flex items-center gap-1">
                    <UserPlus size={14} /> {showAddForm ? 'Cancel' : 'Add Member'}
                </button>
            </div>

            {/* Add Member Form */}
            {showAddForm && (
                <div className="glass-card mb-6" style={{ borderColor: '#a855f730' }}>
                    <h3 className="text-sm font-semibold text-[#a855f7] mb-4">Add New ICC Member</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase block mb-1">Full Name *</label>
                            <input
                                className="w-full bg-[#0d0a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#a855f7] outline-none transition-all"
                                placeholder="e.g. Justice Lakshmi"
                                value={newMember.name}
                                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase block mb-1">Email *</label>
                            <input
                                className="w-full bg-[#0d0a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#a855f7] outline-none transition-all"
                                placeholder="e.g. lakshmi@org.com"
                                value={newMember.email}
                                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase block mb-1">Role *</label>
                            <select
                                className="w-full bg-[#0d0a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:border-[#a855f7] outline-none transition-all"
                                value={newMember.role}
                                onChange={(e) => setNewMember({ ...newMember, role: e.target.value as any })}
                            >
                                <option value="presiding">Presiding Officer</option>
                                <option value="member">Internal Member</option>
                                <option value="external">External Member</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={handleAddMember}
                        disabled={addLoading || !newMember.name.trim() || !newMember.email.trim()}
                        className="px-6 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: '#a855f720', color: '#a855f7', border: '1px solid #a855f730' }}
                    >
                        {addLoading ? 'Adding...' : '✅ Add to ICC Committee'}
                    </button>
                </div>
            )}

            <div className="rounded-xl p-4 mb-6" style={{ background: '#f5a62310', border: '1px solid #f5a62320' }}>
                <p className="text-xs text-[#e8d0a0]">
                    ⚖️ <strong>POSH Act Requirement:</strong> The ICC must have a minimum of 4 members — a presiding woman officer,
                    2 internal members committed to women&apos;s causes, and 1 external member from an NGO or legal background.
                </p>
            </div>

            {loading ? (
                <div className="glass-card text-center py-10">
                    <p className="text-2xl mb-2 animate-pulse">⏳</p>
                    <p className="text-slate-400 text-sm">Loading ICC data...</p>
                </div>
            ) : (
                <>
                    {/* ── Summary Stats ──────────────────────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <div className="glass-card text-center !py-4">
                            <p className="text-2xl font-bold text-[#a855f7]">{members.length}</p>
                            <p className="text-[10px] text-slate-500 uppercase mt-1">ICC Members</p>
                        </div>
                        <div className="glass-card text-center !py-4">
                            <p className="text-2xl font-bold text-[#e855a0]">{assignedCases.length}</p>
                            <p className="text-[10px] text-slate-500 uppercase mt-1">Assigned Cases</p>
                        </div>
                        <div className="glass-card text-center !py-4">
                            <p className="text-2xl font-bold text-amber-400">{unassignedCases.length}</p>
                            <p className="text-[10px] text-slate-500 uppercase mt-1">Unassigned</p>
                        </div>
                        <div className="glass-card text-center !py-4">
                            <p className="text-2xl font-bold text-emerald-400">{assignedCases.filter(c => c.status === 'resolved' || c.status === 'closed').length}</p>
                            <p className="text-[10px] text-slate-500 uppercase mt-1">Resolved</p>
                        </div>
                    </div>

                    {/* ── ICC Members & Their Cases ──────────────────────── */}
                    <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <Shield size={14} className="text-[#a855f7]" /> ICC Members & Assigned Cases
                    </h2>
                    <div className="space-y-4 mb-6">
                        {members.map((m) => {
                            const role = ROLE_CONFIG[m.role] || ROLE_CONFIG.member;
                            const memberCases = casesByMember[m.user_id] || [];
                            const activeCases = memberCases.filter(c => c.status === 'investigating' || c.status === 'pending');
                            const resolvedCases = memberCases.filter(c => c.status === 'resolved' || c.status === 'closed');

                            return (
                                <div key={m.id} className="glass-card">
                                    {/* Member Header */}
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${role.color}15` }}>
                                            <span style={{ color: role.color }}>{role.icon}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{m.user_id.slice(0, 8)}...</p>
                                            <p className="text-xs text-slate-500">{role.label} • Appointed {new Date(m.appointed_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: `${role.color}15`, color: role.color }}>
                                                {m.role}
                                            </span>
                                            <span className="text-xs px-2 py-1 rounded-lg bg-white/5 text-slate-400">
                                                {memberCases.length} case{memberCases.length !== 1 ? 's' : ''}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteMember(m.id, m.user_id.slice(0, 8))}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 transition-colors group/del"
                                                title="Remove from ICC"
                                            >
                                                <Trash2 size={13} className="text-slate-600 group-hover/del:text-red-400 transition-colors" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Assigned Cases List */}
                                    {memberCases.length === 0 ? (
                                        <p className="text-xs text-slate-500 pl-16">No cases assigned yet</p>
                                    ) : (
                                        <div className="space-y-2 mt-3 border-t border-white/5 pt-3">
                                            {memberCases.map((c) => {
                                                const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                                                const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000));

                                                return (
                                                    <Link
                                                        key={c.id}
                                                        href={`/hr/cases/${c.id}`}
                                                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-all group"
                                                    >
                                                        {/* Severity Dot */}
                                                        <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: SEVERITY_COLOR(c.severity) }} />

                                                        {/* Case Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-mono text-slate-400">{c.case_id}</span>
                                                                <span className="text-[10px] text-slate-600">•</span>
                                                                <span className="text-[10px] text-slate-500 capitalize">{c.type.replace('_', ' ')}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{c.description}</p>
                                                        </div>

                                                        {/* Days Open */}
                                                        <div className="text-center flex-shrink-0 w-14">
                                                            <span className="text-xs font-bold text-slate-400">{daysOpen}d</span>
                                                            <p className="text-[9px] text-slate-600">open</p>
                                                        </div>

                                                        {/* Severity */}
                                                        <div className="text-center flex-shrink-0 w-10">
                                                            <span className="text-xs font-bold" style={{ color: SEVERITY_COLOR(c.severity) }}>{c.severity}</span>
                                                            <p className="text-[9px] text-slate-600">/10</p>
                                                        </div>

                                                        {/* Status */}
                                                        <span
                                                            className="text-[10px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1 flex-shrink-0"
                                                            style={{ background: st.bg, color: st.color }}
                                                        >
                                                            {st.icon} {st.label}
                                                        </span>

                                                        {/* Arrow */}
                                                        <span className="text-slate-600 group-hover:text-[#e855a0] transition-colors text-xs">→</span>
                                                    </Link>
                                                );
                                            })}

                                            {/* Member Summary */}
                                            <div className="flex gap-3 pt-2 pl-4 text-[10px] text-slate-500">
                                                <span>🔍 {activeCases.length} active</span>
                                                <span>✅ {resolvedCases.length} resolved</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Unassigned Cases ──────────────────────────────── */}
                    {unassignedCases.length > 0 && (
                        <>
                            <h2 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                                <AlertTriangle size={14} /> Unassigned Cases ({unassignedCases.length})
                            </h2>
                            <div className="space-y-2 mb-6">
                                {unassignedCases.map((c) => {
                                    const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                                    const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000));
                                    const isOverdue = daysOpen > 3;

                                    return (
                                        <Link
                                            key={c.id}
                                            href={`/hr/cases/${c.id}`}
                                            className="glass-card flex items-center gap-3 group hover:scale-[1.005] transition-all"
                                            style={isOverdue ? { borderColor: '#f5a62330' } : {}}
                                        >
                                            <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: SEVERITY_COLOR(c.severity) }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-slate-400">{c.case_id}</span>
                                                    <span className="text-[10px] capitalize text-slate-500">{c.type.replace('_', ' ')}</span>
                                                </div>
                                                <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{c.description}</p>
                                            </div>
                                            <div className="text-center flex-shrink-0 w-14">
                                                <span className={`text-xs font-bold ${isOverdue ? 'text-amber-400' : 'text-slate-400'}`}>{daysOpen}d</span>
                                                <p className="text-[9px] text-slate-600">open</p>
                                            </div>
                                            <span
                                                className="text-[10px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1 flex-shrink-0"
                                                style={{ background: st.bg, color: st.color }}
                                            >
                                                {st.icon} {st.label}
                                            </span>
                                            {isOverdue && (
                                                <span className="text-[9px] font-bold text-amber-500 flex-shrink-0">⚠️ OVERDUE</span>
                                            )}
                                            <span className="text-slate-600 group-hover:text-[#e855a0] transition-colors text-xs">→</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ── Compliance Check ──────────────────────────────── */}
                    <div className="glass-card">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3">✅ Compliance Check</h3>
                        <div className="space-y-2">
                            {[
                                { check: 'Presiding woman officer', met: members.some((m) => m.role === 'presiding') },
                                { check: 'At least 2 internal members', met: members.filter((m) => m.role === 'member').length >= 2 },
                                { check: 'At least 1 external member', met: members.some((m) => m.role === 'external') },
                                { check: 'Minimum 4 total members', met: members.length >= 4 },
                            ].map((c) => (
                                <div key={c.check} className="flex items-center gap-2 text-sm">
                                    <span>{c.met ? '✅' : '❌'}</span>
                                    <span className={c.met ? 'text-slate-300' : 'text-red-400'}>{c.check}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
