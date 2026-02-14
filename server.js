// =====================================================
// Mansion POS System - Backend Server
// =====================================================
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----- MySQL Connection Pool -----
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '167349943167',
  database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'mansion_pos',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
});

// ===================== GUEST API =====================

// GET all guests (with optional search by national_id)
app.get('/api/guests', async (req, res) => {
  try {
    const { search, national_id } = req.query;
    let sql = 'SELECT * FROM guest';
    const params = [];
    if (national_id) {
      sql += ' WHERE national_id = ?';
      params.push(national_id);
    } else if (search) {
      sql += ' WHERE first_name LIKE ? OR last_name LIKE ? OR national_id LIKE ? OR phone LIKE ?';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single guest
app.get('/api/guests/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM guest WHERE guest_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Guest not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create guest (with return-customer check)
app.post('/api/guests', async (req, res) => {
  try {
    const { first_name, last_name, national_id, phone, address } = req.body;
    if (!first_name || !last_name || !national_id) {
      return res.status(400).json({ error: 'first_name, last_name, and national_id are required' });
    }
    // Check for return customer
    const [existing] = await pool.query('SELECT * FROM guest WHERE national_id = ?', [national_id]);
    if (existing.length > 0) {
      return res.json({ ...existing[0], returning_customer: true });
    }
    const [result] = await pool.query(
      'INSERT INTO guest (first_name, last_name, national_id, phone, address) VALUES (?, ?, ?, ?, ?)',
      [first_name, last_name, national_id, phone || null, address || null]
    );
    const [newGuest] = await pool.query('SELECT * FROM guest WHERE guest_id = ?', [result.insertId]);
    res.status(201).json({ ...newGuest[0], returning_customer: false });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'National ID already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update guest
app.put('/api/guests/:id', async (req, res) => {
  try {
    const { first_name, last_name, national_id, phone, address } = req.body;
    await pool.query(
      'UPDATE guest SET first_name=?, last_name=?, national_id=?, phone=?, address=? WHERE guest_id=?',
      [first_name, last_name, national_id, phone, address, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM guest WHERE guest_id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE guest
app.delete('/api/guests/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM guest WHERE guest_id = ?', [req.params.id]);
    res.json({ message: 'Guest deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== ROOM API =====================

// GET all rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM room';
    const params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY room_number ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update room status
app.put('/api/rooms/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['AVAILABLE', 'OCCUPIED', 'CLEANING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query('UPDATE room SET status = ? WHERE room_id = ?', [status, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM room WHERE room_id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== CHECK-IN API =====================

app.post('/api/checkin', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { guest_id, room_id, payment_method } = req.body;
    if (!guest_id || !room_id) {
      return res.status(400).json({ error: 'guest_id and room_id are required' });
    }

    // Check room availability
    const [rooms] = await conn.query('SELECT * FROM room WHERE room_id = ? AND status = "AVAILABLE"', [room_id]);
    if (rooms.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Room is not available' });
    }

    // Create stay record (check-in at now, expected checkout next day 12:00)
    const now = new Date();
    const [stayResult] = await conn.query(
      'INSERT INTO stay (guest_id, room_id, check_in, stay_status) VALUES (?, ?, ?, "CHECKED_IN")',
      [guest_id, room_id, now]
    );
    const stayId = stayResult.insertId;

    // Update room status to OCCUPIED
    await conn.query('UPDATE room SET status = "OCCUPIED" WHERE room_id = ?', [room_id]);

    // Create deposit (100 baht key deposit)
    await conn.query(
      'INSERT INTO deposit (stay_id, deposit_amount, deposit_status, paid_at) VALUES (?, 100.00, "PAID", ?)',
      [stayId, now]
    );

    // Record room charge payment
    const roomPrice = rooms[0].price_per_day;
    await conn.query(
      'INSERT INTO payment (stay_id, amount, payment_type, method, payment_date) VALUES (?, ?, "ROOM_CHARGE", ?, ?)',
      [stayId, roomPrice, payment_method || 'CASH', now]
    );

    // Record deposit payment
    await conn.query(
      'INSERT INTO payment (stay_id, amount, payment_type, method, payment_date) VALUES (?, 100.00, "DEPOSIT", ?, ?)',
      [stayId, payment_method || 'CASH', now]
    );

    await conn.commit();

    // Return full stay info
    const [stayInfo] = await conn.query(`
      SELECT s.*, g.first_name, g.last_name, g.national_id, g.phone,
             r.room_number, r.bed_type, r.price_per_day
      FROM stay s
      JOIN guest g ON s.guest_id = g.guest_id
      JOIN room r ON s.room_id = r.room_id
      WHERE s.stay_id = ?
    `, [stayId]);

    res.status(201).json({
      stay: stayInfo[0],
      room_charge: parseFloat(roomPrice),
      deposit: 100,
      total_paid: parseFloat(roomPrice) + 100
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ===================== CHECK-OUT API =====================

app.post('/api/checkout/:stayId', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { stayId } = req.params;
    const { key_returned, payment_method } = req.body;

    // Get stay info
    const [stays] = await conn.query(`
      SELECT s.*, r.room_id, r.price_per_day, r.room_number
      FROM stay s JOIN room r ON s.room_id = r.room_id
      WHERE s.stay_id = ? AND s.stay_status = "CHECKED_IN"
    `, [stayId]);

    if (stays.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Active stay not found' });
    }

    const stay = stays[0];
    const now = new Date();
    const checkInDate = new Date(stay.check_in);

    // Calculate late checkout fee
    // Policy: checkout at 12:00 next day. If checkout after 12:00, charge extra day
    const checkInDay = new Date(checkInDate);
    checkInDay.setHours(0, 0, 0, 0);

    const expectedCheckout = new Date(checkInDay);
    expectedCheckout.setDate(expectedCheckout.getDate() + 1);
    expectedCheckout.setHours(12, 0, 0, 0);

    let lateFee = 0;
    let extraDays = 0;
    if (now > expectedCheckout) {
      // Calculate how many extra days (each day boundary after 12:00)
      const diffMs = now - expectedCheckout;
      extraDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      lateFee = extraDays * parseFloat(stay.price_per_day);

      // Record late fee payment
      await conn.query(
        'INSERT INTO payment (stay_id, amount, payment_type, method, payment_date) VALUES (?, ?, "LATE_FEE", ?, ?)',
        [stayId, lateFee, payment_method || 'CASH', now]
      );
    }

    // Update stay: set check_out time and status
    await conn.query(
      'UPDATE stay SET check_out = ?, stay_status = "CHECKED_OUT" WHERE stay_id = ?',
      [now, stayId]
    );

    // Update room status to CLEANING
    await conn.query('UPDATE room SET status = "CLEANING" WHERE room_id = ?', [stay.room_id]);

    // Handle deposit return if key is returned
    let depositReturned = false;
    if (key_returned === true) {
      await conn.query(
        'UPDATE deposit SET deposit_status = "RETURNED", return_at = ? WHERE stay_id = ?',
        [now, stayId]
      );
      // Record deposit return as negative payment
      await conn.query(
        'INSERT INTO payment (stay_id, amount, payment_type, method, payment_date) VALUES (?, -100.00, "DEPOSIT_RETURN", ?, ?)',
        [stayId, payment_method || 'CASH', now]
      );
      depositReturned = true;
    }

    await conn.commit();

    res.json({
      message: 'Check-out successful',
      stay_id: parseInt(stayId),
      room_number: stay.room_number,
      check_in: stay.check_in,
      check_out: now,
      extra_days: extraDays,
      late_fee: lateFee,
      deposit_returned: depositReturned,
      total_additional_charge: lateFee - (depositReturned ? 100 : 0)
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ===================== ACTIVE STAYS API =====================

app.get('/api/stays/active', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, g.first_name, g.last_name, g.national_id, g.phone,
             r.room_number, r.bed_type, r.price_per_day,
             d.deposit_status, d.deposit_amount
      FROM stay s
      JOIN guest g ON s.guest_id = g.guest_id
      JOIN room r ON s.room_id = r.room_id
      LEFT JOIN deposit d ON s.stay_id = d.stay_id
      WHERE s.stay_status = 'CHECKED_IN'
      ORDER BY s.check_in DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all stays
app.get('/api/stays', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, g.first_name, g.last_name, g.national_id,
             r.room_number, r.bed_type, r.price_per_day
      FROM stay s
      JOIN guest g ON s.guest_id = g.guest_id
      JOIN room r ON s.room_id = r.room_id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== PAYMENT API =====================

app.get('/api/payments', async (req, res) => {
  try {
    const { stay_id } = req.query;
    let sql = `
      SELECT p.*, s.check_in, s.check_out, r.room_number,
             g.first_name, g.last_name
      FROM payment p
      JOIN stay s ON p.stay_id = s.stay_id
      JOIN room r ON s.room_id = r.room_id
      JOIN guest g ON s.guest_id = g.guest_id
    `;
    const params = [];
    if (stay_id) {
      sql += ' WHERE p.stay_id = ?';
      params.push(stay_id);
    }
    sql += ' ORDER BY p.payment_date DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== DEPOSIT API =====================

app.get('/api/deposits', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT d.*, s.check_in, s.check_out, r.room_number,
             g.first_name, g.last_name
      FROM deposit d
      JOIN stay s ON d.stay_id = s.stay_id
      JOIN room r ON s.room_id = r.room_id
      JOIN guest g ON s.guest_id = g.guest_id
    `;
    const params = [];
    if (status) {
      sql += ' WHERE d.deposit_status = ?';
      params.push(status);
    }
    sql += ' ORDER BY d.paid_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== MONTHLY REPORT API =====================

app.get('/api/reports/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);

    // Total guests this month
    const [guestCount] = await pool.query(`
      SELECT COUNT(DISTINCT guest_id) AS total_guests
      FROM stay WHERE YEAR(check_in) = ? AND MONTH(check_in) = ?
    `, [y, m]);

    // Total stays this month
    const [stayCount] = await pool.query(`
      SELECT COUNT(*) AS total_stays
      FROM stay WHERE YEAR(check_in) = ? AND MONTH(check_in) = ?
    `, [y, m]);

    // Total rooms used
    const [roomCount] = await pool.query(`
      SELECT COUNT(DISTINCT room_id) AS rooms_used
      FROM stay WHERE YEAR(check_in) = ? AND MONTH(check_in) = ?
    `, [y, m]);

    // Revenue breakdown
    const [revenue] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN payment_type = 'ROOM_CHARGE' THEN amount ELSE 0 END), 0) AS room_revenue,
        COALESCE(SUM(CASE WHEN payment_type = 'LATE_FEE' THEN amount ELSE 0 END), 0) AS late_fee_revenue,
        COALESCE(SUM(CASE WHEN payment_type = 'DEPOSIT' THEN amount ELSE 0 END), 0) AS deposit_collected,
        COALESCE(SUM(CASE WHEN payment_type = 'DEPOSIT_RETURN' THEN amount ELSE 0 END), 0) AS deposit_returned,
        COALESCE(SUM(amount), 0) AS total_revenue
      FROM payment WHERE YEAR(payment_date) = ? AND MONTH(payment_date) = ?
    `, [y, m]);

    // Daily breakdown
    const [daily] = await pool.query(`
      SELECT DATE(check_in) AS date, COUNT(*) AS stays,
             COUNT(DISTINCT guest_id) AS guests
      FROM stay WHERE YEAR(check_in) = ? AND MONTH(check_in) = ?
      GROUP BY DATE(check_in) ORDER BY date
    `, [y, m]);

    // Room type breakdown
    const [roomType] = await pool.query(`
      SELECT r.bed_type, COUNT(*) AS count,
             SUM(r.price_per_day) AS revenue
      FROM stay s JOIN room r ON s.room_id = r.room_id
      WHERE YEAR(s.check_in) = ? AND MONTH(s.check_in) = ?
      GROUP BY r.bed_type
    `, [y, m]);

    res.json({
      year: parseInt(y),
      month: parseInt(m),
      summary: {
        total_guests: guestCount[0].total_guests,
        total_stays: stayCount[0].total_stays,
        rooms_used: roomCount[0].rooms_used,
        ...revenue[0]
      },
      daily_breakdown: daily,
      room_type_breakdown: roomType
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== DASHBOARD STATS =====================

app.get('/api/dashboard', async (req, res) => {
  try {
    const [roomStats] = await pool.query(`
      SELECT status, COUNT(*) AS count FROM room GROUP BY status
    `);
    const [todayCheckins] = await pool.query(`
      SELECT COUNT(*) AS count FROM stay WHERE DATE(check_in) = CURDATE()
    `);
    const [todayCheckouts] = await pool.query(`
      SELECT COUNT(*) AS count FROM stay WHERE DATE(check_out) = CURDATE()
    `);
    const [todayRevenue] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total FROM payment
      WHERE DATE(payment_date) = CURDATE() AND payment_type IN ('ROOM_CHARGE', 'LATE_FEE')
    `);
    const [activeStays] = await pool.query(`
      SELECT COUNT(*) AS count FROM stay WHERE stay_status = 'CHECKED_IN'
    `);

    res.json({
      room_stats: roomStats,
      today_checkins: todayCheckins[0].count,
      today_checkouts: todayCheckouts[0].count,
      today_revenue: todayRevenue[0].total,
      active_stays: activeStays[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏨 Mansion POS Server running on port ${PORT}`);
});
