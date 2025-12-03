# Infinity Stars Setup & Troubleshooting

## Step 1: Run Database Migration

**CRITICAL**: You must run the database migration before infinity stars will work!

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the entire contents of `database-infinity-stars.sql`
4. Run the migration

The migration will:

- Add `is_infinity`, `infinity_expires_at`, and `last_currency_before_infinity` columns to the `stars` table
- Update the `star_spend`, `star_get_or_create`, and `star_set` functions

## Step 2: Verify Migration

After running the migration, verify the columns exist:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stars'
AND column_name IN ('is_infinity', 'infinity_expires_at', 'last_currency_before_infinity');
```

You should see all three columns.

## Step 3: Test Infinity Purchase

1. Purchase an infinity pack
2. Check the browser console for any errors
3. Refresh the page to see the infinity icon (∞) in the navbar
4. Check the database directly:

```sql
SELECT user_id, is_infinity, infinity_expires_at, last_currency_before_infinity
FROM stars
WHERE user_id = 'YOUR_USER_ID';
```

## Troubleshooting

### Issue: Infinity not showing after purchase

**Check 1**: Verify migration was run

- Run the verification query above
- If columns don't exist, run the migration

**Check 2**: Check browser console

- Look for errors in the success page
- Should see either "Infinity stars set successfully via RPC" or "Infinity stars set successfully via direct update"

**Check 3**: Check database directly

- Query your user's stars row
- Verify `is_infinity = true` and `infinity_expires_at` is set

**Check 4**: Refresh the page

- The stars context should refresh automatically
- If not, hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Issue: Database columns don't exist

If you get an error about columns not existing:

1. Make sure you ran the migration SQL
2. The migration uses `ADD COLUMN IF NOT EXISTS` so it's safe to run multiple times
3. If columns still don't appear, check for SQL errors in Supabase

### Issue: Function signature mismatch

If you see errors about function parameters:

1. The migration drops and recreates `star_set` with new parameters
2. Make sure the entire migration ran successfully
3. Check Supabase function list to verify `star_set` exists with the new signature

## Manual Fix (if needed)

If the automatic update fails, you can manually set infinity for a user:

```sql
UPDATE stars
SET
  is_infinity = true,
  infinity_expires_at = NOW() + INTERVAL '1 month',
  last_currency_before_infinity = 'USD',  -- or your currency
  updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID';
```

## After Fix

Once infinity is set:

- The navbar should show ∞ icon instead of star count
- The stars page should show ∞ icon
- Stars should not be deducted when using services
- After 1 month, infinity expires automatically
