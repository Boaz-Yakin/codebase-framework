-- ==============================================================================
-- Migration: Store-Inv Extension Tables & RPC
-- Description: 대형 매장 현장 실사 및 자동 보충 발주 시스템 전용 테이블 및 발주 생성 RPC
-- Target DB: WMS 공통 Supabase (PostgreSQL 14.5)
-- ==============================================================================

-- 1. 매장별 품목 기준 적정 재고 (PAR Level) 및 진열 순서 테이블
CREATE TABLE IF NOT EXISTS public.store_item_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    par_level INTEGER NOT NULL DEFAULT 0 CHECK (par_level >= 0),
    min_order_qty INTEGER NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(store_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_store_item_targets_store ON public.store_item_targets(store_id, display_order);
CREATE INDEX IF NOT EXISTS idx_store_item_targets_item ON public.store_item_targets(item_id);

-- 2. 매장별 PAR 변경 이력 테이블 (Audit Trail)
CREATE TABLE IF NOT EXISTS public.store_target_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    old_par INTEGER NOT NULL,
    new_par INTEGER NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_target_logs ON public.store_target_logs(store_id, item_id, created_at DESC);

-- 3. 실사 세션 상태 ENUM
DO $$ BEGIN
    CREATE TYPE public.audit_status AS ENUM ('in_progress', 'submitted', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. 매장 실사 세션 헤더 테이블
CREATE TABLE IF NOT EXISTS public.inventory_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    auditor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status public.audit_status NOT NULL DEFAULT 'in_progress',
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_audits_store ON public.inventory_audits(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_audits_order ON public.inventory_audits(order_id);

-- 4. 실사 품목 상세 내역 테이블
CREATE TABLE IF NOT EXISTS public.inventory_audit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL REFERENCES public.inventory_audits(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    physical_count INTEGER NOT NULL DEFAULT 0 CHECK (physical_count >= 0),
    target_par INTEGER NOT NULL DEFAULT 0,
    deficit_qty INTEGER NOT NULL DEFAULT 0,
    suggested_order_qty INTEGER NOT NULL DEFAULT 0,
    final_order_qty INTEGER NOT NULL DEFAULT 0 CHECK (final_order_qty >= 0),
    adjustment_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(audit_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_audit_items_audit ON public.inventory_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_items_item ON public.inventory_audit_items(item_id);

-- 5. WMS orders / order_items 발주 원자적 생성 함수 (RPC)
CREATE OR REPLACE FUNCTION public.submit_store_audit_order(
    p_audit_id UUID,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_audit RECORD;
    v_order_id UUID;
    v_order_no TEXT;
    v_client_id UUID;
    v_today TEXT;
    v_seq INT;
BEGIN
    -- 1. 실사 세션 유효성 확인
    SELECT * INTO v_audit FROM public.inventory_audits 
    WHERE id = p_audit_id AND status = 'in_progress' FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit session not found or already submitted';
    END IF;

    -- 2. 주문 번호 채번 (SO-YYYYMMDD-XXXX)
    v_today := to_char(now(), 'YYYYMMDD');
    SELECT count(*) + 1 INTO v_seq FROM public.orders 
    WHERE order_no LIKE 'SO-' || v_today || '-%';
    v_order_no := 'SO-' || v_today || '-' || lpad(v_seq::text, 4, '0');

    -- 3. 매장 대표 client_id 조회
    SELECT client_id INTO v_client_id FROM public.items WHERE is_active = true LIMIT 1;

    -- 4. WMS orders 테이블에 등록 (상태: PENDING)
    INSERT INTO public.orders (
        order_no,
        store_id,
        client_id,
        status,
        order_date,
        note,
        user_id
    ) VALUES (
        v_order_no,
        v_audit.store_id,
        v_client_id,
        'PENDING',
        now()::date::text,
        COALESCE(p_notes, '[Store-Inv] Food Depot 실사 자동 보충 발주'),
        p_user_id
    ) RETURNING id INTO v_order_id;

    -- 5. 발주 수량이 있는 품목을 order_items에 일괄 삽입
    INSERT INTO public.order_items (
        order_id,
        item_id,
        qty,
        price,
        uom
    )
    SELECT 
        v_order_id,
        ai.item_id,
        ai.final_order_qty,
        COALESCE(i.unit_price, 0),
        COALESCE(i.uom, 'EA')
    FROM public.inventory_audit_items ai
    JOIN public.items i ON i.id = ai.item_id
    WHERE ai.audit_id = p_audit_id AND ai.final_order_qty > 0;

    -- 6. 실사 세션 완료 처리
    UPDATE public.inventory_audits
    SET status = 'submitted',
        order_id = v_order_id,
        submitted_at = now(),
        notes = p_notes,
        updated_at = now()
    WHERE id = p_audit_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- 7. 매장 간 PAR 기준 복사 함수 (Clone Store Targets)
CREATE OR REPLACE FUNCTION public.clone_store_targets(
    p_source_store_id UUID,
    p_target_store_id UUID,
    p_overwrite BOOLEAN DEFAULT false
) RETURNS INTEGER AS $$
DECLARE
    v_copied_count INT;
BEGIN
    IF p_overwrite THEN
        DELETE FROM public.store_item_targets WHERE store_id = p_target_store_id;
    END IF;

    INSERT INTO public.store_item_targets (
        store_id,
        item_id,
        par_level,
        min_order_qty,
        display_order,
        is_active
    )
    SELECT 
        p_target_store_id,
        item_id,
        par_level,
        min_order_qty,
        display_order,
        is_active
    FROM public.store_item_targets
    WHERE store_id = p_source_store_id
    ON CONFLICT (store_id, item_id) DO UPDATE
    SET par_level = EXCLUDED.par_level,
        min_order_qty = EXCLUDED.min_order_qty,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active,
        updated_at = now();

    GET DIAGNOSTICS v_copied_count = ROW_COUNT;
    RETURN v_copied_count;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS 활성화 및 기본 정책 (인증 사용자 접근 허용)
ALTER TABLE public.store_item_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_target_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated read targets" ON public.store_item_targets FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Allow authenticated modify targets" ON public.store_item_targets FOR ALL TO authenticated USING (true);
    CREATE POLICY "Allow authenticated logs" ON public.store_target_logs FOR ALL TO authenticated USING (true);
    CREATE POLICY "Allow authenticated audits" ON public.inventory_audits FOR ALL TO authenticated USING (true);
    CREATE POLICY "Allow authenticated audit items" ON public.inventory_audit_items FOR ALL TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
