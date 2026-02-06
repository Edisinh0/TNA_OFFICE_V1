-- =============================================
-- Migration: Add missing columns to products table
-- Date: 2026-02-05
-- Description: Adds columns needed for stock control,
--   commission, provider, images, and featured products
-- =============================================

-- Add columns only if they don't already exist
-- Run each ALTER separately so individual failures don't block others

ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_percentage FLOAT DEFAULT 0.0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order INT DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS provider VARCHAR(255) DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured TINYINT(1) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_text VARCHAR(255) DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_control_enabled TINYINT(1) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS current_stock INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_alert INT DEFAULT 5;
