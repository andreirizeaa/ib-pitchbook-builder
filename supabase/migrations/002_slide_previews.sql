-- Add slide preview image URLs to pitch_books
ALTER TABLE pitch_books ADD COLUMN IF NOT EXISTS slide_previews TEXT[] DEFAULT '{}';
