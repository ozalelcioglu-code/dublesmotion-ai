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
