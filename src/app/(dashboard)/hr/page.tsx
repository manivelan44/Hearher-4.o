'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getDashboardStats, getPanicAlerts, getComplaints, type DashboardStats } from '@/lib/data-service';
import type { PanicAlert, Complaint } from '@/lib/database.types';
import Link from 'next/link';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { FileText, Shield, AlertTriangle, Clock, Users, TrendingUp, CheckCircle, Activity, MapPin, Radio } from 'lucide-react';

// ─── Colors ─────────────────────────────────────────────────────────────────

const COLORS = ['#e855a0', '#a855f7', '#10b981', '#f5a623', '#3b82f6', '#ef4444'];
const SEVERITY_COLORS = ['#10b981', '#f5a623', '#e855a0', '#ef4444'];

// ─── Component ──────────────────────────────────────────────────────────────

export default function HRDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeAlerts, setActiveAlerts] = useState<PanicAlert[]>([]);
    const [overdueCases, setOverdueCases] = useState<Complaint[]>([]);

    useEffect(() => {
        const orgId = user?.org_id || '11111111-1111-1111-1111-111111111111';
        getDashboardStats(orgId).then((data) => {
            setStats(data);
            setLoading(false);
        });

        // Check for overdue ICC assignments (3-day deadline)
        getComplaints({ orgId }).then((allCases) => {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const overdue = allCases.filter((c) =>
                c.status === 'investigating' &&
                (!c.assigned_icc_ids || c.assigned_icc_ids.length === 0) &&
                new Date(c.created_at) < threeDaysAgo
            );
            setOverdueCases(overdue);
        });
    }, [user]);

    // Poll for active panic alerts every 10 seconds
    useEffect(() => {
        const fetchAlerts = () => {
            getPanicAlerts(user?.org_id).then((data) => {
                setActiveAlerts(data.filter((a) => a.status === 'active'));
            });
        };
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 10000);
        return () => clearInterval(interval);
    }, [user]);

    if (loading || !stats) {
        return (
            <div className="page-enter text-center py-20">
                <p className="text-2xl mb-3 animate-pulse">📊</p>
                <p className="text-slate-400">Loading dashboard...</p>
            </div>
        );
    }

    const statCards = [
        { label: 'Total Cases', value: stats.totalCases, icon: <FileText size={20} />, color: '#e855a0', link: '/hr/cases' },
        { label: 'Active', value: stats.activeCases, icon: <AlertTriangle size={20} />, color: '#a855f7', link: '/hr/cases?status=investigating' },
        { label: 'Pending', value: stats.pendingCases, icon: <Clock size={20} />, color: '#f5a623', link: '/hr/cases?status=pending' },
        { label: 'Resolved', value: stats.resolvedCases, icon: <CheckCircle size={20} />, color: '#10b981', link: '/hr/cases?status=resolved' },
    ];

    const metricCards = [
        { label: 'Avg Resolution', value: `${stats.avgResolutionDays}d`, icon: <TrendingUp size={18} />, color: '#3b82f6' },
        { label: 'Satisfaction', value: `${stats.employeeSatisfaction}/5`, icon: <Users size={18} />, color: '#10b981' },
        { label: 'Panic Alerts', value: stats.panicAlertsThisMonth, icon: <Shield size={18} />, color: '#ef4444' },
        { label: 'Compliance', value: `${stats.complianceScore}%`, icon: <Activity size={18} />, color: '#a855f7' },
    ];

    return (
        <div className="page-enter">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">📊 HR Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-1">Overview of workplace safety metrics</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/hr/cases" className="btn-ghost text-sm flex items-center gap-1">
                        <FileText size={14} /> All Cases
                    </Link>
                    <Link href="/hr/reports" className="btn-primary text-sm flex items-center gap-1">
                        📄 Generate Report
                    </Link>
                </div>
            </div>

            {/* 🚨 Live SOS Alert Banner — shown when employees trigger panic */}
            {activeAlerts.length > 0 && (
                <div className="mb-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Radio size={16} className="text-red-400 animate-pulse" />
                        <span className="text-sm font-bold text-red-400">
                            {activeAlerts.length} ACTIVE SOS ALERT{activeAlerts.length > 1 ? 'S' : ''} — LIVE TRACKING
                        </span>
                    </div>
                    {activeAlerts.map((alert) => {
                        const minutesAgo = Math.floor((Date.now() - new Date(alert.created_at).getTime()) / 60000);
                        return (
                            <div
                                key={alert.id}
                                className="rounded-xl overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, #ef444415, #ef444408)',
                                    border: '2px solid #ef444450',
                                }}
                            >
                                {/* Alert Header */}
                                <div className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse" style={{ background: '#ef444425' }}>
                                            <AlertTriangle size={20} className="text-red-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-red-400">🚨 Employee SOS Active</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Triggered {new Date(alert.created_at).toLocaleTimeString()} via {alert.source === 'panic' ? 'Panic Button' : alert.source}
                                                {' • '}{minutesAgo < 1 ? 'Just now' : `${minutesAgo}m ago`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full animate-pulse" style={{ background: '#ef444420' }}>
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-[10px] font-bold text-red-400 uppercase">Live</span>
                                    </div>
                                </div>

                                {/* Live Map Embed */}
                                <div className="relative mx-4 mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid #ef444430' }}>
                                    <iframe
                                        key={`map-${alert.id}-${alert.latitude}-${alert.longitude}`}
                                        width="100%"
                                        height="250"
                                        style={{ border: 0, filter: 'hue-rotate(180deg) invert(1) brightness(0.85) contrast(1.1)' }}
                                        loading="eager"
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${alert.longitude - 0.005},${alert.latitude - 0.003},${alert.longitude + 0.005},${alert.latitude + 0.003}&layer=mapnik&marker=${alert.latitude},${alert.longitude}`}
                                    />
                                    {/* Live pulse overlay on the map */}
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.7)' }}>
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-[10px] font-mono text-white">LIVE GPS TRACKING</span>
                                    </div>
                                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.7)' }}>
                                        <span className="text-[10px] font-mono text-emerald-400">
                                            📍 {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                                        </span>
                                    </div>
                                </div>

                                {/* Location Details & Actions */}
                                <div className="px-4 pb-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-emerald-400" />
                                        <span className="text-xs font-mono text-emerald-400">
                                            {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                                        </span>
                                        <span className="text-[10px] text-slate-600">• Auto-refreshes every 10s</span>
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.03]"
                                        style={{ background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f630' }}
                                    >
                                        <MapPin size={12} /> Open in Google Maps
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ⚠️ Overdue ICC Assignment Alerts */}
            {overdueCases.length > 0 && (
                <div className="mb-6 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-amber-400 animate-pulse" />
                        <span className="text-sm font-bold text-amber-400">
                            {overdueCases.length} CASE{overdueCases.length > 1 ? 'S' : ''} OVERDUE FOR ICC ASSIGNMENT (3-DAY DEADLINE)
                        </span>
                    </div>
                    {overdueCases.map((c) => (
                        <Link
                            href={`/hr/cases/${c.id}`}
                            key={c.id}
                            className="rounded-xl p-4 flex items-center justify-between gap-4 group hover:scale-[1.01] transition-transform"
                            style={{
                                background: 'linear-gradient(135deg, #f5a62312, #f5a62305)',
                                border: '1px solid #f5a62330',
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#f5a62320' }}>
                                    <Shield size={20} className="text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-400">Urgent: Assign ICC Committee</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Case {c.case_id} — Created {new Date(c.created_at).toLocaleDateString()} ({Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago)
                                    </p>
                                </div>
                            </div>
                            <div className="btn-primary !py-1.5 !px-3 !text-[10px] !rounded-lg bg-amber-500 border-amber-600">
                                ASSIGN NOW
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {statCards.map((s) => (
                    <Link
                        key={s.label}
                        href={s.link}
                        className="glass-card group hover:scale-[1.02] transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                                <span style={{ color: s.color }}>{s.icon}</span>
                            </div>
                            <span className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
                        </div>
                        <p className="text-xs text-slate-400">{s.label}</p>
                    </Link>
                ))}
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {metricCards.map((m) => (
                    <div key={m.label} className="glass-card !p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${m.color}12` }}>
                            <span style={{ color: m.color }}>{m.icon}</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold">{m.value}</p>
                            <p className="text-[10px] text-slate-500">{m.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Monthly Trend */}
                <div className="glass-card">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">📈 Monthly Trend</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={stats.monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#1a1533', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                                labelStyle={{ color: '#e855a0' }}
                            />
                            <Line type="monotone" dataKey="cases" stroke="#e855a0" strokeWidth={2} dot={{ fill: '#e855a0', r: 4 }} activeDot={{ fill: '#e855a0', r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Cases by Type */}
                <div className="glass-card">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">🗂️ Cases by Type</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={stats.casesByType}
                                dataKey="count"
                                nameKey="type"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                innerRadius={40}
                                paddingAngle={4}
                                strokeWidth={0}
                            >
                                {stats.casesByType.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: '#1a1533', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                            />
                            <Legend
                                formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Severity Distribution */}
            <div className="glass-card mb-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">⚠️ Severity Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.severityDistribution} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="level" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
                        <Tooltip
                            contentStyle={{ background: '#1a1533', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                        />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                            {stats.severityDistribution.map((_, i) => (
                                <Cell key={i} fill={SEVERITY_COLORS[i % SEVERITY_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { href: '/hr/cases', emoji: '📋', label: 'All Cases', color: '#e855a0' },
                    { href: '/hr/icc', emoji: '⚖️', label: 'ICC Members', color: '#a855f7' },
                    { href: '/hr/pulse', emoji: '💓', label: 'Pulse Survey', color: '#f5a623' },
                    { href: '/hr/training', emoji: '🎓', label: 'Training', color: '#10b981' },
                    { href: '/hr/analytics', emoji: '📊', label: 'Analytics', color: '#3b82f6' },
                    { href: '/hr/reports', emoji: '📄', label: 'Reports', color: '#e855a0' },
                    { href: '/hr/users', emoji: '👥', label: 'Users', color: '#a855f7' },
                    { href: '/employee', emoji: '🏠', label: 'Switch View', color: '#64748b' },
                ].map((action) => (
                    <Link
                        key={action.label}
                        href={action.href}
                        className="glass-card !p-3 text-center group hover:scale-[1.03] transition-all"
                    >
                        <div className="text-xl mb-1 group-hover:scale-110 transition-transform inline-block">{action.emoji}</div>
                        <p className="text-xs text-slate-400">{action.label}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
