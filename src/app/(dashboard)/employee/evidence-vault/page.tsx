'use client';

import { useState, useEffect } from 'react';
import { Lock, FileText, Image, Mic, Film, Trash2, ShieldCheck, AlertTriangle, FolderOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getEvidenceVault, deleteEvidenceItem, type VaultItem } from '@/lib/data-service';

// ─── Type Icons ─────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
    image: <Image size={18} className="text-[#e855a0]" />,
    audio: <Mic size={18} className="text-[#a855f7]" />,
    document: <FileText size={18} className="text-[#f5a623]" />,
    video: <Film size={18} className="text-[#10b981]" />,
};

const SOURCE_BADGES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    complaint: { label: 'From Complaint', color: '#e855a0', icon: <AlertTriangle size={10} /> },
    vault: { label: 'Vault Upload', color: '#a855f7', icon: <ShieldCheck size={10} /> },
    panic: { label: 'Panic Alert', color: '#ef4444', icon: <AlertTriangle size={10} /> },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function EvidenceVaultPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'complaint' | 'vault' | 'panic'>('all');

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        getEvidenceVault(user.id).then((data) => {
            if (!cancelled) {
                setItems(data);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [user]);

    const remove = async (id: string) => {
        if (!confirm('Delete this evidence permanently?')) return;
        setItems((prev) => prev.filter((i) => i.id !== id));
        await deleteEvidenceItem(id);
    };

    const filtered = filter === 'all' ? items : items.filter((i) => i.source === filter);

    // Count by source
    const complaintCount = items.filter((i) => i.source === 'complaint').length;
    const vaultCount = items.filter((i) => i.source === 'vault').length;
    const panicCount = items.filter((i) => i.source === 'panic').length;

    return (
        <div className="page-enter max-w-3xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f5a62315' }}>
                    <Lock size={20} className="text-[#f5a623]" />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Evidence Vault</h1>
                    <p className="text-xs text-slate-400">All evidence collected from your complaints and reports — secured and encrypted.</p>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="glass-card text-center py-3">
                    <p className="text-2xl font-bold" style={{ color: '#e855a0' }}>{complaintCount}</p>
                    <p className="text-[10px] text-slate-500">From Complaints</p>
                </div>
                <div className="glass-card text-center py-3">
                    <p className="text-2xl font-bold" style={{ color: '#a855f7' }}>{vaultCount}</p>
                    <p className="text-[10px] text-slate-500">Vault Items</p>
                </div>
                <div className="glass-card text-center py-3">
                    <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{panicCount}</p>
                    <p className="text-[10px] text-slate-500">Panic Alerts</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
                {(['all', 'complaint', 'vault', 'panic'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                        style={{
                            background: filter === f ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                            color: filter === f ? '#c084fc' : '#6b6285',
                            border: `1px solid ${filter === f ? '#a855f730' : 'rgba(255,255,255,0.06)'}`,
                        }}
                    >
                        {f === 'all' ? `📁 All (${items.length})` : f === 'complaint' ? `📋 Complaints (${complaintCount})` : f === 'vault' ? `🔐 Vault (${vaultCount})` : `🚨 Panic (${panicCount})`}
                    </button>
                ))}
            </div>

            {/* Items */}
            {loading ? (
                <div className="glass-card text-center py-10">
                    <p className="text-2xl mb-2 animate-pulse">⏳</p>
                    <p className="text-slate-400 text-sm">Loading collected evidence...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card text-center py-10">
                    <FolderOpen size={40} className="mx-auto mb-3 text-slate-600" />
                    <p className="text-slate-400 text-sm font-medium">
                        {filter === 'all' ? 'No evidence collected yet' : `No ${filter} evidence found`}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                        Evidence from your complaint submissions will appear here automatically.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((item) => {
                        const sourceBadge = SOURCE_BADGES[item.source] || SOURCE_BADGES.vault;
                        return (
                            <div key={item.id} className="glass-card flex items-center gap-4 group">
                                {/* File Type Icon */}
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    {TYPE_ICONS[item.type]}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    {item.url && item.url !== '#' ? (
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate hover:text-[#e855a0] hover:underline transition-colors block">
                                            {item.name}
                                        </a>
                                    ) : (
                                        <p className="text-sm font-medium truncate">{item.name}</p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                                        <span>{item.size}</span>
                                        <span>{item.date}</span>

                                        {/* Source Badge */}
                                        <span
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                                            style={{ background: `${sourceBadge.color}15`, color: sourceBadge.color }}
                                        >
                                            {sourceBadge.icon} {sourceBadge.label}
                                        </span>

                                        {/* Case ID */}
                                        {item.caseId && (
                                            <span className="text-[#f5a623]">📋 {item.caseId}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                                    {item.url && item.url !== '#' && (
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#c084fc] transition-colors" title="View Evidence">
                                            <FolderOpen size={16} />
                                        </a>
                                    )}
                                    <button onClick={() => remove(item.id)} className="text-slate-500 hover:text-red-400 transition-colors" title="Delete Evidence">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="text-xs text-slate-600 text-center mt-6">
                🔒 All evidence is encrypted with AES-256. Only you and the assigned ICC committee can access linked evidence.
            </p>
        </div>
    );
}
