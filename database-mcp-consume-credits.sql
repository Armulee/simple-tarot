-- MCP credits: atomic consume_credits() for the AskingFate MCP server (Task 4).
--
-- The app's stars ("ดวงดาว") are the credits. The existing public.star_spend()
-- RPC already performs an atomic check-and-decrement across the daily / plan /
-- addon pools, so concurrent calls can't overspend. This is a thin, clearly
-- named wrapper over it (per the brief) for authenticated MCP users.
--
-- Returns TRUE when the cost was charged, FALSE when the balance was
-- insufficient (nothing is deducted in that case).
--
-- NOTE: lib/mcp/credits.ts currently calls star_spend() directly (guaranteed to
-- exist). Applying this function lets it switch to consume_credits(user, cost)
-- if you prefer the dedicated name — both paths share the same atomic logic.

create or replace function public.consume_credits(p_user uuid, p_cost int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if p_user is null or coalesce(p_cost, 0) <= 0 then
    return false;
  end if;

  -- Delegate to the existing atomic spend (anon device id is null for a
  -- logged-in user). star_spend updates the stars row in a single statement,
  -- so this inherits its concurrency safety.
  select ok
    into v_ok
  from public.star_spend(null, p_cost, p_user)
  limit 1;

  return coalesce(v_ok, false);
end
$$;

grant execute on function public.consume_credits(uuid, int)
  to authenticated, service_role;
