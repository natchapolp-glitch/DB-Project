-- =====================================================
-- Mansion POS System - Database Initialization
-- =====================================================

USE mansion_pos;

-- ----- Guest Table -----
CREATE TABLE IF NOT EXISTS guest (
  guest_id    INT AUTO_INCREMENT PRIMARY KEY,
  first_name  VARCHAR(50) NOT NULL,
  last_name   VARCHAR(50) NOT NULL,
  national_id VARCHAR(13) UNIQUE NOT NULL,
  phone       VARCHAR(15),
  address     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----- Room Table -----
CREATE TABLE IF NOT EXISTS room (
  room_id       INT AUTO_INCREMENT PRIMARY KEY,
  room_number   VARCHAR(10) NOT NULL UNIQUE,
  bed_type      ENUM('single','double') NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  status        ENUM('AVAILABLE','OCCUPIED','CLEANING') NOT NULL DEFAULT 'AVAILABLE',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----- Stay Table -----
CREATE TABLE IF NOT EXISTS stay (
  stay_id      INT AUTO_INCREMENT PRIMARY KEY,
  guest_id     INT NOT NULL,
  room_id      INT NOT NULL,
  planned_days INT NOT NULL DEFAULT 1,
  check_in     DATETIME NOT NULL,
  check_out    DATETIME DEFAULT NULL,
  stay_status  ENUM('CHECKED_IN','CHECKED_OUT','CANCELLED') NOT NULL DEFAULT 'CHECKED_IN',
  total_amount DECIMAL(10,2) DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guest(guest_id) ON DELETE RESTRICT,
  FOREIGN KEY (room_id)  REFERENCES room(room_id)   ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ----- Payment Table -----
CREATE TABLE IF NOT EXISTS payment (
  pay_id        INT AUTO_INCREMENT PRIMARY KEY,
  stay_id       INT NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  payment_type  ENUM('ROOM_CHARGE','LATE_FEE','DEPOSIT','DEPOSIT_RETURN','OTHER') NOT NULL,
  method        ENUM('CASH','TRANSFER','CREDIT_CARD') NOT NULL DEFAULT 'CASH',
  payment_date  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stay_id) REFERENCES stay(stay_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----- Deposit Table -----
CREATE TABLE IF NOT EXISTS deposit (
  deposit_id      INT AUTO_INCREMENT PRIMARY KEY,
  stay_id         INT NOT NULL,
  deposit_amount  DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  deposit_status  ENUM('PAID','RETURNED','FORFEITED') NOT NULL DEFAULT 'PAID',
  paid_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  return_at       DATETIME DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (stay_id) REFERENCES stay(stay_id) ON DELETE CASCADE,
  UNIQUE KEY unique_stay_deposit (stay_id)
) ENGINE=InnoDB;

-- =====================================================
-- Seed Room Data (33 rooms: 101-111, 201-211, 301-311)
-- เลขคี่ = เตียงเดี่ยว (single), เลขคู่ = เตียงคู่ (double)
-- =====================================================
INSERT INTO room (room_number, bed_type, price_per_day, status) VALUES
  -- ชั้น 1
  ('101', 'single', 350.00, 'AVAILABLE'),
  ('102', 'double', 400.00, 'AVAILABLE'),
  ('103', 'single', 350.00, 'AVAILABLE'),
  ('104', 'double', 400.00, 'AVAILABLE'),
  ('105', 'single', 350.00, 'AVAILABLE'),
  ('106', 'double', 400.00, 'AVAILABLE'),
  ('107', 'single', 350.00, 'AVAILABLE'),
  ('108', 'double', 400.00, 'AVAILABLE'),
  ('109', 'single', 350.00, 'AVAILABLE'),
  ('110', 'double', 400.00, 'AVAILABLE'),
  ('111', 'single', 350.00, 'AVAILABLE'),
  -- ชั้น 2
  ('201', 'single', 350.00, 'AVAILABLE'),
  ('202', 'double', 400.00, 'AVAILABLE'),
  ('203', 'single', 350.00, 'AVAILABLE'),
  ('204', 'double', 400.00, 'AVAILABLE'),
  ('205', 'single', 350.00, 'AVAILABLE'),
  ('206', 'double', 400.00, 'AVAILABLE'),
  ('207', 'single', 350.00, 'AVAILABLE'),
  ('208', 'double', 400.00, 'AVAILABLE'),
  ('209', 'single', 350.00, 'AVAILABLE'),
  ('210', 'double', 400.00, 'AVAILABLE'),
  ('211', 'single', 350.00, 'AVAILABLE'),
  -- ชั้น 3
  ('301', 'single', 350.00, 'AVAILABLE'),
  ('302', 'double', 400.00, 'AVAILABLE'),
  ('303', 'single', 350.00, 'AVAILABLE'),
  ('304', 'double', 400.00, 'AVAILABLE'),
  ('305', 'single', 350.00, 'AVAILABLE'),
  ('306', 'double', 400.00, 'AVAILABLE'),
  ('307', 'single', 350.00, 'AVAILABLE'),
  ('308', 'double', 400.00, 'AVAILABLE'),
  ('309', 'single', 350.00, 'AVAILABLE'),
  ('310', 'double', 400.00, 'AVAILABLE'),
  ('311', 'single', 350.00, 'AVAILABLE')
ON DUPLICATE KEY UPDATE room_number = VALUES(room_number);
