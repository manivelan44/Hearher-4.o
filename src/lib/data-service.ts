// ─── POSH Safety System — Centralized Data Service ──────────────────────────
// Tries Supabase first, gracefully falls back to mock data if DB errors occur.
// All pages should use these functions instead of importing MOCK_* directly.

import { supabase } from './supabase';
import {
    MOCK_COMPLAINTS,
    MOCK_TIMELINE,
    MOCK_PANIC_ALERTS,
    MOCK_GUARDIAN_SESSIONS,
    MOCK_NOTIFICATIONS,
    MOCK_ORG_RATING,
    MOCK_ICC_MEMBERS,
    MOCK_PULSE_SURVEY,
    MOCK_DASHBOARD_STATS,
} from './mock-data';
import type {
    Complaint,
    ComplaintTimeline,
    PanicAlert,
    GuardianSession,
    Notification,
    OrganizationRating,
    ICCMember,
    PulseSurvey,
    ComplaintType,
} from './database.types';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function caseId(): string {
    return '#' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Check if Supabase is properly configured (not just placeholder keys) */
function isSupabaseReady(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!url && !url.includes('your-project') && url.startsWith('https://');
}

// ═══════════════════════════════════════════════════════════════════════════
// LocalStorage Persistence Helpers (for mock/demo mode)
// ═══════════════════════════════════════════════════════════════════════════

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
    if (typeof window === 'undefined') return [...fallback];
    try {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved) as T[];
    } catch { /* ignore */ }
    return [...fallback];
}

function saveToStorage<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLAINTS
// ═══════════════════════════════════════════════════════════════════════════

// Persisted mock complaints — survives page refresh
const mockComplaints = loadFromStorage<Complaint>('posh_mock_complaints', MOCK_COMPLAINTS);

/** Get all complaints, optionally filtered by org or complainant */
export async function getComplaints(opts?: {
    orgId?: string;
    complainantId?: string;
    status?: string;
}): Promise<Complaint[]> {
    if (isSupabaseReady()) {
        try {
            let query = supabase.from('complaints').select('*').order('created_at', { ascending: false });
            if (opts?.orgId) query = query.eq('org_id', opts.orgId);
            if (opts?.complainantId) query = query.eq('complainant_id', opts.complainantId);
            if (opts?.status && opts.status !== 'all') query = query.eq('status', opts.status);

            const { data, error } = await query;
            if (error) throw error;
            if (data && data.length > 0) {
                // Fetch all ICC assignments for these complaints
                const complaintIds = data.map((c: any) => c.id as string);
                const { data: iccRows } = await supabase
                    .from('complaint_icc_assignments')
                    .select('complaint_id, icc_user_id')
                    .in('complaint_id', complaintIds);

                // Group by complaint_id
                const assignmentMap: Record<string, string[]> = {};
                (iccRows || []).forEach((r: any) => {
                    const cid = r.complaint_id as string;
                    if (!assignmentMap[cid]) assignmentMap[cid] = [];
                    assignmentMap[cid].push(r.icc_user_id as string);
                });

                return data.map((c: any) => ({
                    ...(c as Complaint),
                    assigned_icc_ids: assignmentMap[c.id] || [],
                }));
            }
            if (data) return data as Complaint[];
        } catch (e) {
            console.warn('[data-service] getComplaints fallback to mock:', e);
        }
    }
    // Fallback to mock
    let result = [...mockComplaints];
    if (opts?.status && opts.status !== 'all') result = result.filter((c) => c.status === opts.status);
    return result;
}

/** Get a single complaint by ID */
export async function getComplaintById(id: string): Promise<Complaint | null> {
    if (isSupabaseReady()) {
        try {
            const { data, error } = await supabase.from('complaints').select('*').eq('id', id).single();
            if (error) throw error;
            if (data) {
                // Fetch ICC committee assignments from junction table
                const { data: iccRows } = await supabase
                    .from('complaint_icc_assignments')
                    .select('icc_user_id')
                    .eq('complaint_id', id);
                const iccIds = (iccRows || []).map((r: any) => r.icc_user_id as string);
                return { ...(data as Complaint), assigned_icc_ids: iccIds };
            }
        } catch (e) {
            console.warn('[data-service] getComplaintById fallback to mock:', e);
        }
    }
    return mockComplaints.find((c) => c.id === id) || null;
}

