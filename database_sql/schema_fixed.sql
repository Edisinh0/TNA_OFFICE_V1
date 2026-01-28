-- =====================================================
-- TNA OFFICE - Schema Completo y Corregido para cPanel MySQL/MariaDB
-- Compatible con MySQL 5.7+ / MariaDB 10.3+
-- Generado: Enero 2026
-- INCLUYE: Tablas tickets, ticket_items y quote_items
-- =====================================================
--
-- INSTRUCCIONES DE IMPORTACION:
-- 1. En cPanel, ir a phpMyAdmin
-- 2. Crear una base de datos nueva (ej: tna_office_db)
-- 3. Seleccionar la base de datos
-- 4. Ir a "Importar" y subir este archivo
--
-- IMPORTANTE: Cambiar las credenciales del admin despues de importar
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- =====================================================
-- TABLA: profiles (Perfiles de usuario)
-- =====================================================
DROP TABLE IF EXISTS `profiles`;
CREATE TABLE `profiles` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT,
    `allowed_modules` JSON,
    `is_system` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_profiles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `profiles` (`id`, `name`, `description`, `allowed_modules`, `is_system`, `created_at`) VALUES
('fe7bfe53-5fba-43cf-a09f-db339296fdee', 'ADMIN', 'Administrador con acceso total al sistema', '["dashboard", "resources", "products", "clients", "offices", "parking-storage", "monthly-services", "quotes", "comisionistas", "tickets", "requests", "reports", "users"]', 1, NOW()),
('4885b67b-a21c-46b9-8bbc-49f1b62d2460', 'Recepcionista', 'Acceso a modulos de atencion al cliente', '["dashboard", "resources", "requests", "tickets", "clients"]', 0, NOW());

-- =====================================================
-- TABLA: users (Usuarios)
-- =====================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` VARCHAR(36) PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'comisionista', 'cliente') DEFAULT 'cliente',
    `profile_id` VARCHAR(36),
    `commission_percentage` DECIMAL(5,2) DEFAULT 0.00,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE SET NULL,
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password: admin123 (bcrypt hash) - CAMBIAR EN PRODUCCION
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `commission_percentage`, `created_at`, `profile_id`) VALUES
('9d91395e-3a19-4f26-848c-abd1d1ef0390', 'admin@tnaoffice.cl', '$2b$12$TKbiYOW6zub2aZH67WL3K.uhTmaYPLIjZA6b/ntdmr1I2Q4DlUU2m', 'Administrador', 'admin', 0.00, NOW(), 'fe7bfe53-5fba-43cf-a09f-db339296fdee');

-- =====================================================
-- TABLA: categories (Categorias de productos)
-- =====================================================
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `parent_id` VARCHAR(36),
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
    INDEX `idx_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`id`, `name`, `description`, `created_at`) VALUES
('3f5e3023-c00e-48ab-8e68-9bdf9e58c70b', 'Diseno WEB', 'Servicios de diseno web', NOW()),
('2d0ec858-d751-4fb5-90db-e20be32c9bb4', 'Elementos Corporativos', 'Articulos corporativos', NOW()),
('6d2e7cea-32d1-4452-93ed-34514e459de1', 'Impresiones Corporativas', 'Servicios de impresion', NOW()),
('c81fcafc-4c94-4a89-b242-c57d53ea1362', 'Lavado de Auto', 'Servicios de lavado', NOW()),
('10cdf08b-ef8e-4e87-a9f8-6d7cdabfea64', 'Servicios profesionales', 'Servicios profesionales varios', NOW());

