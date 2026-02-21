-- =====================================================
-- Mansion POS System - Database Initialization
-- =====================================================

-- =====================================================
-- Mansion POS System - Database Initialization
-- =====================================================

-- Tables are created in the database specified by the connection (e.g., DATABASE_URL)


-- ----- Guest Table -----
CREATE TABLE IF NOT EXISTS guest (
  guest_id    INT AUTO_INCREMENT PRIMARY KEY,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  national_id VARCHAR(13)  NOT NULL UNIQUE,
  phone       VARCHAR(20),
  address     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----- Room Table -----
CREATE TABLE IF NOT EXISTS room (
  room_id       INT AUTO_INCREMENT PRIMARY KEY,
  room_number   VARCHAR(10) NOT NULL UNIQUE,
  bed_type      ENUM('single','double') NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  status        ENUM('AVAILABLE','OCCUPIED','CLEANING') NOT NULL DEFAULT 'AVAILABLE'
) ENGINE=InnoDB;

-- ----- Stay Table -----
CREATE TABLE IF NOT EXISTS stay (
  stay_id      INT AUTO_INCREMENT PRIMARY KEY,
  guest_id     INT NOT NULL,
  room_id      INT NOT NULL,
  planned_days INT NOT NULL DEFAULT 1,
  check_in     DATETIME NOT NULL,
  check_out    DATETIME DEFAULT NULL,
  stay_status  ENUM('CHECKED_IN','CHECKED_OUT') NOT NULL DEFAULT 'CHECKED_IN',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guest(guest_id) ON UPDATE CASCADE,
  FOREIGN KEY (room_id)  REFERENCES room(room_id)   ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----- Payment Table -----
CREATE TABLE IF NOT EXISTS payment (
  pay_id        INT AUTO_INCREMENT PRIMARY KEY,
  stay_id       INT NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  payment_type  ENUM('ROOM_CHARGE','LATE_FEE','DEPOSIT','DEPOSIT_RETURN','OTHER') NOT NULL,
  method        ENUM('CASH','TRANSFER','CREDIT_CARD') NOT NULL DEFAULT 'CASH',
  payment_date  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stay_id) REFERENCES stay(stay_id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----- Deposit Table -----
CREATE TABLE IF NOT EXISTS deposit (
  deposit_id      INT AUTO_INCREMENT PRIMARY KEY,
  stay_id         INT NOT NULL UNIQUE,
  deposit_amount  DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  deposit_status  ENUM('PAID','RETURNED') NOT NULL DEFAULT 'PAID',
  paid_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  return_at       DATETIME DEFAULT NULL,
  FOREIGN KEY (stay_id) REFERENCES stay(stay_id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- Seed Room Data (15 rooms: 101-108 single, 201-207 double)
-- =====================================================
INSERT INTO room (room_number, bed_type, price_per_day, status) VALUES
  ('101', 'single', 350.00, 'AVAILABLE'),
  ('102', 'single', 350.00, 'AVAILABLE'),
  ('103', 'single', 350.00, 'AVAILABLE'),
  ('104', 'single', 350.00, 'AVAILABLE'),
  ('105', 'single', 350.00, 'AVAILABLE'),
  ('106', 'single', 350.00, 'AVAILABLE'),
  ('107', 'single', 350.00, 'AVAILABLE'),
  ('108', 'single', 350.00, 'AVAILABLE'),
  ('201', 'double', 400.00, 'AVAILABLE'),
  ('202', 'double', 400.00, 'AVAILABLE'),
  ('203', 'double', 400.00, 'AVAILABLE'),
  ('204', 'double', 400.00, 'AVAILABLE'),
  ('205', 'double', 400.00, 'AVAILABLE'),
  ('206', 'double', 400.00, 'AVAILABLE'),
  ('207', 'double', 400.00, 'AVAILABLE')
ON DUPLICATE KEY UPDATE room_number = VALUES(room_number);
