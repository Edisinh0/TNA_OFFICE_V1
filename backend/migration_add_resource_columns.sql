-- Migration: Add image_url and description columns to rooms and booths tables
-- Date: 2026-02-09
-- Description: Fixes image upload not saving in resource/room configuration

-- Add columns to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS image_url LONGTEXT DEFAULT '';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Add columns to booths table
ALTER TABLE booths ADD COLUMN IF NOT EXISTS image_url LONGTEXT DEFAULT '';
ALTER TABLE booths ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE booths ADD COLUMN IF NOT EXISTS capacity INT DEFAULT NULL;