-- =====================================================
-- TABLA: products (Productos)
-- =====================================================
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `category_id` VARCHAR(36),
    `category` VARCHAR(100),
    `base_price` DECIMAL(12,2) DEFAULT 0.00,
    `sale_price` DECIMAL(12,2) DEFAULT 0.00,
    `cost` DECIMAL(12,2) DEFAULT 0.00,
    `unit` VARCHAR(50),
    `image_url` TEXT,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
    INDEX `idx_products_name` (`name`),
    INDEX `idx_products_category` (`category`),
    INDEX `idx_products_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `products` (`id`, `name`, `description`, `category_id`, `category`, `base_price`, `sale_price`, `cost`, `unit`, `is_active`, `created_at`) VALUES
('prod-1', 'Diseno Logo', 'Diseno de logotipo profesional', '3f5e3023-c00e-48ab-8e68-9bdf9e58c70b', 'Diseno WEB', 150000.00, 150000.00, 50000.00, 'unidad', 1, NOW()),
('prod-2', 'Tarjetas de Presentacion', 'Pack 100 unidades', '6d2e7cea-32d1-4452-93ed-34514e459de1', 'Impresiones Corporativas', 25000.00, 25000.00, 10000.00, 'pack', 1, NOW()),
('prod-3', 'Lavado Basico', 'Lavado exterior basico', 'c81fcafc-4c94-4a89-b242-c57d53ea1362', 'Lavado de Auto', 8000.00, 8000.00, 3000.00, 'servicio', 1, NOW());

-- =====================================================
-- TABLA: clients (Clientes)
-- =====================================================
DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
    `id` VARCHAR(36) PRIMARY KEY,
    `company_name` VARCHAR(255) NOT NULL,
    `rut` VARCHAR(20),
    `business_type` VARCHAR(100),
    `address` TEXT,
    `phone` VARCHAR(50),
    `email` VARCHAR(255),
    `contact_name` VARCHAR(255),
    `contact_phone` VARCHAR(50),
    `contact_email` VARCHAR(255),
    `notes` TEXT,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_clients_company_name` (`company_name`),
    INDEX `idx_clients_rut` (`rut`),
    INDEX `idx_clients_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `clients` (`id`, `company_name`, `rut`, `business_type`, `address`, `phone`, `email`, `contact_name`, `contact_phone`, `contact_email`, `notes`, `is_active`, `created_at`) VALUES
('155c37b8-1cdc-448e-84f5-6139eb7621db', 'PEOPLE IN MIND', '76.123.456-7', 'Servicios', 'Av. Las Condes 123', '+56912345678', 'contacto@peopleinmind.cl', 'Juan Perez', '+56912345678', 'juan@peopleinmind.cl', 'Cliente corporativo', 1, NOW()),
('a1d19c32-9cf2-4769-a172-fc797cb88457', 'FUNDACION BEETHOVEN', '65.234.567-8', 'Fundacion', 'Providencia 456', '+56923456789', 'info@beethoven.cl', 'Maria Gonzalez', '+56923456789', 'maria@beethoven.cl', 'Cliente corporativo', 1, NOW()),
('e446660a-3590-4128-bfbb-c4077482b76b', 'SOUTH GREEN', '77.345.678-9', 'Comercio', 'Vitacura 789', '+56934567890', 'ventas@southgreen.cl', 'Carlos Lopez', '+56934567890', 'carlos@southgreen.cl', 'Cliente activo', 1, NOW());

-- =====================================================
-- TABLA: client_documents (Documentos de clientes)
-- =====================================================
DROP TABLE IF EXISTS `client_documents`;
CREATE TABLE `client_documents` (
    `id` VARCHAR(36) PRIMARY KEY,
    `client_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `file_url` TEXT,
    `document_type` VARCHAR(100),
    `expiry_date` DATE,
    `notifications_enabled` BOOLEAN DEFAULT FALSE,
    `notification_days` INT DEFAULT 30,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
    INDEX `idx_client_docs_client` (`client_id`),
    INDEX `idx_client_docs_expiry` (`expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: offices (Oficinas)
-- =====================================================
DROP TABLE IF EXISTS `offices`;
CREATE TABLE `offices` (
    `id` VARCHAR(36) PRIMARY KEY,
    `office_number` VARCHAR(20) NOT NULL,
    `floor` INT,
    `location` VARCHAR(100),
    `square_meters` DECIMAL(10,2),
    `capacity` INT,
    `status` ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
    `client_id` VARCHAR(36),
    `sale_value_uf` DECIMAL(10,2) DEFAULT 0.00,
    `billed_value_uf` DECIMAL(10,2) DEFAULT 0.00,
    `cost_uf` DECIMAL(10,2) DEFAULT 0.00,
    `cost_difference_uf` DECIMAL(10,2) DEFAULT 0.00,
    `contract_start` DATE,
    `contract_end` DATE,
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
    INDEX `idx_offices_number` (`office_number`),
    INDEX `idx_offices_status` (`status`),
    INDEX `idx_offices_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `offices` (`id`, `office_number`, `floor`, `location`, `square_meters`, `capacity`, `status`, `client_id`, `sale_value_uf`, `billed_value_uf`, `cost_uf`, `cost_difference_uf`, `created_at`) VALUES
('office-1', '101', 1, 'NorOriente', 25.00, 4, 'occupied', '155c37b8-1cdc-448e-84f5-6139eb7621db', 15.00, 15.00, 10.00, 5.00, NOW()),
('office-2', '102', 1, 'NorOriente', 30.00, 5, 'available', NULL, 18.00, 0.00, 12.00, 6.00, NOW()),
('office-3', '201', 2, 'SurOriente', 35.00, 6, 'occupied', 'a1d19c32-9cf2-4769-a172-fc797cb88457', 20.00, 20.00, 14.00, 6.00, NOW());

-- =====================================================
-- TABLA: parking_storage (Estacionamientos y Bodegas)
-- =====================================================
DROP TABLE IF EXISTS `parking_storage`;
CREATE TABLE `parking_storage` (
    `id` VARCHAR(36) PRIMARY KEY,
    `number` VARCHAR(20) NOT NULL,
    `type` ENUM('parking', 'storage') DEFAULT 'parking',
    `location` VARCHAR(100),
    `status` ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
    `client_id` VARCHAR(36),
    `sale_value_uf` DECIMAL(10,2) DEFAULT 0.00,
    `billed_value_uf` DECIMAL(10,2) DEFAULT 0.00,
    `cost_uf` DECIMAL(10,2) DEFAULT 0.00,
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
    INDEX `idx_parking_type` (`type`),
    INDEX `idx_parking_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: rooms (Salas de reuniones)
-- =====================================================
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `capacity` INT,
    `hourly_rate` DECIMAL(10,2) DEFAULT 0.00,
    `half_day_rate` DECIMAL(10,2) DEFAULT 0.00,
    `full_day_rate` DECIMAL(10,2) DEFAULT 0.00,
    `amenities` JSON,
    `color` VARCHAR(20),
    `status` VARCHAR(20) DEFAULT 'active',
    `blocks_rooms` JSON,
    `related_rooms` JSON,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `rooms` (`id`, `name`, `capacity`, `hourly_rate`, `half_day_rate`, `full_day_rate`, `status`, `created_at`) VALUES
('room-1', 'Sala Badajoz', 10, 50000.00, 150000.00, 250000.00, 'active', NOW()),
('room-2', 'Sala Rosario', 8, 40000.00, 120000.00, 200000.00, 'active', NOW());

-- =====================================================
-- TABLA: booths (Casetas)
-- =====================================================
DROP TABLE IF EXISTS `booths`;
CREATE TABLE `booths` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `hourly_rate` DECIMAL(10,2) DEFAULT 0.00,
    `half_day_rate` DECIMAL(10,2) DEFAULT 0.00,
    `full_day_rate` DECIMAL(10,2) DEFAULT 0.00,
    `color` VARCHAR(20),
    `status` VARCHAR(20) DEFAULT 'active',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `booths` (`id`, `name`, `hourly_rate`, `half_day_rate`, `full_day_rate`, `status`, `created_at`) VALUES
('booth-1', 'Caseta 1', 10000.00, 30000.00, 50000.00, 'active', NOW()),
('booth-2', 'Caseta 2', 10000.00, 30000.00, 50000.00, 'active', NOW());

-- =====================================================
-- TABLA: bookings (Reservas)
-- =====================================================
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
    `id` VARCHAR(36) PRIMARY KEY,
    `resource_type` ENUM('room', 'booth') NOT NULL,
    `resource_id` VARCHAR(36) NOT NULL,
    `resource_name` VARCHAR(100),
    `client_id` VARCHAR(36),
    `client_name` VARCHAR(255) NOT NULL,
    `client_email` VARCHAR(255),
    `client_phone` VARCHAR(50),
    `date` DATE,
    `start_time` TIME,
    `end_time` TIME,
    `duration_hours` DECIMAL(4,2),
    `total_price` DECIMAL(10,2) DEFAULT 0.00,
    `status` ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    `notes` TEXT,
    `created_by` VARCHAR(36),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_bookings_date` (`date`),
    INDEX `idx_bookings_resource` (`resource_type`, `resource_id`),
    INDEX `idx_bookings_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: monthly_services_catalog (Catalogo de servicios mensuales)
-- =====================================================
DROP TABLE IF EXISTS `monthly_services_catalog`;
CREATE TABLE `monthly_services_catalog` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `category` VARCHAR(100),
    `base_price_uf` DECIMAL(10,2) DEFAULT 0.00,
    `sale_value_uf` DECIMAL(10,2) DEFAULT 0.00,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `monthly_services_catalog` (`id`, `name`, `description`, `base_price_uf`, `sale_value_uf`, `category`, `is_active`, `created_at`) VALUES
('service-1', 'Servicio de Internet', 'Internet fibra optica 100 Mbps', 1.5, 1.5, 'conectividad', 1, NOW()),
('service-2', 'Limpieza de Oficina', 'Servicio de limpieza diaria', 2.5, 2.5, 'mantenimiento', 1, NOW()),
('service-3', 'Servicio Secretarial', 'Recepcion de llamadas y mensajes', 1.2, 1.2, 'administrativo', 1, NOW());

-- =====================================================
-- TABLA: monthly_services (Servicios mensuales asignados)
-- =====================================================
DROP TABLE IF EXISTS `monthly_services`;
CREATE TABLE `monthly_services` (
    `id` VARCHAR(36) PRIMARY KEY,
    `client_id` VARCHAR(36),
    `service_id` VARCHAR(36),
    `service_name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100),
    `sale_value_uf` DECIMAL(10,2) DEFAULT 0.00,
    `billed_value_uf` DECIMAL(10,2) DEFAULT 0.00,
    `cost_uf` DECIMAL(10,2) DEFAULT 0.00,
    `status` ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    `start_date` DATE,
    `end_date` DATE,
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`service_id`) REFERENCES `monthly_services_catalog`(`id`) ON DELETE SET NULL,
    INDEX `idx_monthly_services_client` (`client_id`),
    INDEX `idx_monthly_services_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: tickets (Ventas/Tickets) - NUEVA
-- =====================================================
DROP TABLE IF EXISTS `ticket_items`;
DROP TABLE IF EXISTS `tickets`;
CREATE TABLE `tickets` (
    `id` VARCHAR(36) PRIMARY KEY,
    `ticket_number` INT NOT NULL AUTO_INCREMENT UNIQUE,
    `client_id` VARCHAR(36),
    `client_name` VARCHAR(255) NOT NULL,
    `client_email` VARCHAR(255),
    `ticket_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `subtotal` DECIMAL(12,2) DEFAULT 0.00,
    `tax` DECIMAL(12,2) DEFAULT 0.00,
    `total_amount` DECIMAL(12,2) DEFAULT 0.00,
    `total_commission` DECIMAL(12,2) DEFAULT 0.00,
    `comisionista_id` VARCHAR(36),
    `comisionista_name` VARCHAR(255),
    `payment_status` ENUM('pending', 'paid', 'partial', 'refunded') DEFAULT 'pending',
    `payment_method` VARCHAR(50),
    `payment_date` DATETIME,
    `commission_status` ENUM('pending', 'paid') DEFAULT 'pending',
    `commission_paid_date` DATETIME,
    `status` ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    `notes` TEXT,
    `created_by` VARCHAR(36),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`comisionista_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_tickets_number` (`ticket_number`),
    INDEX `idx_tickets_client` (`client_id`),
    INDEX `idx_tickets_date` (`ticket_date`),
    INDEX `idx_tickets_payment_status` (`payment_status`),
    INDEX `idx_tickets_commission_status` (`commission_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: ticket_items (Items de venta) - NUEVA
-- =====================================================
CREATE TABLE `ticket_items` (
    `id` VARCHAR(36) PRIMARY KEY,
    `ticket_id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36),
    `product_name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100),
    `description` TEXT,
    `quantity` INT DEFAULT 1,
    `unit_price` DECIMAL(12,2) DEFAULT 0.00,
    `subtotal` DECIMAL(12,2) DEFAULT 0.00,
    `commission_percentage` DECIMAL(5,2) DEFAULT 0.00,
    `commission_amount` DECIMAL(12,2) DEFAULT 0.00,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL,
    INDEX `idx_ticket_items_ticket` (`ticket_id`),
    INDEX `idx_ticket_items_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: requests (Solicitudes)
