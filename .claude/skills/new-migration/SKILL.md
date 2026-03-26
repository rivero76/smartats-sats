---
name: new-migration
description: Create a correctly named and formatted Supabase SQL migration file with RLS policies. Trigger when the user says "add a table", "create migration", "new column", "add index", "alter table", or "migration for X".
---

# New Database Migration

## Step 1 — Generate the timestamp

Use the current UTC datetime as exactly 14 digits: `YYYYMMDDHHMMSS` (no separators, no spaces).

Example: `20260326143022`

If you cannot determine the exact current time, ask the user to confirm the timestamp before writing the file.

## Step 2 — Determine the short description

Lowercase, underscores only, ≤30 characters.

Examples: `add_sats_notifications`, `p19_career_fit`, `add_idx_analyses_user_id`

## Step 3 — Create the file

Path: `supabase/migrations/<timestamp>_<short_description>.sql`

## Step 4 — Write the file

### For a NEW TABLE:

```sql
-- UPDATE LOG
-- YYYY-MM-DD HH:MM:SS | Created — <description of what this migration does>

CREATE TABLE sats_<noun_plural> (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- add domain columns here
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE sats_<noun_plural> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON sats_<noun_plural>
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "owner_insert" ON sats_<noun_plural>
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_update" ON sats_<noun_plural>
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "owner_delete" ON sats_<noun_plural>
  FOR DELETE USING (auth.uid() = user_id);
```

### For an ALTER (add column):

```sql
-- UPDATE LOG
-- YYYY-MM-DD HH:MM:SS | <description>

ALTER TABLE sats_<noun_plural>
  ADD COLUMN <column_name> <type> [DEFAULT <value>] [NOT NULL];
```

### For a new INDEX:

```sql
-- UPDATE LOG
-- YYYY-MM-DD HH:MM:SS | <description>

CREATE INDEX idx_<table>_<column> ON sats_<table> (<column>);
```

## Naming rules

| Rule             | Correct                                     | Wrong                                                 |
| ---------------- | ------------------------------------------- | ----------------------------------------------------- |
| New table prefix | `sats_notifications`                        | `notifications`, `user_notifications`                 |
| Column case      | `snake_case`                                | `camelCase`, `PascalCase`                             |
| Filename         | `20260326143022_add_sats_notifications.sql` | `add_notifications.sql`, `20260326_notifications.sql` |

## Legacy table exceptions — do NOT rename or prefix these

`SATS_resumes`, `document_extractions`, `error_logs`, `profiles`

Any FK referencing these tables must use the existing name as-is.

## Step 5 — Output follow-up commands

After writing the file, always output:

```bash
supabase db push
bash scripts/ops/gen-types.sh
```

Explain: `gen-types.sh` regenerates `src/integrations/supabase/types.ts`. This step is mandatory after every migration — the TypeScript types will be out of sync until it runs. Never edit `types.ts` manually.
