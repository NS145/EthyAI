-- ═══════════════════════════════════════════════════════════════
-- TruthLense - Supabase Database Schema
-- Ethical AI System for Digital Misinformation Detection
-- ═══════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────
-- 1. Users (extends Supabase auth.users)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'reviewer', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────
-- 2. Content (analyzed items)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    input_type TEXT NOT NULL CHECK (input_type IN ('text', 'image', 'video')),
    text_content TEXT,
    storage_paths JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_user ON public.content(user_id);
CREATE INDEX idx_content_status ON public.content(status);
CREATE INDEX idx_content_created ON public.content(created_at DESC);

-- ─────────────────────────────────────────────────
-- 3. Analysis Results
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    verdict TEXT NOT NULL CHECK (verdict IN ('authentic', 'suspicious', 'misinformation')),
    confidence FLOAT,
    probabilities JSONB,
    highlights JSONB DEFAULT '[]',       -- LIME word highlights [{word, weight}]
    shap_values JSONB DEFAULT '[]',      -- SHAP features [{feature, value}]
    evidence JSONB DEFAULT '[]',         -- Evidence items [{title, source, url, similarity, verdict}]
    modules JSONB DEFAULT '[]',          -- Pipeline modules [{name, status, result}]
    language JSONB,                       -- {language, model, is_high_resource}
    modalities TEXT[] DEFAULT '{}',       -- ['text', 'image', 'video']
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_results_content ON public.analysis_results(content_id);
CREATE INDEX idx_results_verdict ON public.analysis_results(verdict);
CREATE INDEX idx_results_score ON public.analysis_results(score);

-- ─────────────────────────────────────────────────
-- 4. Review Queue (HITL)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.review_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    feedback_id UUID,
    reason TEXT,
    priority INTEGER NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approve', 'reject', 'escalate')),
    reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_status ON public.review_queue(status);
CREATE INDEX idx_review_priority ON public.review_queue(priority DESC);
CREATE INDEX idx_review_reviewer ON public.review_queue(reviewer_id);

-- ─────────────────────────────────────────────────
-- 5. Feedback
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('dispute', 'correction', 'report')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_content ON public.feedback(content_id);
CREATE INDEX idx_feedback_user ON public.feedback(user_id);
CREATE INDEX idx_feedback_status ON public.feedback(status);

-- ─────────────────────────────────────────────────
-- 6. Audit Logs
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_action ON public.audit_logs(action);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────────────

-- Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Content
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content"
    ON public.content FOR SELECT
    USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert content"
    ON public.content FOR INSERT
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can view all content"
    ON public.content FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
        )
    );

-- Analysis Results
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view results for own content"
    ON public.analysis_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.content
            WHERE content.id = analysis_results.content_id
            AND (content.user_id = auth.uid() OR content.user_id IS NULL)
        )
    );

CREATE POLICY "Service role can insert results"
    ON public.analysis_results FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view all results"
    ON public.analysis_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
        )
    );

-- Review Queue
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewers and admins can view queue"
    ON public.review_queue FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
        )
    );

CREATE POLICY "Service role can manage queue"
    ON public.review_queue FOR ALL
    WITH CHECK (true);

-- Feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
    ON public.feedback FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can submit feedback"
    ON public.feedback FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
    ON public.feedback FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
        )
    );

-- Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- ─────────────────────────────────────────────────
-- Realtime Subscriptions
-- ─────────────────────────────────────────────────

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_queue;

-- ─────────────────────────────────────────────────
-- Storage Buckets
-- ─────────────────────────────────────────────────

-- Run this in the Supabase Dashboard → Storage:
-- Create bucket "content-uploads" (private)
-- Policies:
--   - Authenticated users can upload to their own folder
--   - Service role has full access

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_updated_at
    BEFORE UPDATE ON public.content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