-- =====================================================
DROP TABLE IF EXISTS `requests`;
CREATE TABLE `requests` (
    `id` VARCHAR(36) PRIMARY KEY,
    `request_number` INT NOT NULL AUTO_INCREMENT UNIQUE,
    `type` VARCHAR(50) DEFAULT 'contact',
    `name` VARCHAR(255),
    `client_name` VARCHAR(255),
    `client_email` VARCHAR(255),
    `email` VARCHAR(255),
    `client_phone` VARCHAR(50),
    `phone` VARCHAR(50),
    `company` VARCHAR(255),
    `company_name` VARCHAR(255),
    `message` TEXT,
    `request_type` VARCHAR(100),
    `description` TEXT,
    `source` VARCHAR(50),
    `status` ENUM('new', 'pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'new',
    `priority` ENUM('low', 'medium', 'high') DEFAULT 'medium',
    `assigned_to` VARCHAR(36),
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_requests_status` (`status`),
    INDEX `idx_requests_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: quotes (Cotizaciones)
-- =====================================================
DROP TABLE IF EXISTS `quote_items`;
DROP TABLE IF EXISTS `quotes`;
CREATE TABLE `quotes` (
    `id` VARCHAR(36) PRIMARY KEY,
    `quote_number` INT NOT NULL AUTO_INCREMENT UNIQUE,
    `client_id` VARCHAR(36),
    `client_name` VARCHAR(255),
    `client_email` VARCHAR(255),
    `client_phone` VARCHAR(50),
    `company_name` VARCHAR(255),
    `items` JSON,
    `subtotal` DECIMAL(12,2) DEFAULT 0.00,
    `tax` DECIMAL(12,2) DEFAULT 0.00,
    `total` DECIMAL(12,2) DEFAULT 0.00,
    `status` ENUM('draft', 'pre-cotizacion', 'sent', 'accepted', 'rejected', 'expired') DEFAULT 'draft',
    `valid_until` DATE,
    `notes` TEXT,
    `created_by` VARCHAR(36),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
    INDEX `idx_quotes_number` (`quote_number`),
    INDEX `idx_quotes_status` (`status`),
    INDEX `idx_quotes_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: quote_items (Items de cotizacion - OPCIONAL para busquedas)
-- =====================================================
CREATE TABLE `quote_items` (
    `id` VARCHAR(36) PRIMARY KEY,
    `quote_id` VARCHAR(36) NOT NULL,
    `item_type` ENUM('office', 'parking', 'storage', 'monthly_service', 'other') NOT NULL,
    `item_id` VARCHAR(36),
    `item_name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `quantity` INT DEFAULT 1,
    `sale_value_uf` DECIMAL(10,2) DEFAULT 0.00,
    `cost_uf` DECIMAL(10,2) DEFAULT 0.00,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE CASCADE,
    INDEX `idx_quote_items_quote` (`quote_id`),
    INDEX `idx_quote_items_type` (`item_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: quote_templates (Plantillas de cotizacion)
-- =====================================================
DROP TABLE IF EXISTS `quote_templates`;
CREATE TABLE `quote_templates` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `content` LONGTEXT,
    `variables` JSON,
    `is_default` BOOLEAN DEFAULT FALSE,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: sales (Ventas individuales - legacy)
-- =====================================================
DROP TABLE IF EXISTS `sales`;
CREATE TABLE `sales` (
    `id` VARCHAR(36) PRIMARY KEY,
    `ticket_id` VARCHAR(36),
    `product_id` VARCHAR(36),
    `product_name` VARCHAR(255),
    `category` VARCHAR(100),
    `quantity` INT DEFAULT 1,
    `unit_price` DECIMAL(12,2) DEFAULT 0.00,
    `total_amount` DECIMAL(12,2) DEFAULT 0.00,
    `sale_date` DATE,
    `client_id` VARCHAR(36),
    `client_name` VARCHAR(255),
    `client_email` VARCHAR(255),
    `comisionista_id` VARCHAR(36),
    `comisionista_name` VARCHAR(255),
    `commission_percentage` DECIMAL(5,2) DEFAULT 0.00,
    `commission_amount` DECIMAL(12,2) DEFAULT 0.00,
    `payment_status` ENUM('pending', 'paid', 'partial') DEFAULT 'pending',
    `commission_status` ENUM('pending', 'paid') DEFAULT 'pending',
    `notes` TEXT,
    `created_by` VARCHAR(36),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
    INDEX `idx_sales_date` (`sale_date`),
    INDEX `idx_sales_client` (`client_id`),
    INDEX `idx_sales_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: invoices (Facturas)
-- =====================================================
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
    `id` VARCHAR(36) PRIMARY KEY,
    `invoice_number` VARCHAR(50),
    `ticket_id` VARCHAR(36),
    `client_id` VARCHAR(36),
    `client_name` VARCHAR(255),
    `items` JSON,
    `sales_ids` JSON,
    `issue_date` DATE,
    `due_date` DATE,
    `subtotal` DECIMAL(12,2) DEFAULT 0.00,
    `tax` DECIMAL(12,2) DEFAULT 0.00,
    `total_amount` DECIMAL(12,2) DEFAULT 0.00,
    `status` ENUM('draft', 'pending', 'sent', 'invoiced', 'paid', 'cancelled') DEFAULT 'pending',
    `invoiced_at` DATETIME,
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
    INDEX `idx_invoices_status` (`status`),
    INDEX `idx_invoices_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: floor_plan_coordinates (Coordenadas del plano)
-- =====================================================
DROP TABLE IF EXISTS `floor_plan_coordinates`;
CREATE TABLE `floor_plan_coordinates` (
    `id` VARCHAR(36) PRIMARY KEY,
    `office_id` VARCHAR(36),
    `office_number` VARCHAR(20),
    `x` DECIMAL(10,2),
    `y` DECIMAL(10,2),
    `width` DECIMAL(10,2),
    `height` DECIMAL(10,2),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- FIN DEL SCRIPT - TNA OFFICE SCHEMA COMPLETO
-- =====================================================
