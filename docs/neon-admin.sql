-- Manual plan updates for Neon.
-- Replace the email and plan values before running.

update user_profiles
set
  plan_code = 'pro',
  plan_label = 'Pro',
  pending_plan_code = null,
  payment_status = 'manual_paid',
  updated_at = now()
where lower(email) = lower('user@example.com');

-- Valid plan_code values: free, starter, pro, agency
-- Matching plan_label values: Free, Starter, Pro, Agency

-- Optional: reset the user's monthly credit usage while changing plan.
update user_profiles
set
  plan_code = 'agency',
  plan_label = 'Agency',
  pending_plan_code = null,
  payment_status = 'manual_paid',
  monthly_video_count = 0,
  monthly_video_reset_at = now(),
  updated_at = now()
where lower(email) = lower('user@example.com');

-- Per-user generation history lives here.
-- Each row is tied to user_id and ordered by created_at desc in the app.
select
  id,
  user_id,
  type,
  title,
  url,
  created_at
from generation_outputs
where user_id = 'USER_ID_HERE'
order by created_at desc;

-- Public homepage showcase templates.
-- These are anonymous reusable templates created from image/video generations.
-- The app excludes private video clone and music outputs from this public pool.
select
  id,
  generation_id,
  type,
  title,
  media_url,
  created_at
from public_showcase_templates
order by created_at desc;

-- Backfill existing eligible image/video generations into the public showcase.
insert into public_showcase_templates (
  id,
  generation_id,
  user_id,
  type,
  title,
  prompt,
  media_url,
  thumbnail_url,
  duration_sec,
  metadata,
  created_at,
  updated_at
)
select
  'showcase-' || id,
  id,
  user_id,
  type,
  title,
  coalesce(prompt, title),
  url,
  thumbnail_url,
  duration_sec,
  metadata || '{"source":"manual_backfill","publicTemplate":true}'::jsonb,
  created_at,
  now()
from generation_outputs
where type in ('image', 'text_video', 'image_video')
  and url is not null
  and url <> ''
on conflict (generation_id) do nothing;

-- Remove a public showcase item without deleting the user's private history.
delete from public_showcase_templates
where id = 'SHOWCASE_TEMPLATE_ID_HERE';

-- Developer API keys are stored hashed.
-- The secret key is shown once in the app and is never stored as plain text.
select
  id,
  user_id,
  email,
  name,
  key_prefix,
  scopes,
  request_count,
  last_used_at,
  revoked_at,
  created_at
from developer_api_keys
where user_id = 'USER_ID_HERE'
order by created_at desc;

-- Manual revoke if needed.
update developer_api_keys
set revoked_at = now()
where id = 'API_KEY_ID_HERE';

-- API wallet balance is separate from in-app monthly plan credits.
select
  user_id,
  email,
  balance_cents,
  total_purchased_cents,
  total_spent_cents,
  updated_at
from developer_api_wallets
where user_id = 'USER_ID_HERE';

-- API billing ledger.
select
  id,
  user_id,
  api_key_id,
  kind,
  amount_cents,
  balance_after_cents,
  request_mode,
  description,
  provider_event_id,
  created_at
from developer_api_ledger
where user_id = 'USER_ID_HERE'
order by created_at desc;

-- Manual API balance adjustment, if support needs it.
update developer_api_wallets
set
  balance_cents = balance_cents + 1000,
  total_purchased_cents = total_purchased_cents + 1000,
  updated_at = now()
where user_id = 'USER_ID_HERE';
