'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/lib/database.types';
import { ArrowRight, Eye, EyeOff, Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';

// ─── Inline SVG Illustrations ───────────────────────────────────────────────

function HeroIllustration() {
    return (
        <svg width="280" height="200" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
            {/* Glow background */}
            <circle cx="160" cy="120" r="100" fill="url(#heroGlow)" opacity="0.15" />
            <circle cx="160" cy="120" r="60" fill="url(#heroGlow)" opacity="0.1" />

            {/* Woman 1 — Center (leader) */}
            <g transform="translate(140, 55)">
                <circle cx="20" cy="12" r="14" fill="#f8c4a0" />
                <path d="M8 6C8 2 14-2 22 0C30 2 34 8 32 14C30 10 26 6 20 5C14 4 10 5 8 6Z" fill="#2d1b4e" />
                <circle cx="15" cy="12" r="1.5" fill="#2d1b4e" />
                <circle cx="25" cy="12" r="1.5" fill="#2d1b4e" />
                <path d="M17 17C17 17 20 20 23 17" stroke="#c8826e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <rect x="8" y="28" width="24" height="45" rx="4" fill="#a855f7" />
                <rect x="8" y="28" width="24" height="18" rx="4" fill="url(#purpleShirt)" />
                <path d="M5 36L8 30" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
                <path d="M35 36L32 30" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
                <circle cx="36" cy="22" r="5" fill="#f8c4a0" />
                <rect x="34" y="18" width="4" height="3" rx="1" fill="#f8c4a0" />
                <rect x="10" y="73" width="8" height="22" rx="3" fill="#a855f7" />
                <rect x="22" y="73" width="8" height="22" rx="3" fill="#a855f7" />
                <ellipse cx="14" cy="95" rx="5" ry="3" fill="#7c3aed" />
                <ellipse cx="26" cy="95" rx="5" ry="3" fill="#7c3aed" />
            </g>

            {/* Woman 2 — Left */}
            <g transform="translate(60, 70)">
                <circle cx="18" cy="10" r="12" fill="#d4956b" />
                <path d="M6 4C8-1 16-2 22 0C28 2 30 8 28 12C26 8 22 4 16 4C12 4 8 3 6 4Z" fill="#1a1040" />
                <circle cx="14" cy="10" r="1.2" fill="#1a1040" />
                <circle cx="22" cy="10" r="1.2" fill="#1a1040" />
                <path d="M15 14C15 14 18 16 21 14" stroke="#b8735c" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                <rect x="6" y="24" width="24" height="38" rx="4" fill="#e855a0" />
                <g transform="translate(-12, 10)">
                    <path d="M6 0L12 3V10C12 16 6 20 6 20C6 20 0 16 0 10V3L6 0Z" fill="url(#shieldGrad)" opacity="0.9" />
                    <path d="M3.5 9L5.5 11L8.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </g>
                <rect x="8" y="62" width="7" height="18" rx="3" fill="#e855a0" />
                <rect x="21" y="62" width="7" height="18" rx="3" fill="#e855a0" />
                <ellipse cx="11" cy="80" rx="4" ry="2.5" fill="#c026a3" />
                <ellipse cx="25" cy="80" rx="4" ry="2.5" fill="#c026a3" />
            </g>

            {/* Woman 3 — Right */}
            <g transform="translate(220, 70)">
                <circle cx="18" cy="10" r="12" fill="#f0d4b8" />
                <path d="M6 2C10-2 20-2 26 2C28 6 27 10 24 12C22 8 18 4 12 4C8 4 6 3 6 2Z" fill="#3d2060" />
                <circle cx="14" cy="10" r="1.2" fill="#3d2060" />
                <circle cx="22" cy="10" r="1.2" fill="#3d2060" />
                <path d="M15 14C15 14 18 16 21 14" stroke="#c0a080" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                <rect x="6" y="24" width="24" height="38" rx="4" fill="#f5a623" />
                <g transform="translate(30, 8)">
                    <path d="M0 6L8 2V14L0 10V6Z" fill="#f472b6" />
                    <rect x="-3" y="5" width="4" height="6" rx="1" fill="#e855a0" />
                    <path d="M8 4L14 0V16L8 12" fill="#f472b6" opacity="0.7" />
                    <path d="M16 4C18 5 18 11 16 12" stroke="#f472b6" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
                    <path d="M19 2C22 4 22 12 19 14" stroke="#f472b6" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />
                </g>
                <rect x="8" y="62" width="7" height="18" rx="3" fill="#f5a623" />
                <rect x="21" y="62" width="7" height="18" rx="3" fill="#f5a623" />
                <ellipse cx="11" cy="80" rx="4" ry="2.5" fill="#d98e1c" />
                <ellipse cx="25" cy="80" rx="4" ry="2.5" fill="#d98e1c" />
            </g>

            {/* Sparkles */}
            <g opacity="0.6">
                <path d="M50 40L52 35L54 40L52 45Z" fill="#f472b6" />
                <path d="M270 30L272 25L274 30L272 35Z" fill="#a855f7" />
                <path d="M120 20L121 17L122 20L121 23Z" fill="#f5a623" />
                <path d="M200 180L202 175L204 180L202 185Z" fill="#e855a0" />
                <circle cx="90" cy="190" r="2" fill="#a855f7" opacity="0.5" />
                <circle cx="240" cy="185" r="2" fill="#f472b6" opacity="0.5" />
            </g>

            {/* Hearts */}
            <g opacity="0.4">
                <path d="M80 25C80 22 84 20 86 23C88 20 92 22 92 25C92 30 86 34 86 34C86 34 80 30 80 25Z" fill="#e855a0" />
                <path d="M250 50C250 48 252 47 253 48.5C254 47 256 48 256 50C256 52.5 253 54 253 54C253 54 250 52.5 250 50Z" fill="#f472b6" />
            </g>

            {/* Gradient defs */}
            <defs>
                <radialGradient id="heroGlow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="#e855a0" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <linearGradient id="purpleShirt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="100%" stopColor="#e855a0" />
                </linearGradient>
            </defs>
        </svg>
    );
}

// ─── Floating Particles Background ──────────────────────────────────────────

function FloatingParticles() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <style>{`
                @keyframes float1 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(30px,-40px) rotate(180deg); } }
                @keyframes float2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-20px,30px); } }
                @keyframes float3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(15px,-25px) scale(1.2); } }
                .particle { position: absolute; border-radius: 50%; }
            `}</style>
            <div className="particle" style={{ width: 6, height: 6, background: '#e855a0', top: '15%', left: '10%', opacity: 0.3, animation: 'float1 8s ease-in-out infinite' }} />
            <div className="particle" style={{ width: 4, height: 4, background: '#a855f7', top: '25%', right: '15%', opacity: 0.25, animation: 'float2 10s ease-in-out infinite' }} />
            <div className="particle" style={{ width: 5, height: 5, background: '#f5a623', bottom: '30%', left: '20%', opacity: 0.2, animation: 'float3 12s ease-in-out infinite' }} />
            <div className="particle" style={{ width: 3, height: 3, background: '#f472b6', top: '60%', right: '25%', opacity: 0.3, animation: 'float1 9s ease-in-out infinite 2s' }} />
            <div className="particle" style={{ width: 8, height: 8, background: '#a855f7', bottom: '15%', right: '10%', opacity: 0.15, animation: 'float2 11s ease-in-out infinite 1s' }} />
        </div>
    );
}