/** Get timeline events for a complaint */
export async function getComplaintTimeline(complaintId: string): Promise<ComplaintTimeline[]> {
    if (isSupabaseReady()) {
        try {
            const { data, error } = await supabase
                .from('complaint_timeline')
                .select('*')
                .eq('complaint_id', complaintId)
                .order('occurred_at', { ascending: true });
            if (error) throw error;
            if (data) return data as ComplaintTimeline[];
        } catch (e) {
            console.warn('[data-service] getComplaintTimeline fallback to mock:', e);
        }
    }
    return MOCK_TIMELINE.filter((t) => t.complaint_id === complaintId);
}

/** Create a new complaint — auto-assigns to ICC member */
export async function createComplaint(input: {
    orgId: string;
    complainantId: string | null;
    isAnonymous: boolean;
    type: ComplaintType;
    description: string;
    dateOfIncident: string;
    timeOfIncident: string;
    location: string;
    severity: number;
    evidenceFiles?: File[];
}): Promise<{ id: string; caseId: string } | null> {
    const newCaseId = caseId();

    if (isSupabaseReady()) {
        try {
            // 1. Find an ICC member in the same org to auto-assign
            let assignedIccId: string | null = null;
            const { data: iccMembers } = await supabase
                .from('icc_members')
                .select('user_id, role')
                .eq('org_id', input.orgId)
                .order('role', { ascending: true }); // presiding first

            if (iccMembers && (iccMembers as any[]).length > 0) {
                assignedIccId = (iccMembers as any[])[0].user_id as string;
            }

            // 2. Create complaint with auto-assignment
            const { data, error } = await supabase
                .from('complaints')
                .insert({
                    case_id: newCaseId,
                    org_id: input.orgId,
                    complainant_id: input.isAnonymous ? null : input.complainantId,
                    is_anonymous: input.isAnonymous,
                    type: input.type,
                    description: input.description,
                    date_of_incident: input.dateOfIncident,
                    time_of_incident: input.timeOfIncident,
                    location: input.location,
                    severity: input.severity,
                    status: 'investigating', // HR must immediately start the investigation
                    assigned_icc_id: assignedIccId,
                } as Record<string, unknown>)
                .select('id')
                .single();

            if (error) throw error;
            if (data) {
                const complaintId = (data as any).id;

                // 3. Upload evidence files and link to complaint
                if (input.evidenceFiles && input.evidenceFiles.length > 0) {
                    for (const file of input.evidenceFiles) {
                        try {
                            const fileExt = file.name.split('.').pop() || 'bin';
                            const fileName = `${newCaseId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                            const filePath = `${input.orgId}/${complaintId}/${fileName}`;

                            // Upload to Supabase Storage
                            const { error: uploadError } = await supabase.storage
                                .from('evidence')
                                .upload(filePath, file);

                            if (!uploadError) {
                                const { data: publicData } = supabase.storage
                                    .from('evidence')
                                    .getPublicUrl(filePath);

                                // Save to complaint_evidence table
                                await supabase.from('complaint_evidence').insert({
                                    complaint_id: complaintId,
                                    file_url: publicData.publicUrl || filePath,
                                    file_type: file.type || 'document',
                                    file_name: file.name
                                });
                            } else {
                                console.error('Evidence upload failed:', uploadError);
                            }
                        } catch (e) {
                            console.error('Evidence upload exception:', e);
                        }
                    }
                }

                // 4. Add timeline entries for the full auto-assignment flow
                const timelineEntries = [
                    {
                        complaint_id: complaintId,
                        event: 'created',
                        details: input.isAnonymous ? 'Anonymous complaint filed' : 'Complaint filed by employee',
                        actor_id: input.isAnonymous ? null : input.complainantId,
                    },
                    {
                        complaint_id: complaintId,
                        event: 'ai_analyzed',
                        details: `AI assessed severity: ${input.severity}/10`,
                        actor_id: null,
                    },
                    {
                        complaint_id: complaintId,
                        event: 'hr_notified',
                        details: 'HR team notified automatically',
                        actor_id: null,
                    },
                ];

                if (assignedIccId) {
                    timelineEntries.push({
                        complaint_id: complaintId,
                        event: 'assigned',
                        details: 'Auto-assigned to ICC member for investigation',
                        actor_id: assignedIccId,
                    });
                }

                await supabase.from('complaint_timeline').insert(
                    timelineEntries as Record<string, unknown>[]
                );

                return { id: data.id, caseId: newCaseId };
            }
        } catch (e) {
            console.warn('[data-service] createComplaint fallback to mock:', e);
        }
    }

    // Mock fallback — just return a fake ID
    const mockId = 'c-' + Math.random().toString(36).substring(2, 6);
    return { id: mockId, caseId: newCaseId };
}

// ═══════════════════════════════════════════════════════════════════════════
// PANIC ALERTS
// ═══════════════════════════════════════════════════════════════════════════

/** Create a panic alert */
// ─── localStorage helpers for panic alerts (cross-tab sync) ─────────────────

const PANIC_STORAGE_KEY = 'posh_panic_alerts';

function getLocalPanicAlerts(): PanicAlert[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(PANIC_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveLocalPanicAlerts(alerts: PanicAlert[]): void {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(PANIC_STORAGE_KEY, JSON.stringify(alerts)); } catch { }
}

export async function createPanicAlert(input: {
    userId: string;
    orgId: string;
    latitude: number;
    longitude: number;
    source: 'panic' | 'guardian' | 'shake';
    message?: string;
}): Promise<string | null> {
    let supabaseId: string | null = null;

    if (isSupabaseReady()) {
        try {
            const { data, error } = await supabase
                .from('panic_alerts')
                .insert({
                    user_id: input.userId,
                    org_id: input.orgId,
                    latitude: input.latitude,
                    longitude: input.longitude,
                    source: input.source,
                    message: input.message || null,
                    status: 'active',
                } as Record<string, unknown>)
                .select('id')
                .single();

            if (error) {
                console.error('[PANIC] Failed to create panic alert in Supabase:', error.message);
            } else {
                supabaseId = data?.id || null;
                console.log('[PANIC] ✅ Alert created in Supabase:', supabaseId);
            }
        } catch (e: any) {
            console.error('[PANIC] Exception creating alert:', e?.message || e);
        }
    }

    // Always save to localStorage for cross-tab sync (HR dashboard reads this)
    const alertId = supabaseId || 'pa-local-' + Date.now();
    const newAlert: PanicAlert = {
        id: alertId,
        user_id: input.userId,
        org_id: input.orgId,
        latitude: input.latitude,
        longitude: input.longitude,
        status: 'active',
        source: input.source,
        message: input.message || null,
        recording_url: null,
        created_at: new Date().toISOString(),
        resolved_at: null,
    };
    const existing = getLocalPanicAlerts();
    existing.unshift(newAlert);
    saveLocalPanicAlerts(existing);
    console.log('[PANIC] ✅ Alert saved to localStorage for HR dashboard:', alertId);

    return alertId;
}

/** Resolve a panic alert */
export async function resolvePanicAlert(alertId: string): Promise<boolean> {
    // Update localStorage first (instant for HR dashboard)
    const alerts = getLocalPanicAlerts();
    const idx = alerts.findIndex((a) => a.id === alertId);
    if (idx !== -1) {
        alerts[idx].status = 'resolved';
        alerts[idx].resolved_at = new Date().toISOString();
        saveLocalPanicAlerts(alerts);
        console.log('[PANIC] ✅ Alert resolved in localStorage:', alertId);
    }

    if (isSupabaseReady() && !alertId.startsWith('pa-local-')) {
        try {
            const { error } = await supabase
                .from('panic_alerts')
                .update({ status: 'resolved', resolved_at: new Date().toISOString() } as Record<string, unknown>)
                .eq('id', alertId);
            if (error) console.error('[PANIC] Supabase resolve error:', error.message);
        } catch (e: any) {
            console.error('[PANIC] Exception resolving alert:', e?.message || e);
        }
    }
    return true;
}

/** Update live location for an active panic alert */
export async function updatePanicLocation(alertId: string, latitude: number, longitude: number): Promise<boolean> {
    // Update in localStorage first for instant HR dashboard sync
    const alerts = getLocalPanicAlerts();
    const idx = alerts.findIndex((a) => a.id === alertId);
    if (idx !== -1) {
        alerts[idx].latitude = latitude;
        alerts[idx].longitude = longitude;
        saveLocalPanicAlerts(alerts);
    }

    if (isSupabaseReady() && !alertId.startsWith('pa-local-')) {
        try {
            const { error } = await supabase
                .from('panic_alerts')
                .update({ latitude, longitude } as Record<string, unknown>)
                .eq('id', alertId);
            if (error) console.error('[PANIC] Supabase location update error:', error.message);
            else return true;
        } catch (e: any) {
            console.error('[PANIC] Exception updating location:', e?.message || e);
        }
    }
    return idx !== -1;
}

/** Get panic alerts — merges Supabase + localStorage for reliability */
export async function getPanicAlerts(orgId?: string): Promise<PanicAlert[]> {
    let supabaseAlerts: PanicAlert[] = [];

    if (isSupabaseReady()) {
        try {
            let query = supabase.from('panic_alerts').select('*').order('created_at', { ascending: false });
            if (orgId) query = query.eq('org_id', orgId);
            const { data, error } = await query;
            if (error) {
                console.error('[PANIC] Supabase getPanicAlerts error:', error.message);
            } else if (data) {
                supabaseAlerts = data as PanicAlert[];
            }
        } catch (e: any) {
            console.error('[PANIC] Exception fetching alerts:', e?.message || e);
        }
    }

    // Merge with localStorage alerts (deduplicate by id)
    const localAlerts = getLocalPanicAlerts().filter(
        (la) => orgId ? la.org_id === orgId : true
    );
    const seenIds = new Set(supabaseAlerts.map((a) => a.id));
    const merged = [...supabaseAlerts];
    for (const la of localAlerts) {
        if (!seenIds.has(la.id)) {
            merged.push(la);
        } else {
            // If both exist, prefer the localStorage version for location (more up-to-date)
            const sIdx = merged.findIndex((a) => a.id === la.id);
            if (sIdx !== -1 && la.status === 'resolved' && merged[sIdx].status !== 'resolved') {
                merged[sIdx] = la;
            }
        }
    }

    // Sort by created_at descending
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged.length > 0 ? merged : MOCK_PANIC_ALERTS;
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAN SESSIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Create a guardian session */
export async function createGuardianSession(input: {
    userId: string;
    orgId: string;
    durationMinutes: number;
    trustedContacts: { name: string; phone: string; email?: string }[];
}): Promise<string | null> {
    const nextCheckin = new Date(Date.now() + input.durationMinutes * 60 * 1000).toISOString();

    if (isSupabaseReady()) {
        try {
            const { data, error } = await supabase
                .from('guardian_sessions')
                .insert({
                    user_id: input.userId,
                    org_id: input.orgId,
                    duration_minutes: input.durationMinutes,
                    trusted_contacts: input.trustedContacts,
                    status: 'active',
                    next_checkin: nextCheckin,
                } as Record<string, unknown>)
                .select('id')
                .single();
            if (error) throw error;
            return data?.id || null;
        } catch (e) {
            console.warn('[data-service] createGuardianSession fallback:', e);
        }
    }
    return 'gs-mock-' + Date.now();
}

/** Update guardian session status */
export async function updateGuardianSession(
    sessionId: string,
    update: { status?: string; next_checkin?: string; ended_at?: string }
): Promise<boolean> {
    if (isSupabaseReady()) {
        try {
            const { error } = await supabase
                .from('guardian_sessions')
                .update(update as Record<string, unknown>)
                .eq('id', sessionId);
            if (error) throw error;
            return true;
        } catch (e) {
            console.warn('[data-service] updateGuardianSession fallback:', e);
        }
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Get notifications for a user */
export async function getNotifications(userId: string): Promise<Notification[]> {
    if (isSupabaseReady()) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) throw error;
            if (data) return data as Notification[];
        } catch (e) {
            console.warn('[data-service] getNotifications fallback:', e);
        }
    }
    return MOCK_NOTIFICATIONS.filter((n) => n.user_id === userId);
}

/** Mark notification as read */
export async function markNotificationRead(id: string): Promise<boolean> {
    if (isSupabaseReady()) {
        try {
            const { error } = await supabase.from('notifications').update({ read: true } as Record<string, unknown>).eq('id', id);
            if (error) throw error;
            return true;
        } catch (e) {
            console.warn('[data-service] markNotificationRead fallback:', e);
        }
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE VAULT
// ═══════════════════════════════════════════════════════════════════════════

export interface VaultItem {
    id: string;
    name: string;
    type: 'image' | 'audio' | 'document' | 'video';
    size: string;
    linked: boolean;
    date: string;
    source: 'complaint' | 'vault' | 'panic';
    caseId?: string;
    url?: string;
}

const MOCK_VAULT: VaultItem[] = [
    { id: 'v-1', name: 'chat_screenshot_01.png', type: 'image', size: '2.4 MB', linked: true, date: '2026-02-14', source: 'complaint', caseId: 'POSH-2026-001', url: '#' },
    { id: 'v-2', name: 'voice_recording.mp3', type: 'audio', size: '1.1 MB', linked: true, date: '2026-02-12', source: 'complaint', caseId: 'POSH-2026-001', url: '#' },
    { id: 'v-3', name: 'email_evidence.pdf', type: 'document', size: '340 KB', linked: true, date: '2026-02-10', source: 'complaint', caseId: 'POSH-2026-002', url: '#' },
    { id: 'v-4', name: 'cctv_clip.mp4', type: 'video', size: '8.2 MB', linked: false, date: '2026-02-08', source: 'vault', url: '#' },
];

/** Get evidence vault items for a user — merges evidence_vault + complaint_evidence */
export async function getEvidenceVault(userId: string): Promise<VaultItem[]> {
    if (isSupabaseReady()) {
        try {
            const items: VaultItem[] = [];

            // 1. Fetch from evidence_vault table
            const { data: vaultData } = await supabase
                .from('evidence_vault')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (vaultData && vaultData.length > 0) {
                vaultData.forEach((d: any) => {
                    items.push({
                        id: d.id,
                        name: (d.file_url as string).split('/').pop() || 'file',
                        type: mapFileType(d.file_type as string),
                        size: '—',
                        linked: !!(d.linked_complaint),
                        date: new Date(d.created_at as string).toISOString().split('T')[0],
                        source: 'vault',
                        caseId: d.linked_complaint || undefined,
                        url: d.file_url,
                    });
                });
            }

            // 2. Fetch complaint_evidence for complaints filed by this user
            const { data: complaints } = await supabase
                .from('complaints')
                .select('id, case_id')
                .eq('complainant_id', userId);
            if (complaints && complaints.length > 0) {
                const complaintIds = complaints.map((c: any) => c.id as string);
                const caseIdMap: Record<string, string> = {};
                complaints.forEach((c: any) => { caseIdMap[c.id] = c.case_id; });

                const { data: evidenceData } = await supabase
                    .from('complaint_evidence')
                    .select('*')
                    .in('complaint_id', complaintIds)
                    .order('uploaded_at', { ascending: false });
                if (evidenceData && evidenceData.length > 0) {
                    evidenceData.forEach((d: any) => {
                        items.push({
                            id: d.id,
                            name: d.file_name || (d.file_url as string).split('/').pop() || 'file',
                            type: mapFileType(d.file_type as string),
                            size: '—',
                            linked: true,
                            date: new Date(d.uploaded_at as string).toISOString().split('T')[0],
                            source: 'complaint',
                            caseId: caseIdMap[d.complaint_id] || d.complaint_id,
                            url: d.file_url,
                        });
                    });
                }
            }

            // Always return items if supabase succeeded (even if empty) to avoid fallback
            items.sort((a, b) => b.date.localeCompare(a.date));
            return items;

        } catch (e) {
            console.warn('[data-service] getEvidenceVault fallback:', e);
        }
    }
    return MOCK_VAULT;
}

function mapFileType(ft: string): VaultItem['type'] {
    if (ft.startsWith('image')) return 'image';
    if (ft.startsWith('audio')) return 'audio';
    if (ft.startsWith('video')) return 'video';
    return 'document';
}

/** Delete evidence vault item */
export async function deleteEvidenceItem(id: string): Promise<boolean> {
    if (isSupabaseReady()) {
        try {
            const { error } = await supabase.from('evidence_vault').delete().eq('id', id);
            if (error) throw error;
            return true;
        } catch (e) {
            console.warn('[data-service] deleteEvidenceItem fallback:', e);
        }
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ORG RATINGS
// ═══════════════════════════════════════════════════════════════════════════

export async function getOrgRating(orgId: string): Promise<OrganizationRating> {
    if (isSupabaseReady()) {
        try {
            const { data, error } = await supabase
                .from('organization_ratings')
                .select('*')
                .eq('org_id', orgId)
                .order('calculated_at', { ascending: false })
                .limit(1)
                .single();
            if (error) throw error;
            if (data) return data as OrganizationRating;
        } catch (e) {
            console.warn('[data-service] getOrgRating fallback:', e);
        }
    }
    return MOCK_ORG_RATING;
}

// ═══════════════════════════════════════════════════════════════════════════
// ICC MEMBERS
// ═══════════════════════════════════════════════════════════════════════════

// Persisted mock ICC members — survives page refresh
const mockIccMembers = loadFromStorage<ICCMember>('posh_mock_icc_members', MOCK_ICC_MEMBERS);

export async function getICCMembers(orgId: string): Promise<ICCMember[]> {
    if (isSupabaseReady()) {
        try {
            const { data, error } = await supabase
                .from('icc_members')
                .select('*')
                .eq('org_id', orgId);
            if (error) throw error;
            if (data) return data as ICCMember[];
        } catch (e) {
            console.warn('[data-service] getICCMembers fallback:', e);
        }
    }
    return [...mockIccMembers];
}

/** Add a new ICC member — creates a user record first, then adds to ICC */
export async function addICCMember(input: {
    orgId: string;
    name: string;
    email: string;
    role: 'presiding' | 'member' | 'external';
}): Promise<ICCMember | null> {
    if (isSupabaseReady()) {
        try {
            // 1. Create user record (icc_members.user_id references users.id)
            const { data: userData, error: userError } = await supabase
                .from('users')
                .insert({
                    org_id: input.orgId,
                    email: input.email,
                    name: input.name,
                    role: 'icc',
                    department: input.role === 'external' ? 'External (NGO/Legal)' : 'ICC Committee',
                } as Record<string, unknown>)
                .select('id')
                .single();

            if (userError) throw userError;
            if (!userData) throw new Error('Failed to create user');

            const newUserId = (userData as any).id as string;

            // 2. Insert ICC member record
            const { data: iccData, error: iccError } = await supabase
                .from('icc_members')
                .insert({
                    org_id: input.orgId,
                    user_id: newUserId,
                    role: input.role,
                } as Record<string, unknown>)
                .select('*')
                .single();

            if (iccError) throw iccError;
            if (iccData) return iccData as ICCMember;
        } catch (e) {
            console.warn('[data-service] addICCMember error:', e);
        }
    }
    // Mock/localStorage fallback
    const mockId = 'icc-m-' + Math.random().toString(36).substring(2, 8);
    const mockUserId = input.name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
    const newMember: ICCMember = {
        id: mockId,
        org_id: input.orgId,
        user_id: mockUserId,
        role: input.role,
        appointed_at: new Date().toISOString(),
    };
    mockIccMembers.push(newMember);
    saveToStorage('posh_mock_icc_members', mockIccMembers);
    return newMember;
}

/** Delete an ICC member by ID */
export async function deleteICCMember(memberId: string): Promise<boolean> {
    if (isSupabaseReady()) {
        try {
            const { error } = await supabase
                .from('icc_members')
                .delete()
                .eq('id', memberId);
            if (error) throw error;
            return true;
        } catch (e) {
            console.warn('[data-service] deleteICCMember error:', e);
        }
    }
    // Mock/localStorage fallback
    const idx = mockIccMembers.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
        mockIccMembers.splice(idx, 1);
        saveToStorage('posh_mock_icc_members', mockIccMembers);
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// PULSE SURVEYS
// ═══════════════════════════════════════════════════════════════════════════

export async function getActivePulseSurvey(orgId: string): Promise<PulseSurvey | null> {
    if (isSupabaseReady()) {
        try {
            const { data, error } = await supabase
                .from('pulse_surveys')
                .select('*')
                .eq('org_id', orgId)
                .eq('is_active', true)
                .limit(1)
                .single();
            if (error) throw error;
            if (data) return data as PulseSurvey;
        } catch (e) {
            console.warn('[data-service] getActivePulseSurvey fallback:', e);
        }
    }
    return MOCK_PULSE_SURVEY;
}

export async function submitPulseResponse(
    surveyId: string,
    userId: string,
    answers: Record<string, string | number>
): Promise<boolean> {
    if (isSupabaseReady()) {
        try {
            const { error } = await supabase.from('pulse_responses').insert({
                survey_id: surveyId,
                user_id: userId,
                answers,
            } as Record<string, unknown>);
            if (error) throw error;
            return true;
        } catch (e) {
            console.warn('[data-service] submitPulseResponse fallback:', e);
        }
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS (HR)
// ═══════════════════════════════════════════════════════════════════════════

export interface DashboardStats {
    totalCases: number;
    activeCases: number;
    resolvedCases: number;
    pendingCases: number;
    avgResolutionDays: number;
    employeeSatisfaction: number;
    panicAlertsThisMonth: number;
    guardianSessionsThisMonth: number;
    complianceScore: number;
    monthlyTrend: { month: string; cases: number }[];
    casesByType: { type: string; count: number }[];
    severityDistribution: { level: string; count: number }[];
}

export async function getDashboardStats(orgId: string): Promise<DashboardStats> {
    if (isSupabaseReady()) {
        try {
            // Try to compute stats from real data
            const { data: complaints, error } = await supabase
                .from('complaints')
                .select('status, type, severity, created_at')
                .eq('org_id', orgId);

            if (!error && complaints && complaints.length > 0) {
                const total = complaints.length;
                const pending = complaints.filter((c) => c.status === 'pending').length;
                const investigating = complaints.filter((c) => c.status === 'investigating').length;
                const resolved = complaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;

                const typeMap: Record<string, number> = {};
                const typeLabels: Record<string, string> = {
                    verbal: 'Verbal', physical: 'Physical', cyber: 'Cyber', quid_pro_quo: 'Quid Pro Quo',
                };
                complaints.forEach((c) => {
                    const label = typeLabels[c.type as string] || (c.type as string);
                    typeMap[label] = (typeMap[label] || 0) + 1;
                });

                const sevMap: Record<string, number> = { 'Low (1-3)': 0, 'Medium (4-6)': 0, 'High (7-8)': 0, 'Critical (9-10)': 0 };
                complaints.forEach((c) => {
                    const s = c.severity as number;
                    if (s <= 3) sevMap['Low (1-3)']++;
                    else if (s <= 6) sevMap['Medium (4-6)']++;
                    else if (s <= 8) sevMap['High (7-8)']++;
                    else sevMap['Critical (9-10)']++;
                });

                return {
                    totalCases: total,
                    activeCases: investigating,
                    resolvedCases: resolved,
                    pendingCases: pending,
                    avgResolutionDays: 18,
                    employeeSatisfaction: 4.1,
                    panicAlertsThisMonth: MOCK_DASHBOARD_STATS.panicAlertsThisMonth,
                    guardianSessionsThisMonth: MOCK_DASHBOARD_STATS.guardianSessionsThisMonth,
                    complianceScore: 92,
                    monthlyTrend: MOCK_DASHBOARD_STATS.monthlyTrend,
                    casesByType: Object.entries(typeMap).map(([type, count]) => ({ type, count })),
                    severityDistribution: Object.entries(sevMap).map(([level, count]) => ({ level, count })),
                };
            }
        } catch (e) {
            console.warn('[data-service] getDashboardStats fallback:', e);
        }
    }
    return MOCK_DASHBOARD_STATS;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLAINT STATUS UPDATE (HR / ICC)
// ═══════════════════════════════════════════════════════════════════════════

export async function updateComplaintStatus(
    complaintId: string,
    status: string,
    actorId?: string
): Promise<boolean> {
    if (isSupabaseReady()) {
        try {
            const { error } = await supabase
                .from('complaints')
                .update({ status, updated_at: new Date().toISOString() } as Record<string, unknown>)
                .eq('id', complaintId);
            if (error) throw error;

            // Add timeline entry
            await supabase.from('complaint_timeline').insert({
                complaint_id: complaintId,
                event: status,
                details: `Status changed to ${status}`,
                actor_id: actorId || null,
            } as Record<string, unknown>);

            return true;
        } catch (e) {
            console.warn('[data-service] updateComplaintStatus fallback:', e);
        }
    }
    // Update mock data so changes persist
    const idx = mockComplaints.findIndex((c) => c.id === complaintId);
    if (idx !== -1) {
        mockComplaints[idx] = { ...mockComplaints[idx], status: status as any, updated_at: new Date().toISOString() };
        saveToStorage('posh_mock_complaints', mockComplaints);
    }
    return true;
}

/** Assign ICC committee (multiple members) to a complaint */
export async function assignICCToComplaint(
    complaintId: string,
    iccUserIds: string[],
    actorId?: string
): Promise<boolean> {
    if (isSupabaseReady()) {
        try {
            // 1. Remove old assignments for this complaint
            await supabase
                .from('complaint_icc_assignments')
                .delete()
                .eq('complaint_id', complaintId);

            // 2. Insert new assignments into junction table
            if (iccUserIds.length > 0) {
                const rows = iccUserIds.map((uid) => ({
                    complaint_id: complaintId,
                    icc_user_id: uid,
                }));
                const { error: insertError } = await supabase
                    .from('complaint_icc_assignments')
                    .insert(rows as Record<string, unknown>[]);
                if (insertError) throw insertError;
            }

            // 3. Update complaint status + legacy assigned_icc_id (keep first member for backward compat)
            const { error: updateError } = await supabase
                .from('complaints')
                .update({
                    assigned_icc_id: iccUserIds.length > 0 ? iccUserIds[0] : null,
                    status: iccUserIds.length > 0 ? 'investigating' : 'pending',
                    updated_at: new Date().toISOString(),
                } as Record<string, unknown>)
                .eq('id', complaintId);
            if (updateError) throw updateError;

            // 4. Add timeline event
            await supabase.from('complaint_timeline').insert({
                complaint_id: complaintId,
                event: 'assigned',
                details: `ICC committee of ${iccUserIds.length} member(s) assigned to case`,
                actor_id: actorId || null,
            } as Record<string, unknown>);

            return true;
        } catch (e) {
            console.warn('[data-service] assignICCToComplaint error:', e);
        }
    }
    // Update mock data so changes persist across pages
    const idx = mockComplaints.findIndex((c) => c.id === complaintId);
    if (idx !== -1) {
        mockComplaints[idx] = {
            ...mockComplaints[idx],
            assigned_icc_ids: [...iccUserIds],
            status: iccUserIds.length > 0 ? 'investigating' : mockComplaints[idx].status,
            updated_at: new Date().toISOString(),
        };
        saveToStorage('posh_mock_complaints', mockComplaints);
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// BYSTANDER REPORT (creates an anonymous complaint)
// ═══════════════════════════════════════════════════════════════════════════

export async function createBystanderReport(input: {
    orgId: string;
    description: string;
    dateOfIncident: string;
    timeOfIncident: string;
    location: string;
    relationship: string;
}): Promise<{ id: string; caseId: string } | null> {
    return createComplaint({
        orgId: input.orgId,
        complainantId: null,
        isAnonymous: true,
        type: 'verbal', // default for bystander
        description: `[Bystander Report — ${input.relationship}]\n\n${input.description}`,
        dateOfIncident: input.dateOfIncident,
        timeOfIncident: input.timeOfIncident || '00:00',
        location: input.location,
        severity: 5,
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════

export async function logAudit(input: {
    orgId: string;
    userId: string;
    action: string;
    details?: Record<string, unknown>;
}): Promise<void> {
    if (isSupabaseReady()) {
        try {
            await supabase.from('audit_logs').insert({
                org_id: input.orgId,
                user_id: input.userId,
                action: input.action,
                details: input.details || {},
            } as Record<string, unknown>);
        } catch (e) {
            console.warn('[data-service] logAudit:', e);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PANIC EVIDENCE 
// ═══════════════════════════════════════════════════════════════════════════

/** Upload panic recording to Evidence Vault AND attach to the panic alert for HR/security */
export async function uploadPanicRecording(alertId: string, userId: string, blob: Blob): Promise<boolean> {
    if (isSupabaseReady()) {
        try {
            const fileExt = blob.type.includes('mp4') ? 'mp4' : 'webm';
            const fileName = `panic_${alertId}_${Date.now()}.${fileExt}`;
            const filePath = `panic/${userId}/${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('evidence')
                .upload(filePath, blob, { contentType: blob.type || 'video/webm' });

            if (uploadError) {
                console.error('Panic recording upload failed:', uploadError);
                return false;
            }

            const { data: publicData } = supabase.storage
                .from('evidence')
                .getPublicUrl(filePath);

            const recordingUrl = publicData.publicUrl || filePath;

            // 2. Save metadata to evidence_vault
            await supabase.from('evidence_vault').insert({
                user_id: userId,
                file_url: recordingUrl,
                file_type: blob.type || 'video/webm',
                linked_complaint: `PANIC-${alertId.substring(0, 8)}`,
            } as Record<string, unknown>);

            // 3. Attach recording URL to the panic_alerts row so HR/security can see it
            await supabase
                .from('panic_alerts')
                .update({ recording_url: recordingUrl } as Record<string, unknown>)
                .eq('id', alertId);

            return true;
        } catch (e) {
            console.error('[data-service] uploadPanicRecording fallback:', e);
        }
    }
    return false;
}
