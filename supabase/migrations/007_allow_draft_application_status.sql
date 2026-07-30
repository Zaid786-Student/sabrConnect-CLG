-- ============================================================================
-- Fix: "Submit Registration" silently does nothing
-- ============================================================================
--
-- Root cause: the applications table has this CHECK constraint from the
-- original schema —
--
--   status text not null default 'submitted'
--     check (status in ('submitted', 'in_review', 'accepted', 'rejected')),
--
-- but src/pages/student/HackathonDetail.jsx's submit() (the "Submit
-- Registration" button — step 1 of 2, before Final Submission) calls:
--
--   await applyToOpportunity({ ..., status: 'draft' })
--
-- to save the leader's details/problem statements as a draft WITHOUT
-- notifying the organizer yet (that only happens later, when the roster is
-- complete and the leader hits "Final Submission"). Postgres rejects that
-- insert outright because 'draft' isn't in the allowed list. In
-- applyToOpportunity() (src/context/data/ApplicationsContext.jsx) that
-- failure is only logged with console.error and the function returns
-- undefined — nothing is surfaced to the UI, and submit() never checked the
-- return value either — so the button just says "Submitting…" for a moment
-- and then silently reverts, with no application ever created and no error
-- shown. That's exactly the "Submit Registration isn't working" symptom.
--
-- Fix: widen the CHECK constraint to also allow 'draft'.
--
-- How to apply:
--   Supabase Dashboard → SQL Editor → paste this file → Run
--   (or `supabase db push` if you keep this file in supabase/migrations/)
-- ============================================================================

alter table applications
  drop constraint if exists applications_status_check;

alter table applications
  add constraint applications_status_check
  check (status in ('draft', 'submitted', 'in_review', 'accepted', 'rejected'));