// ─── Role Options ───────────────────────────────────────────────────────────
const ROLE_OPTIONS: { role: UserRole; label: string; color: string; emoji: string }[] = [
    { role: 'employee', label: 'Employee', color: '#e855a0', emoji: '👩‍💻' },
    { role: 'hr', label: 'HR Admin', color: '#a855f7', emoji: '👩‍💼' },
    { role: 'icc', label: 'ICC Member', color: '#f5a623', emoji: '⚖️' },
    { role: 'security', label: 'Security', color: '#10b981', emoji: '🛡️' },
];

const ROLE_REDIRECTS: Record<UserRole, string> = {
    employee: '/employee',
    hr: '/hr',
    icc: '/icc',
    security: '/security',
};

// ─── Login Page ─────────────────────────────────────────────────────────────

export default function LoginPage() {
    const router = useRouter();
    const { signIn, signUp, resendVerification, user } = useAuth();

    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>('employee');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [resendLoading, setResendLoading] = useState(false);

    // Check if the error is about unverified email
    const isVerificationError = error?.toLowerCase().includes('not verified') || error?.toLowerCase().includes('not confirmed') || error?.toLowerCase().includes('verification');

    // If already logged in, redirect based on role
    useEffect(() => {
        if (user) {
            router.push(ROLE_REDIRECTS[user.role]);
        }
    }, [user, router]);

    if (user) return null; // Prevent rendering login form while redirecting

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        if (mode === 'login') {
            const err = await signIn(email, password);
            if (err) {
                setError(err);
                setLoading(false);
            } else {
                // Auth state listener will set user → the user check above will redirect
                setTimeout(() => setLoading(false), 1500);
            }
        } else {
            if (!name.trim()) {
                setError('Name is required');
                setLoading(false);
                return;
            }
            const err = await signUp(email, password, name.trim(), role);
            if (err) {
                setError(err);
                setLoading(false);
            } else {
                setSuccess('✅ Account created! A verification link has been sent to your email. Please verify before signing in.');
                setMode('login');
                setPassword('');
                setLoading(false);
            }
        }
    };

    const handleResendVerification = async () => {
        if (!email) {
            setError('Please enter your email address first');
            return;
        }
        setResendLoading(true);
        const err = await resendVerification(email);
        if (err) {
            setError(err);
        } else {
            setSuccess('📧 Verification email resent! Please check your inbox (and spam folder).');
            setError(null);
        }
        setResendLoading(false);
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--gradient-hero)' }}>
            <FloatingParticles />

            <div className="w-full max-w-md relative z-10 page-enter">
                {/* Hero */}
                <div className="mb-2" style={{ animation: 'float2 6s ease-in-out infinite' }}>
                    <HeroIllustration />
                </div>

                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-1 tracking-tight">
                        <span className="gradient-text">HearHer</span>
                    </h1>
                    <p className="text-sm" style={{ color: '#a8a0c0' }}>
                        Every voice matters. Every woman deserves safety.
                    </p>
                </div>

                {/* Auth Card */}
                <div className="glass-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Tab Switcher */}
                    <div className="flex rounded-xl overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <button
                            onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                            className="flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                            style={{
                                background: mode === 'login' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                                color: mode === 'login' ? '#c084fc' : '#6b6285',
                                borderBottom: mode === 'login' ? '2px solid #a855f7' : '2px solid transparent',
                            }}
                        >
                            <LogIn size={15} /> Sign In
                        </button>
                        <button
                            onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                            className="flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                            style={{
                                background: mode === 'signup' ? 'rgba(232, 85, 160, 0.15)' : 'transparent',
                                color: mode === 'signup' ? '#f472b6' : '#6b6285',
                                borderBottom: mode === 'signup' ? '2px solid #e855a0' : '2px solid transparent',
                            }}
                        >
                            <UserPlus size={15} /> Sign Up
                        </button>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-4 p-3 rounded-xl text-sm text-center" style={{ background: '#10b98115', border: '1px solid #10b98130', color: '#10b981' }}>
                            {success}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 rounded-xl text-sm text-center" style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444' }}>
                            <p>⚠️ {error}</p>
                            {isVerificationError && (
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={resendLoading}
                                    className="mt-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                                    style={{ background: '#a855f720', color: '#c084fc', border: '1px solid #a855f730' }}
                                >
                                    {resendLoading ? 'Sending...' : '📧 Resend Verification Email'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name (sign up only) */}
                        {mode === 'signup' && (
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Full Name *</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#a855f7] transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Email Address *</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#a855f7] transition-colors"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Password *</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={mode === 'signup' ? 'Min 6 characters' : 'Enter your password'}
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#a855f7] transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Role Selection (sign up only) */}
                        {mode === 'signup' && (
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block font-medium">Select Your Role *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ROLE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.role}
                                            type="button"
                                            onClick={() => setRole(opt.role)}
                                            className="py-2 px-3 rounded-xl text-xs font-medium flex items-center gap-2 transition-all"
                                            style={{
                                                background: role === opt.role ? `${opt.color}20` : 'rgba(255,255,255,0.03)',
                                                border: `1px solid ${role === opt.role ? opt.color + '50' : 'rgba(255,255,255,0.08)'}`,
                                                color: role === opt.role ? opt.color : '#8b82a8',
                                            }}
                                        >
                                            <span>{opt.emoji}</span> {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                            style={{
                                background: mode === 'login'
                                    ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                                    : 'linear-gradient(135deg, #e855a0, #c026a3)',
                                color: 'white',
                                boxShadow: mode === 'login'
                                    ? '0 4px 20px rgba(168,85,247,0.3)'
                                    : '0 4px 20px rgba(232,85,160,0.3)',
                            }}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center mt-4 space-y-1">
                    <p className="text-xs" style={{ color: '#6b6285' }}>
                        🔒 Secured with Supabase Authentication
                    </p>
                    <p className="text-[10px]" style={{ color: '#4a4460' }}>
                        Built with 💜 for safer workplaces
                    </p>
                </div>
            </div>
        </main>
    );
}
