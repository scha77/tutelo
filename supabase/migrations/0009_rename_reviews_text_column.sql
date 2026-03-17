-- ============================================================
-- 0009_rename_reviews_text_column.sql
-- Rename reviews.text → reviews.review_text for clarity
-- and consistency with application code
-- ============================================================

ALTER TABLE reviews RENAME COLUMN text TO review_text;
