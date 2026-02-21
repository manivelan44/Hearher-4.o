-- ═══════════════════════════════════════════════════════════════════════════
-- POSH Safety System — Complete Setup Script
-- Run this ONCE in Supabase SQL Editor to set up everything
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Organizations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    logo_url      TEXT,
    policy_text   TEXT,
    settings      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Users ──────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('employee', 'hr', 'icc', 'security'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    role          user_role DEFAULT 'employee',
    avatar_url    TEXT,
    department    TEXT,
    mfa_enabled   BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ─── Complaints ─────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE complaint_type AS ENUM ('verbal', 'physical', 'cyber', 'quid_pro_quo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE complaint_status AS ENUM ('pending', 'investigating', 'resolved', 'closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS complaints (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id         TEXT UNIQUE NOT NULL,
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    complainant_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    is_anonymous    BOOLEAN DEFAULT FALSE,
    type            complaint_type NOT NULL,
    description     TEXT NOT NULL,
    date_of_incident DATE,
    time_of_incident TIME,
    location        TEXT,
    status          complaint_status DEFAULT 'pending',
    severity        INTEGER CHECK (severity BETWEEN 1 AND 10),
    assigned_icc_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ai_analysis     JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_org ON complaints(org_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_severity ON complaints(severity);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);

-- ─── Accused Responses ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accused_responses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id    UUID REFERENCES complaints(id) ON DELETE CASCADE,
    accused_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    statement       TEXT NOT NULL,
    counter_evidence JSONB DEFAULT '[]',
    witnesses       TEXT,
    deadline        TIMESTAMPTZ NOT NULL,
    responded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Complaint Evidence ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_evidence (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id  UUID REFERENCES complaints(id) ON DELETE CASCADE,
    file_url      TEXT NOT NULL,
    file_type     TEXT NOT NULL,
    file_name     TEXT NOT NULL,
    uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Complaint Messages ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_messages (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id  UUID REFERENCES complaints(id) ON DELETE CASCADE,
    sender_type   TEXT CHECK (sender_type IN ('complainant', 'icc')) NOT NULL,
    sender_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    message       TEXT NOT NULL,
    sent_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_complaint ON complaint_messages(complaint_id, sent_at);

-- ─── Complaint Timeline ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_timeline (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id  UUID REFERENCES complaints(id) ON DELETE CASCADE,
    event         TEXT NOT NULL,
    details       TEXT,
    actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    occurred_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_complaint ON complaint_timeline(complaint_id, occurred_at);

-- ─── ICC Members ────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE icc_role AS ENUM ('presiding', 'member', 'external'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS icc_members (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    role          icc_role DEFAULT 'member',
    appointed_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- ─── Panic Alerts ───────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE alert_source AS ENUM ('panic', 'guardian', 'shake'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS panic_alerts (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    status        alert_status DEFAULT 'active',
    source        alert_source NOT NULL,
    message       TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    resolved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_panic_org_status ON panic_alerts(org_id, status);

-- ─── Panic Responses ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS panic_responses (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id      UUID REFERENCES panic_alerts(id) ON DELETE CASCADE,
    responder_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    action        TEXT CHECK (action IN ('acknowledged', 'dispatched', 'resolved', 'escalated')) NOT NULL,
    notes         TEXT,
    responded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Guardian Sessions ──────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE guardian_status AS ENUM ('active', 'checkedin', 'expired', 'escalated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS guardian_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    trusted_contacts JSONB DEFAULT '[]',
    status          guardian_status DEFAULT 'active',
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    next_checkin    TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ
);

-- ─── Evidence Vault ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_vault (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    file_url        TEXT NOT NULL,
    file_type       TEXT NOT NULL,
    description     TEXT,
    linked_complaint UUID REFERENCES complaints(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Chatbot Conversations ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id    TEXT NOT NULL,
    role          TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    message       TEXT NOT NULL,
    sent_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_session ON chatbot_conversations(session_id, sent_at);

-- ─── Organization Ratings ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_ratings (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id            UUID REFERENCES organizations(id) ON DELETE CASCADE,
    overall_score     DOUBLE PRECISION DEFAULT 0,
    response_time_avg DOUBLE PRECISION DEFAULT 0,
    resolution_rate   DOUBLE PRECISION DEFAULT 0,
    posh_compliant    BOOLEAN DEFAULT FALSE,
    badges            JSONB DEFAULT '[]',
    calculated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Pulse Surveys ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse_surveys (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    questions     JSONB NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pulse_responses (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id     UUID REFERENCES pulse_surveys(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    answers       JSONB NOT NULL,
    submitted_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    message       TEXT NOT NULL,
    type          TEXT CHECK (type IN ('info', 'warning', 'success', 'alert')) DEFAULT 'info',
    link          TEXT,
    read          BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- ─── Audit Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    action        TEXT NOT NULL,
    details       JSONB DEFAULT '{}',
    ip_address    TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id, created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: Demo Organization + Users (matching auth-context.tsx IDs)
-- ═══════════════════════════════════════════════════════════════════════════

-- Insert demo organization with a fixed UUID
INSERT INTO organizations (id, name, policy_text) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Acme Corp', 'POSH Policy: Zero tolerance for workplace harassment.')
ON CONFLICT (id) DO NOTHING;

-- Insert demo users with fixed UUIDs
INSERT INTO users (id, org_id, email, name, role, department) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'priya@acmecorp.in', 'Priya Sharma', 'employee', 'Engineering'),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'hr@acmecorp.in', 'Anjali Mehta', 'hr', 'Human Resources'),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'icc@acmecorp.in', 'Justice Raman', 'icc', 'Legal'),
    ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'security@acmecorp.in', 'Rajesh Kumar', 'security', 'Security')
ON CONFLICT (email) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- DISABLE RLS on tables (demo app uses mock auth, not Supabase Auth)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_timeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_evidence DISABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE panic_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_vault DISABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE icc_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE accused_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE panic_responses DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- Junction Table: ICC Committee Assignments (multiple members per complaint)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS complaint_icc_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id    UUID REFERENCES complaints(id) ON DELETE CASCADE,
    icc_user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(complaint_id, icc_user_id)
);

CREATE INDEX IF NOT EXISTS idx_complaint_icc_complaint ON complaint_icc_assignments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_icc_user ON complaint_icc_assignments(icc_user_id);

ALTER TABLE complaint_icc_assignments DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: ICC Members
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO icc_members (org_id, user_id, role) VALUES
    ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'presiding')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS (for Evidence & Panic Recordings)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Users can upload evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence');
CREATE POLICY "Users can view evidence" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'evidence');
CREATE POLICY "Users can update evidence" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'evidence');
CREATE POLICY "Users can delete evidence" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'evidence');

-- ═══════════════════════════════════════════════════════════════════════════
-- Add recording_url to panic_alerts (for sharing recordings with HR/Security)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE panic_alerts ADD COLUMN IF NOT EXISTS recording_url TEXT;
