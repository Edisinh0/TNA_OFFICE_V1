-- =============================================
-- Migration: Add new columns and tables for bug fixes
-- Date: 2026-02-06
-- Description: Adds columns for client contacts, document contract fields,
--   request details, and updates request status enum
-- =============================================

-- Create client_contacts table if not exists
CREATE TABLE IF NOT EXISTS client_contacts (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_primary TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Add contract fields to client_documents table
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS contract_start_date DATE DEFAULT NULL;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS contract_end_date DATE DEFAULT NULL;
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Add details column to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS details JSON DEFAULT NULL;

-- Update request status enum to include 'confirmed' and 'rejected'
-- Note: In MariaDB, we need to modify the column to update the enum values
-- First check if the column needs updating
ALTER TABLE requests MODIFY COLUMN status ENUM('new', 'pending', 'in_progress', 'completed', 'cancelled', 'confirmed', 'rejected') DEFAULT 'new';

-- Increase image_url column size for products to handle large base64 images
ALTER TABLE products MODIFY COLUMN image_url LONGTEXT DEFAULT '';

-- Increase file_url column size for client_documents to handle large base64 files
ALTER TABLE client_documents MODIFY COLUMN file_url LONGTEXT DEFAULT NULL;
