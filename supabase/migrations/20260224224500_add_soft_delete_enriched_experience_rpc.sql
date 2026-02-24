-- Fix enriched experience soft-delete failures under RLS by using owner-checked RPC.
-- 2026-02-24 22:45:00

CREATE OR REPLACE FUNCTION public.soft_delete_enriched_experience(
  target_experience_id UUID,
  deletion_reason TEXT DEFAULT 'user_deleted'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.enriched_experiences
  SET
    deleted_at = now(),
    deleted_reason = COALESCE(deletion_reason, 'user_deleted'),
    updated_at = now()
  WHERE id = target_experience_id
    AND user_id = current_user_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Experience not found or already deleted'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', target_experience_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_enriched_experience(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_enriched_experience(UUID, TEXT) TO authenticated;
