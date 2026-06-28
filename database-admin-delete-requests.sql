-- =============================================================================
-- Admin delete-approval requests
-- =============================================================================
-- Every admin bulk/row delete is staged here and only executed after an
-- Approve click from the email sent to admin@askingfate.com. The token is the
-- unguessable secret embedded in the email's Approve/Reject links.
--
-- RLS is enabled with NO policies, so only the service-role key (admin API) can
-- read/write — anon/authenticated have no access. Idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_delete_requests (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token             text NOT NULL UNIQUE,
    resource          text NOT NULL,                 -- 'interpretations' | 'revenue'
    item_ids          jsonb NOT NULL,                -- array of string ids
    details           jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{title, subtitle}]
    requested_by      text,                          -- admin user id
    requested_by_email text,
    status            text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    deleted_count     integer,                       -- rows removed on approval
    created_at        timestamptz NOT NULL DEFAULT now(),
    resolved_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_delete_requests_token
    ON admin_delete_requests(token);
CREATE INDEX IF NOT EXISTS idx_admin_delete_requests_status
    ON admin_delete_requests(status);

ALTER TABLE admin_delete_requests ENABLE ROW LEVEL SECURITY;
