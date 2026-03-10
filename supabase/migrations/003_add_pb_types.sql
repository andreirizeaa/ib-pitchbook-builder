-- Expand pb_type check constraint to include new pitch book types
ALTER TABLE pitch_books DROP CONSTRAINT IF EXISTS pitch_books_pb_type_check;
ALTER TABLE pitch_books ADD CONSTRAINT pitch_books_pb_type_check
  CHECK (pb_type IN ('company_overview', 'market_update', 'transaction_summary', 'investor_pitch', 'industry_overview', 'fundraising_deck', 'due_diligence'));
