'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/lib/database.types';
import { ArrowLeft, Sparkles, Mail, Lock, User } from 'lucide-react';
import Link from 'next/link';

const ROLE_OPTIONS: { value: UserRole; label: string; emoji: string }[] = [
    { value: 'employee', label: 'Employee', emoji: '👩‍💻' },
    { value: 'hr', label: 'HR Administrator', emoji: '👩‍💼' },
    { value: 'icc', label: 'ICC Committee Member', emoji: '⚖️' },
    { value: 'security', label: 'Security Personnel', emoji: '🛡️' },
];

export default function RegisterPage() {
    const router = useRouter();
    const { signUp } = useAuth();
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<UserRole>('employee');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password.trim()) {
            setError('All fields are required');
            return;
        }
        setError(null);
        setLoading(true);

        const err = await signUp(email.trim(), password, name.trim(), role);
        if (err) {
            setError(err);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
            <div className="w-full max-w-md page-enter">
                {/* Back Link */}
                <Link href="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors">
                    <ArrowLeft size={16} />
                    <span>Back to login</span>
                </Link>

                <div className="glass-card">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
                            <Sparkles size={12} />
                            <span>Create Account</span>
                        </div>
                        <h1 className="text-2xl font-bold">
                            Join <span className="gradient-text">HearHer</span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Create your verified account</p>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="p-4 rounded-xl text-center mb-4" style={{ background: '#10b98115', border: '1px solid #10b98130' }}>
                            <p className="text-sm font-medium text-emerald-400 mb-1">✅ Account created successfully!</p>
                            <p className="text-xs text-slate-400">Check your email for a verification link, then sign in.</p>
                            <Link href="/login" className="inline-block mt-3 text-sm font-medium text-[#a855f7] hover:underline">
                                ← Go to Sign In
                            </Link>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 rounded-xl text-sm text-center" style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Form */}
                    {!success && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Full Name *</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Your full name"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#a855f7] transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Email *</label>
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

                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Role *</label>
                                <select
                                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#a855f7] transition-colors"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserRole)}
                                >
                                    {ROLE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value} style={{ background: '#1a1533', color: '#fff' }}>
                                            {opt.emoji} {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1.5 block font-medium">Password * (min 6 characters)</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#a855f7] transition-colors"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !name || !email || !password}
                                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white',
                                    boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </form>
                    )}

                    <div className="text-center mt-4">
                        <p className="text-xs" style={{ color: '#6b6285' }}>
                            🔒 Secured with Supabase Authentication
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
