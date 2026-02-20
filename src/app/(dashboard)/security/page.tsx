'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getPanicAlerts, resolvePanicAlert } from '@/lib/data-service';
import type { PanicAlert } from '@/lib/database.types';
import {
    AlertTriangle, MapPin, CheckCircle, Radio, Clock, Shield, Siren, Phone,
    PhoneOff, Mic, MicOff, Volume2,
} from 'lucide-react';

// ─── Config ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string; pulse: boolean }> = {
    active: { color: '#ef4444', bg: '#ef444420', label: '🔴 ACTIVE', pulse: true },
    responding: { color: '#f5a623', bg: '#f5a62320', label: '🟡 Responding', pulse: true },
    resolved: { color: '#10b981', bg: '#10b98120', label: '🟢 Resolved', pulse: false },
};

const SOURCE_LABELS: Record<string, string> = {
    panic: '🚨 Panic Button',
    guardian: '🛡️ Guardian Mode',
    shake: '📱 Shake Detection',
};

// Employee phone directory — used to call employee who triggered panic
const EMPLOYEE_DIRECTORY: Record<string, { name: string; phone: string; department: string }> = {
    '22222222-2222-2222-2222-222222222222': { name: 'Priya Sharma', phone: '+91 98765 43210', department: 'Engineering' },
    '33333333-3333-3333-3333-333333333333': { name: 'Anjali Mehta', phone: '+91 98765 43211', department: 'Human Resources' },
    '44444444-4444-4444-4444-444444444444': { name: 'Justice Raman', phone: '+91 98765 43212', department: 'Legal' },
};

// ─── Component ──────────────────────────────────────────────────────────────

type CallState = 'idle' | 'ringing' | 'connected' | 'ended';

