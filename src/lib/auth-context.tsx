'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import type { User, UserRole } from './database.types';

// ─── Auth Context Types ─────────────────────────────────────────────────────

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<string | null>;
    signUp: (email: string, password: string, name: string, role: UserRole) => Promise<string | null>;
    signOut: () => void;
    switchRole: (role: UserRole) => void;
    signInAsRole: (role: UserRole) => void;
    resendVerification: (email: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Demo Users (fallback when Supabase Auth is not configured) ─────────────
const DEMO_USERS: Record<UserRole, User> = {
    employee: {
        id: '22222222-2222-2222-2222-222222222222',
        org_id: '11111111-1111-1111-1111-111111111111',
        email: 'priya@acmecorp.in',
        name: 'Priya Sharma',
        role: 'employee',
        avatar_url: null,
        department: 'Engineering',
        phone: '+919876543210',
        mfa_enabled: false,
        created_at: new Date().toISOString(),
    },
    hr: {
        id: '33333333-3333-3333-3333-333333333333',
        org_id: '11111111-1111-1111-1111-111111111111',
        email: 'hr@acmecorp.in',
        name: 'Anjali Mehta',
        role: 'hr',
        avatar_url: null,
        department: 'Human Resources',
        mfa_enabled: true,
        created_at: new Date().toISOString(),
    },
    icc: {
        id: '44444444-4444-4444-4444-444444444444',
        org_id: '11111111-1111-1111-1111-111111111111',
        email: 'icc@acmecorp.in',
        name: 'Justice Raman',
        role: 'icc',
        avatar_url: null,
        department: 'Legal',
        mfa_enabled: true,
        created_at: new Date().toISOString(),
    },
    security: {
        id: '55555555-5555-5555-5555-555555555555',
        org_id: '11111111-1111-1111-1111-111111111111',
        email: 'security@acmecorp.in',
        name: 'Rajesh Kumar',
        role: 'security',
        avatar_url: null,
        department: 'Security',
        mfa_enabled: false,
        created_at: new Date().toISOString(),
    },
};

// ─── Auth Provider ──────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Check for existing Supabase session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    // Fetch user profile from our users table
                    const { data: profile } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', session.user.email || '')
                        .single();
                    if (profile) {
                        setUser(profile as User);
                        setLoading(false);
                        return;
                    }
                }
            } catch {
                // Supabase Auth not available, fall through to demo check
            }
            // Fallback: check for demo session
            const savedRole = localStorage.getItem('posh_demo_role') as UserRole | null;
            if (savedRole && DEMO_USERS[savedRole]) {
                setUser(DEMO_USERS[savedRole]);
            }
            setLoading(false);
        };
        checkSession();

        // Listen for Supabase auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user?.email) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', session.user.email)
                    .single();
                if (profile) {
                    setUser(profile as User);
                    localStorage.removeItem('posh_demo_role');
                    return;
                }
            }
            // If signed out and no demo role, clear user
            if (!session && !localStorage.getItem('posh_demo_role')) {
                setUser(null);
            }
        });

        return () => { subscription.unsubscribe(); };
    }, []);

    /** Sign in with email + password via Supabase Auth — rejects unverified emails */
    const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setLoading(false);
                // Supabase returns "Email not confirmed" for unverified accounts
                if (error.message.toLowerCase().includes('email not confirmed')) {
                    return 'Your email is not verified yet. Please check your inbox and click the verification link before signing in.';
                }
                return error.message;
            }

            // Double-check: ensure email is confirmed
            if (data?.user && !data.user.email_confirmed_at) {
                await supabase.auth.signOut();
                setLoading(false);
                return 'Your email is not verified yet. Please check your inbox (and spam folder) and click the verification link.';
            }

            // Profile will be set by onAuthStateChange listener above
            setLoading(false);
            return null;
        } catch (e: any) {
            setLoading(false);
            return e.message || 'Sign in failed';
        }
    }, []);

    /** Sign up with email + password, then create a profile in the users table */
    const signUp = useCallback(async (email: string, password: string, name: string, role: UserRole): Promise<string | null> => {
        setLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
            if (authError) {
                setLoading(false);
                return authError.message;
            }

            // Create user profile in users table
            if (authData.user) {
                const { error: profileError } = await supabase.from('users').insert({
                    id: authData.user.id,
                    org_id: '11111111-1111-1111-1111-111111111111', // default org
                    email,
                    name,
                    role,
                    department: role === 'hr' ? 'Human Resources' : role === 'security' ? 'Security' : role === 'icc' ? 'Legal' : 'General',
                } as Record<string, unknown>);
                if (profileError) {
                    console.warn('Profile creation warning:', profileError);
                }
            }

            setLoading(false);
            return null;
        } catch (e: any) {
            setLoading(false);
            return e.message || 'Sign up failed';
        }
    }, []);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('posh_demo_role');
    }, []);

    // Demo mode: switch role (kept for backward compat)
    const switchRole = useCallback((role: UserRole) => {
        setUser(DEMO_USERS[role]);
        localStorage.setItem('posh_demo_role', role);
    }, []);

    const signInAsRole = useCallback((role: UserRole) => {
        setUser(DEMO_USERS[role]);
        localStorage.setItem('posh_demo_role', role);
    }, []);

    /** Resend email verification link */
    const resendVerification = useCallback(async (email: string): Promise<string | null> => {
        try {
            const { error } = await supabase.auth.resend({ type: 'signup', email });
            if (error) return error.message;
            return null;
        } catch (e: any) {
            return e.message || 'Failed to resend verification email';
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, switchRole, signInAsRole, resendVerification }}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
