-- Keep a single canonical report-location validation trigger.
-- The duplicate trigger caused the same validation function to run twice
-- on every report INSERT/UPDATE.
drop trigger if exists trg_validate_report_location on public.reports;

-- Security reports should remain protected from manual data exposure.
-- The app now communicates this accurately as "Identidade protegida".