export default function SecurityDashboard() {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<PanicAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<PanicAlert | null>(null);

    // Call simulation state
    const [callState, setCallState] = useState<CallState>('idle');
    const [callTarget, setCallTarget] = useState<{ name: string; phone: string; department: string } | null>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(false);
    const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const fetchAlerts = () => {
            getPanicAlerts(user?.org_id).then((data) => {
                setAlerts(data);
                setLoading(false);
            });
        };
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 10000);
        return () => clearInterval(interval);
    }, [user]);

    const activeAlerts = alerts.filter((a) => a.status === 'active');
    const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');

    const handleResolve = async (alertId: string) => {
        await resolvePanicAlert(alertId);
        setAlerts((prev) =>
            prev.map((a) => a.id === alertId ? { ...a, status: 'resolved', resolved_at: new Date().toISOString() } : a)
        );
        setSelectedAlert(null);
    };

    const getEmployee = (userId: string) =>
        EMPLOYEE_DIRECTORY[userId] || { name: 'Employee', phone: '+91 12345 67890', department: 'Unknown' };

    // ─── Call Simulation ─────────────────────────────────────────────────────

    const startCall = (userId: string) => {
        const emp = getEmployee(userId);
        setCallTarget(emp);
        setCallState('ringing');
        setCallDuration(0);
        setIsMuted(false);
        setIsSpeaker(false);

        // Auto-connect after 3 seconds (simulating ringing)
        ringTimeoutRef.current = setTimeout(() => {
            setCallState((prev) => {
                if (prev === 'ringing') {
                    callTimerRef.current = setInterval(() => {
                        setCallDuration((d) => d + 1);
                    }, 1000);
                    return 'connected';
                }
                return prev;
            });
        }, 3000);
    };

    const endCall = () => {
        setCallState('ended');
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
        if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
        }
        // Auto-dismiss after 2 seconds
        setTimeout(() => {
            setCallState('idle');
            setCallTarget(null);
            setCallDuration(0);
        }, 2000);
    };

    const formatCallTime = (s: number) => {
        const mins = Math.floor(s / 60).toString().padStart(2, '0');
        const secs = (s % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#ef444420' }}>
                        <Siren size={20} className="text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">🚨 Security Command Center</h1>
                        <p className="text-sm text-slate-400">Live panic alert monitoring and incident response</p>
                    </div>
                </div>
                {activeAlerts.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl animate-pulse" style={{ background: '#ef444420', border: '1px solid #ef444440' }}>
                        <Radio size={16} className="text-red-400" />
                        <span className="text-sm font-bold text-red-400">{activeAlerts.length} ACTIVE ALERT{activeAlerts.length > 1 ? 'S' : ''}</span>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Active Alerts', value: activeAlerts.length, color: '#ef4444', icon: <AlertTriangle size={18} /> },
                    { label: 'Total Today', value: alerts.length, color: '#f5a623', icon: <Clock size={18} /> },
                    { label: 'Resolved', value: resolvedAlerts.length, color: '#10b981', icon: <CheckCircle size={18} /> },
                    { label: 'Avg Response', value: '2.3 min', color: '#3b82f6', icon: <Shield size={18} /> },
                ].map((s) => (
                    <div key={s.label} className="glass-card flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                            <span style={{ color: s.color }}>{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                            <p className="text-[10px] text-slate-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="glass-card text-center py-12">
                    <p className="text-2xl mb-3 animate-pulse">⏳</p>
                    <p className="text-slate-400">Loading alerts...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Map Area */}
                    <div className="lg:col-span-2 glass-card min-h-[400px]">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <MapPin size={16} className="text-red-400" /> Live Incident Map
                        </h3>

                        <div className="relative w-full h-[350px] rounded-xl overflow-hidden" style={{ background: '#0d0a1a', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="absolute inset-0" style={{
                                backgroundImage: `
                                    linear-gradient(rgba(168,85,247,0.05) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(168,85,247,0.05) 1px, transparent 1px)`,
                                backgroundSize: '40px 40px',
                            }} />

                            <div className="absolute inset-0 flex items-end justify-center pb-4">
                                <p className="text-xs text-slate-500">🏢 ACME Corp Campus • Bangalore</p>
                            </div>

                            {alerts.map((a, i) => {
                                const isActive = a.status === 'active';
                                const emp = getEmployee(a.user_id);
                                const positions = [
                                    { x: 35, y: 30 }, { x: 65, y: 55 }, { x: 25, y: 65 },
                                    { x: 70, y: 25 }, { x: 50, y: 75 }, { x: 80, y: 45 },
                                ];
                                const pos = positions[i % positions.length];

                                return (
                                    <button
                                        key={a.id}
                                        onClick={() => setSelectedAlert(a)}
                                        className="absolute group transition-transform hover:scale-125"
                                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                                    >
                                        {isActive && (
                                            <div className="absolute inset-0 w-8 h-8 rounded-full animate-ping" style={{ background: '#ef444430', left: '-8px', top: '-8px' }} />
                                        )}
                                        <div
                                            className="w-4 h-4 rounded-full relative z-10 border-2"
                                            style={{
                                                background: isActive ? '#ef4444' : '#10b981',
                                                borderColor: isActive ? '#ef4444' : '#10b981',
                                                boxShadow: isActive ? '0 0 20px rgba(239,68,68,0.5)' : 'none',
                                            }}
                                        />
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1533] px-2 py-1 rounded-lg text-[10px] text-white whitespace-nowrap border border-white/10 z-20">
                                            {emp.name} • {SOURCE_LABELS[a.source] || a.source}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Alert Feed */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <Radio size={14} className="text-red-400" /> Alert Feed
                        </h3>

                        {alerts.length === 0 ? (
                            <div className="glass-card text-center py-8">
                                <p className="text-3xl mb-2">✅</p>
                                <p className="text-sm text-slate-400">All clear — no alerts</p>
                            </div>
                        ) : (
                            alerts.map((a) => {
                                const s = STATUS_STYLES[a.status] || STATUS_STYLES.active;
                                const emp = getEmployee(a.user_id);
                                return (
                                    <div
                                        key={a.id}
                                        className="glass-card w-full text-left transition-all hover:scale-[1.01]"
                                        style={{ borderColor: selectedAlert?.id === a.id ? s.color + '40' : 'transparent' }}
                                    >
                                        <button onClick={() => setSelectedAlert(a)} className="w-full text-left">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: s.bg }}>
                                                    <AlertTriangle size={14} style={{ color: s.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.label}</span>
                                                        <span className="text-[10px] text-slate-500">{SOURCE_LABELS[a.source]}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-300 font-medium">{emp.name} • {emp.department}</p>
                                                    <p className="text-xs text-slate-400">📍 {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</p>
                                                    <p className="text-[10px] text-slate-600 mt-1">{new Date(a.created_at).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        </button>
                                        {a.status === 'active' && (
                                            <button
                                                onClick={() => startCall(a.user_id)}
                                                className="mt-2 w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                                                style={{ background: '#3b82f615', color: '#3b82f6', border: '1px solid #3b82f625' }}
                                            >
                                                <Phone size={13} /> Call {emp.name}
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                 ALERT DETAIL MODAL
                 ══════════════════════════════════════════════════════════════════ */}
            {selectedAlert && (() => {
                const emp = getEmployee(selectedAlert.user_id);
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedAlert(null)}>
                        <div className="glass-card max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()} style={{ background: '#1a1533', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🚨 Alert Details</h3>

                            <div className="space-y-3 text-sm mb-6">
                                <div className="flex justify-between"><span className="text-slate-500">Employee</span><span className="font-medium">{emp.name}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Department</span><span>{emp.department}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="text-blue-400">{emp.phone}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Source</span><span>{SOURCE_LABELS[selectedAlert.source]}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-bold" style={{ color: STATUS_STYLES[selectedAlert.status]?.color }}>{STATUS_STYLES[selectedAlert.status]?.label}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Location</span><span>📍 {selectedAlert.latitude.toFixed(4)}, {selectedAlert.longitude.toFixed(4)}</span></div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Map</span>
                                    <a href={`https://maps.google.com/?q=${selectedAlert.latitude},${selectedAlert.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                        Open in Google Maps →
                                    </a>
                                </div>
                                <div className="flex justify-between"><span className="text-slate-500">Time</span><span>{new Date(selectedAlert.created_at).toLocaleString()}</span></div>
                            </div>

                            <div className="flex gap-3">
                                {selectedAlert.status === 'active' && (
                                    <>
                                        <button
                                            onClick={() => { setSelectedAlert(null); startCall(selectedAlert.user_id); }}
                                            className="flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                                            style={{ background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f630' }}
                                        >
                                            <Phone size={16} /> Call {emp.name}
                                        </button>
                                        <button
                                            onClick={() => handleResolve(selectedAlert.id)}
                                            className="flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                                            style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98130' }}
                                        >
                                            <CheckCircle size={16} /> Resolve
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setSelectedAlert(null)} className="flex-1 py-2.5 rounded-xl font-medium text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ══════════════════════════════════════════════════════════════════
                 IN-APP CALL SIMULATION OVERLAY
                 ══════════════════════════════════════════════════════════════════ */}
            {callState !== 'idle' && callTarget && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(180deg, #0f0a24 0%, #1a0a2e 40%, #2d1548 100%)',
                    }}
                >
                    <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6">

                        {/* ── RINGING ─────────────────────────────────────────── */}
                        {callState === 'ringing' && (
                            <>
                                {/* Animated pulse rings */}
                                <div className="relative w-36 h-36 flex items-center justify-center">
                                    <div
                                        className="absolute inset-0 rounded-full animate-ping"
                                        style={{ background: '#3b82f608', animationDuration: '1.5s' }}
                                    />
                                    <div
                                        className="absolute inset-3 rounded-full animate-ping"
                                        style={{ background: '#3b82f610', animationDuration: '2s' }}
                                    />
                                    <div
                                        className="absolute inset-6 rounded-full"
                                        style={{ background: '#3b82f618' }}
                                    />
                                    {/* Avatar circle */}
                                    <div
                                        className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold relative z-10 select-none"
                                        style={{
                                            background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                                            boxShadow: '0 0 60px rgba(59,130,246,0.4)',
                                            color: '#fff',
                                        }}
                                    >
                                        {callTarget.name.split(' ').map((n) => n[0]).join('')}
                                    </div>
                                </div>

                                <div className="text-center">
                                    <p className="text-xl font-bold text-white">{callTarget.name}</p>
                                    <p className="text-sm text-slate-400 mt-1">{callTarget.department}</p>
                                    <p className="text-sm text-blue-400 mt-1 font-mono tracking-wide">{callTarget.phone}</p>
                                </div>

                                <div className="flex items-center gap-2 text-slate-400 animate-pulse mt-2">
                                    <Phone size={16} className="animate-bounce" />
                                    <span className="text-sm tracking-wider">Calling...</span>
                                </div>
                            </>
                        )}

                        {/* ── CONNECTED ────────────────────────────────────────── */}
                        {callState === 'connected' && (
                            <>
                                {/* Avatar with green ring */}
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <div
                                        className="absolute inset-0 rounded-full"
                                        style={{
                                            border: '3px solid #10b981',
                                            boxShadow: '0 0 30px rgba(16,185,129,0.25)',
                                        }}
                                    />
                                    <div
                                        className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold select-none"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                                            color: '#fff',
                                        }}
                                    >
                                        {callTarget.name.split(' ').map((n) => n[0]).join('')}
                                    </div>
                                </div>

                                <div className="text-center">
                                    <p className="text-xl font-bold text-white">{callTarget.name}</p>
                                    <p className="text-sm text-slate-400">{callTarget.department}</p>
                                </div>

                                {/* Live call timer */}
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-2xl font-mono text-emerald-400 tracking-widest">
                                        {formatCallTime(callDuration)}
                                    </span>
                                </div>

                                {/* Call controls */}
                                <div className="flex items-center gap-8 mt-4">
                                    {/* Mute */}
                                    <button
                                        onClick={() => setIsMuted(!isMuted)}
                                        className="flex flex-col items-center gap-1.5 group"
                                    >
                                        <div
                                            className="w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                                            style={{
                                                background: isMuted ? '#ef444425' : 'rgba(255,255,255,0.06)',
                                                border: `1px solid ${isMuted ? '#ef444440' : 'rgba(255,255,255,0.12)'}`,
                                            }}
                                        >
                                            {isMuted
                                                ? <MicOff size={20} className="text-red-400" />
                                                : <Mic size={20} className="text-white/80" />
                                            }
                                        </div>
                                        <span className="text-[10px] text-slate-500">{isMuted ? 'Unmute' : 'Mute'}</span>
                                    </button>

                                    {/* Speaker */}
                                    <button
                                        onClick={() => setIsSpeaker(!isSpeaker)}
                                        className="flex flex-col items-center gap-1.5 group"
                                    >
                                        <div
                                            className="w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                                            style={{
                                                background: isSpeaker ? '#3b82f625' : 'rgba(255,255,255,0.06)',
                                                border: `1px solid ${isSpeaker ? '#3b82f640' : 'rgba(255,255,255,0.12)'}`,
                                            }}
                                        >
                                            <Volume2 size={20} className={isSpeaker ? 'text-blue-400' : 'text-white/80'} />
                                        </div>
                                        <span className="text-[10px] text-slate-500">Speaker</span>
                                    </button>

                                    {/* Location */}
                                    <button className="flex flex-col items-center gap-1.5 group">
                                        <div
                                            className="w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                                        >
                                            <MapPin size={20} className="text-white/80" />
                                        </div>
                                        <span className="text-[10px] text-slate-500">Location</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── ENDED ────────────────────────────────────────────── */}
                        {callState === 'ended' && (
                            <>
                                <div
                                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold select-none"
                                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
                                >
                                    {callTarget.name.split(' ').map((n) => n[0]).join('')}
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-white/70">{callTarget.name}</p>
                                    <p className="text-sm text-slate-500 mt-1">Call ended • {formatCallTime(callDuration)}</p>
                                </div>
                            </>
                        )}

                        {/* End Call button (visible during ringing & connected) */}
                        {(callState === 'ringing' || callState === 'connected') && (
                            <button
                                onClick={endCall}
                                className="mt-8 w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    boxShadow: '0 0 40px rgba(239,68,68,0.35)',
                                }}
                            >
                                <PhoneOff size={24} className="text-white" />
                            </button>
                        )}

                        {/* Label under end call */}
                        {(callState === 'ringing' || callState === 'connected') && (
                            <p className="text-[11px] text-slate-600 -mt-3">End Call</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
