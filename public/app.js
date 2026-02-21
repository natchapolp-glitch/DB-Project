// =====================================================
// Mansion POS System - Frontend Application
// =====================================================

const API = '/api';

// ===== State =====
let currentPage = 'dashboard';
let selectedRoom = null;
let selectedGuestId = null;
let checkoutStayId = null;

// ===== Utilities =====
function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function formatMoney(n) {
  return parseFloat(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
}

function paymentTypeLabel(t) {
  const m = {
    'ROOM_CHARGE': 'ค่าห้อง',
    'LATE_FEE': 'ค่าปรับเกินเวลา',
    'DEPOSIT': 'เงินมัดจำ',
    'DEPOSIT_RETURN': 'คืนเงินมัดจำ',
    'OTHER': 'อื่นๆ'
  };
  return m[t] || t;
}

function methodLabel(m) {
  const labels = { 'CASH': 'เงินสด', 'TRANSFER': 'โอนเงิน', 'CREDIT_CARD': 'บัตรเครดิต' };
  return labels[m] || m;
}

function bedTypeLabel(t) {
  return t === 'single' ? 'เตียงเดี่ยว' : 'เตียงคู่';
}

function statusLabel(s) {
  const m = { 'AVAILABLE': 'ว่าง', 'OCCUPIED': 'มีผู้เข้าพัก', 'CLEANING': 'ทำความสะอาด' };
  return m[s] || s;
}

// ===== Toast =====
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== API Helpers =====
async function apiGet(url) {
  const res = await fetch(`${API}${url}`);
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(`${API}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

async function apiPut(url, data) {
  const res = await fetch(`${API}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

async function apiDelete(url) {
  const res = await fetch(`${API}${url}`, { method: 'DELETE' });
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

// ===== Navigation =====
function navigateTo(page) {
  currentPage = page;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update pages
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `page-${page}`);
  });

  // Update header
  const titles = {
    dashboard: ['แดชบอร์ด', 'ภาพรวมระบบจัดการแมนชั่น'],
    rooms: ['จัดการห้องพัก', 'ดูสถานะและจัดการห้องพักทั้งหมด'],
    guests: ['จัดการผู้เข้าพัก', 'เพิ่ม แก้ไข ลบข้อมูลผู้เข้าพัก'],
    checkin: ['เช็คอิน', 'บันทึกการเข้าพักใหม่'],
    checkout: ['เช็คเอาท์', 'บันทึกการออกจากห้องพัก'],
    payments: ['การชำระเงิน', 'ประวัติการชำระเงินทั้งหมด'],
    reports: ['รายงานรายเดือน', 'สรุปข้อมูลเชิงบริหาร']
  };
  const [title, subtitle] = titles[page] || ['', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;

  // Load data
  loadPageData(page);
}

function loadPageData(page) {
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'rooms': loadRooms(); break;
    case 'guests': loadGuests(); break;
    case 'checkin': loadCheckinRooms(); resetCheckinFlow(); break;
    case 'checkout': loadActiveStays(); break;
    case 'payments': loadPayments(); break;
    case 'reports': break; // manual load
  }
}

// ===== Dashboard =====
async function loadDashboard() {
  try {
    const [dashboard, rooms] = await Promise.all([
      apiGet('/dashboard'),
      apiGet('/rooms')
    ]);

    const stats = dashboard.room_stats;
    const available = (stats.find(s => s.status === 'AVAILABLE') || {}).count || 0;
    const occupied = (stats.find(s => s.status === 'OCCUPIED') || {}).count || 0;
    const cleaning = (stats.find(s => s.status === 'CLEANING') || {}).count || 0;

    document.getElementById('dashboard-stats').innerHTML = `
      <div class="stat-card teal">
        <div class="stat-icon">🚪</div>
        <div class="stat-value">${rooms.length}</div>
        <div class="stat-label">ห้องทั้งหมด</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${available}</div>
        <div class="stat-label">ห้องว่าง</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon">🛏️</div>
        <div class="stat-value">${occupied}</div>
        <div class="stat-label">มีผู้เข้าพัก</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">🧹</div>
        <div class="stat-value">${cleaning}</div>
        <div class="stat-label">ทำความสะอาด</div>
      </div>
      <div class="stat-card rose">
        <div class="stat-icon">💰</div>
        <div class="stat-value">฿${formatMoney(dashboard.today_revenue)}</div>
        <div class="stat-label">รายได้วันนี้</div>
      </div>
    `;

    renderRoomGrid('dashboard-rooms', rooms, false);
  } catch (err) {
    showToast('ไม่สามารถโหลดข้อมูลได้: ' + err.message, 'error');
  }
}

function renderRoomGrid(containerId, rooms, clickable = true) {
  const container = document.getElementById(containerId);
  container.innerHTML = rooms.map(r => `
    <div class="room-card ${r.status.toLowerCase()}"
         data-room-id="${r.room_id}"
         ${clickable ? `onclick="onRoomClick(${r.room_id}, '${r.status}')"` : ''}>
      <div class="room-number">${r.room_number}</div>
      <div class="room-type">${bedTypeLabel(r.bed_type)}</div>
      <div class="room-price">฿${formatMoney(r.price_per_day)}/วัน</div>
      <div class="room-status-badge">${statusLabel(r.status)}</div>
    </div>
  `).join('');
}

// ===== Rooms Page =====
async function loadRooms() {
  try {
    const rooms = await apiGet('/rooms');
    renderRoomGrid('rooms-grid', rooms, true);
  } catch (err) {
    showToast('โหลดข้อมูลห้องล้มเหลว', 'error');
  }
}

let editingRoomId = null;

function onRoomClick(roomId, status) {
  if (currentPage === 'rooms') {
    editingRoomId = roomId;
    document.getElementById('room-status-select').value = status;
    document.getElementById('room-status-modal-title').textContent = `เปลี่ยนสถานะห้อง`;
    openModal('room-status-modal');
  }
}

// ===== Guests Page =====
async function loadGuests(searchTerm = '') {
  try {
    const url = searchTerm ? `/guests?search=${encodeURIComponent(searchTerm)}` : '/guests';
    const guests = await apiGet(url);
    const tbody = document.getElementById('guests-table-body');
    const empty = document.getElementById('guests-empty');

    if (guests.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = searchTerm ? 'none' : 'block';
      return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = guests.map(g => `
      <tr>
        <td><strong>${g.first_name} ${g.last_name}</strong></td>
        <td>${g.national_id}</td>
        <td>${g.phone || '-'}</td>
        <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${g.address || '-'}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-sm btn-secondary" onclick="editGuest(${g.guest_id})">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteGuest(${g.guest_id})">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('โหลดข้อมูลผู้เข้าพักล้มเหลว', 'error');
  }
}

async function editGuest(id) {
  try {
    const guest = await apiGet(`/guests/${id}`);
    document.getElementById('edit-guest-id').value = id;
    document.getElementById('modal-first-name').value = guest.first_name;
    document.getElementById('modal-last-name').value = guest.last_name;
    document.getElementById('modal-national-id').value = guest.national_id;
    document.getElementById('modal-phone').value = guest.phone || '';
    document.getElementById('modal-address').value = guest.address || '';
    document.getElementById('guest-modal-title').textContent = 'แก้ไขข้อมูลผู้เข้าพัก';
    openModal('guest-modal');
  } catch (err) {
    showToast('ไม่พบข้อมูลผู้เข้าพัก', 'error');
  }
}

async function deleteGuest(id) {
  if (!confirm('คุณต้องการลบผู้เข้าพักนี้ใช่หรือไม่?')) return;
  try {
    await apiDelete(`/guests/${id}`);
    showToast('ลบผู้เข้าพักสำเร็จ');
    loadGuests();
  } catch (err) {
    showToast('ลบผู้เข้าพักล้มเหลว: ' + err.message, 'error');
  }
}

async function saveGuest() {
  const id = document.getElementById('edit-guest-id').value;
  const data = {
    first_name: document.getElementById('modal-first-name').value.trim(),
    last_name: document.getElementById('modal-last-name').value.trim(),
    national_id: document.getElementById('modal-national-id').value.trim(),
    phone: document.getElementById('modal-phone').value.trim(),
    address: document.getElementById('modal-address').value.trim()
  };

  if (!data.first_name || !data.last_name || !data.national_id) {
    showToast('กรุณากรอกชื่อ นามสกุล และเลขบัตรประชาชน', 'warning');
    return;
  }
  if (!/^\d{13}$/.test(data.national_id)) {
    showToast('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก', 'warning');
    return;
  }
  if (data.phone && !/^\d{10}$/.test(data.phone)) {
    showToast('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก', 'warning');
    return;
  }

  try {
    if (id) {
      await apiPut(`/guests/${id}`, data);
      showToast('แก้ไขข้อมูลสำเร็จ');
    } else {
      await apiPost('/guests', data);
      showToast('เพิ่มผู้เข้าพักสำเร็จ');
    }
    closeModal('guest-modal');
    loadGuests();
  } catch (err) {
    showToast('บันทึกล้มเหลว: ' + err.message, 'error');
  }
}

// ===== Check-in Flow =====
let checkinData = { room: null, guest: null };

function resetCheckinFlow() {
  checkinData = { room: null, guest: null };
  selectedGuestId = null;
  document.getElementById('checkin-phase1').style.display = 'block';
  document.getElementById('checkin-phase2').style.display = 'none';
  document.getElementById('checkin-phase3').style.display = 'none';
  document.getElementById('checkin-guest-found').style.display = 'none';
  setCheckinStep(1);
  clearCheckinForm();
}

function setCheckinStep(step) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`checkin-step${i}`);
    el.classList.remove('active', 'done');
    if (i < step) el.classList.add('done');
    if (i === step) el.classList.add('active');
  }
}

function clearCheckinForm() {
  ['ci-first-name', 'ci-last-name', 'ci-national-id', 'ci-phone', 'ci-address'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('checkin-search-nid').value = '';
  document.getElementById('ci-planned-days').value = '1';
}

async function loadCheckinRooms() {
  try {
    const rooms = await apiGet('/rooms?status=AVAILABLE');
    const container = document.getElementById('checkin-rooms');
    if (rooms.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏠</div><p>ไม่มีห้องว่าง</p></div>';
      return;
    }
    container.innerHTML = rooms.map(r => `
      <div class="room-card available" style="cursor:pointer;"
           onclick="selectCheckinRoom(${JSON.stringify(r).replace(/"/g, '&quot;')})">
        <div class="room-number">${r.room_number}</div>
        <div class="room-type">${bedTypeLabel(r.bed_type)}</div>
        <div class="room-price">฿${formatMoney(r.price_per_day)}/วัน</div>
        <div class="room-status-badge">เลือกห้องนี้</div>
      </div>
    `).join('');
  } catch (err) {
    showToast('โหลดห้องว่างล้มเหลว', 'error');
  }
}

function selectCheckinRoom(room) {
  checkinData.room = room;
  document.getElementById('checkin-phase1').style.display = 'none';
  document.getElementById('checkin-phase2').style.display = 'block';
  setCheckinStep(2);
}

async function searchGuestForCheckin() {
  const nid = document.getElementById('checkin-search-nid').value.trim();
  if (!nid) {
    showToast('กรุณากรอกเลขบัตรประชาชน', 'warning');
    return;
  }
  try {
    const guests = await apiGet(`/guests?national_id=${nid}`);
    const container = document.getElementById('checkin-guest-found');
    if (guests.length > 0) {
      const g = guests[0];
      selectedGuestId = g.guest_id;
      document.getElementById('ci-first-name').value = g.first_name;
      document.getElementById('ci-last-name').value = g.last_name;
      document.getElementById('ci-national-id').value = g.national_id;
      document.getElementById('ci-phone').value = g.phone || '';
      document.getElementById('ci-address').value = g.address || '';
      container.innerHTML = `
        <div class="guest-search-result">
          <div class="guest-info-text">
            <h4>🔄 พบผู้เข้าพักเก่า: ${g.first_name} ${g.last_name}</h4>
            <p>เลขบัตร: ${g.national_id} | โทร: ${g.phone || '-'}</p>
          </div>
          <span class="badge badge-info">ผู้เข้าพักซ้ำ</span>
        </div>
      `;
      container.style.display = 'block';
      showToast('พบข้อมูลผู้เข้าพักเก่า กรอกข้อมูลให้อัตโนมัติแล้ว', 'info');
    } else {
      container.innerHTML = `
        <div class="guest-search-result" style="background:#FEF3C7; border-color:#FCD34D;">
          <div class="guest-info-text">
            <h4>ไม่พบข้อมูลผู้เข้าพักเก่า</h4>
            <p>กรุณากรอกข้อมูลใหม่ด้านล่าง</p>
          </div>
        </div>
      `;
      container.style.display = 'block';
      selectedGuestId = null;
    }
  } catch (err) {
    showToast('ค้นหาล้มเหลว: ' + err.message, 'error');
  }
}

function proceedToConfirm() {
  const firstName = document.getElementById('ci-first-name').value.trim();
  const lastName = document.getElementById('ci-last-name').value.trim();
  const nationalId = document.getElementById('ci-national-id').value.trim();
  const phone = document.getElementById('ci-phone').value.trim();
  const address = document.getElementById('ci-address').value.trim();
  const method = document.getElementById('ci-payment-method').value;
  const plannedDays = parseInt(document.getElementById('ci-planned-days').value) || 1;

  if (!firstName || !lastName || !nationalId) {
    showToast('กรุณากรอกชื่อ นามสกุล และเลขบัตรประชาชน', 'warning');
    return;
  }
  if (!/^\d{13}$/.test(nationalId)) {
    showToast('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก', 'warning');
    return;
  }
  if (phone && !/^\d{10}$/.test(phone)) {
    showToast('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก', 'warning');
    return;
  }
  if (plannedDays < 1) {
    showToast('จำนวนวันพักต้องอย่างน้อย 1 วัน', 'warning');
    return;
  }

  checkinData.guest = { firstName, lastName, nationalId, phone, address, method, plannedDays };

  document.getElementById('checkin-phase2').style.display = 'none';
  document.getElementById('checkin-phase3').style.display = 'block';
  setCheckinStep(3);

  const room = checkinData.room;
  const roomCharge = parseFloat(room.price_per_day) * plannedDays;
  const total = roomCharge + 100;

  document.getElementById('checkin-summary').innerHTML = `
    <div class="summary-box">
      <h4>📋 สรุปการเช็คอิน</h4>
      <div class="summary-row">
        <span>ห้อง</span>
        <span>${room.room_number} (${bedTypeLabel(room.bed_type)})</span>
      </div>
      <div class="summary-row">
        <span>ผู้เข้าพัก</span>
        <span>${firstName} ${lastName}</span>
      </div>
      <div class="summary-row">
        <span>เลขบัตรประชาชน</span>
        <span>${nationalId}</span>
      </div>
      <div class="summary-row">
        <span>โทรศัพท์</span>
        <span>${phone || '-'}</span>
      </div>
      <div class="summary-row">
        <span>จำนวนวันพัก</span>
        <span>${plannedDays} วัน</span>
      </div>
      <div class="summary-row">
        <span>ค่าห้อง (฿${formatMoney(room.price_per_day)} × ${plannedDays} วัน)</span>
        <span>฿${formatMoney(roomCharge)}</span>
      </div>
      <div class="summary-row">
        <span>เงินมัดจำกุญแจ</span>
        <span>฿100.00</span>
      </div>
      <div class="summary-row">
        <span>วิธีชำระ</span>
        <span>${methodLabel(method)}</span>
      </div>
      <div class="summary-row total">
        <span>รวมทั้งสิ้น</span>
        <span>฿${formatMoney(total)}</span>
      </div>
    </div>
  `;
}

async function confirmCheckin() {
  const { room, guest } = checkinData;
  try {
    // If no existing guest, create one first
    let guestId = selectedGuestId;
    if (!guestId) {
      const newGuest = await apiPost('/guests', {
        first_name: guest.firstName,
        last_name: guest.lastName,
        national_id: guest.nationalId,
        phone: guest.phone,
        address: guest.address
      });
      guestId = newGuest.guest_id;

      if (newGuest.returning_customer) {
        showToast('พบผู้เข้าพักเก่า ใช้ข้อมูลเดิม', 'info');
      }
    }

    const result = await apiPost('/checkin', {
      guest_id: guestId,
      room_id: room.room_id,
      payment_method: guest.method,
      planned_days: guest.plannedDays || 1
    });

    showToast(`เช็คอินสำเร็จ! ห้อง ${room.room_number} (พัก ${guest.plannedDays || 1} วัน)`, 'success');
    resetCheckinFlow();
    loadCheckinRooms();
  } catch (err) {
    showToast('เช็คอินล้มเหลว: ' + err.message, 'error');
  }
}

// ===== Check-out =====
async function loadActiveStays() {
  try {
    const stays = await apiGet('/stays/active');
    const container = document.getElementById('checkout-list');
    const empty = document.getElementById('checkout-empty');

    if (stays.length === 0) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    container.innerHTML = stays.map(s => {
      const checkIn = new Date(s.check_in);
      const now = new Date();
      const plannedDays = s.planned_days || 1;
      const diffHours = Math.floor((now - checkIn) / (1000 * 60 * 60));

      // Calculate expected checkout based on planned_days
      const checkInDay = new Date(checkIn);
      checkInDay.setHours(0, 0, 0, 0);
      const expectedCheckout = new Date(checkInDay);
      expectedCheckout.setDate(expectedCheckout.getDate() + plannedDays);
      expectedCheckout.setHours(12, 0, 0, 0);
      const isLate = now > expectedCheckout;

      return `
        <div class="checkout-card">
          <div class="checkout-header">
            <div>
              <div class="guest-name">${s.first_name} ${s.last_name}</div>
              <div style="font-size:0.82rem; color:var(--text-muted);">เลขบัตร: ${s.national_id}</div>
            </div>
            <span class="badge ${isLate ? 'badge-danger' : 'badge-info'}">
              ห้อง ${s.room_number}
            </span>
          </div>
          <div class="detail-row">
            <span class="label">ประเภทห้อง</span>
            <span class="value">${bedTypeLabel(s.bed_type)}</span>
          </div>
          <div class="detail-row">
            <span class="label">ราคา/วัน</span>
            <span class="value">฿${formatMoney(s.price_per_day)}</span>
          </div>
          <div class="detail-row">
            <span class="label">เช็คอินเมื่อ</span>
            <span class="value">${formatDateTime(s.check_in)}</span>
          </div>
          <div class="detail-row">
            <span class="label">กำหนดพัก</span>
            <span class="value">${plannedDays} วัน (ถึง ${formatDateTime(expectedCheckout)})</span>
          </div>
          <div class="detail-row">
            <span class="label">ระยะเวลา</span>
            <span class="value">${diffHours} ชั่วโมง ${isLate ? '⚠️ เกินกำหนด' : ''}</span>
          </div>
          <div class="detail-row">
            <span class="label">เงินมัดจำ</span>
            <span class="value">฿100.00 (${s.deposit_status === 'PAID' ? 'ยังไม่คืน' : 'คืนแล้ว'})</span>
          </div>
          <div style="margin-top:14px;">
            <button class="btn btn-danger" onclick="openCheckoutModal(${s.stay_id}, '${s.first_name} ${s.last_name}', '${s.room_number}', '${s.check_in}', ${s.price_per_day}, ${plannedDays})">
              📤 เช็คเอาท์
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showToast('โหลดข้อมูลผู้เข้าพักล้มเหลว', 'error');
  }
}

function openCheckoutModal(stayId, guestName, roomNumber, checkIn, pricePerDay, plannedDays = 1) {
  checkoutStayId = stayId;
  const checkInDate = new Date(checkIn);
  const now = new Date();

  // Calculate late fees based on planned_days
  const checkInDay = new Date(checkInDate);
  checkInDay.setHours(0, 0, 0, 0);
  const expectedCheckout = new Date(checkInDay);
  expectedCheckout.setDate(expectedCheckout.getDate() + plannedDays);
  expectedCheckout.setHours(12, 0, 0, 0);

  let lateFee = 0;
  let extraDays = 0;
  if (now > expectedCheckout) {
    const diffMs = now - expectedCheckout;
    extraDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    lateFee = extraDays * pricePerDay;
  }

  document.getElementById('checkout-modal-body').innerHTML = `
    <div class="summary-box">
      <h4>📋 สรุปการเช็คเอาท์</h4>
      <div class="summary-row">
        <span>ผู้เข้าพัก</span>
        <span>${guestName}</span>
      </div>
      <div class="summary-row">
        <span>ห้อง</span>
        <span>${roomNumber}</span>
      </div>
      <div class="summary-row">
        <span>เช็คอิน</span>
        <span>${formatDateTime(checkIn)}</span>
      </div>
      <div class="summary-row">
        <span>กำหนดพัก</span>
        <span>${plannedDays} วัน (ถึง ${formatDateTime(expectedCheckout)})</span>
      </div>
      <div class="summary-row">
        <span>เช็คเอาท์</span>
        <span>${formatDateTime(now)}</span>
      </div>
      ${extraDays > 0 ? `
        <div class="summary-row" style="color:var(--danger);">
          <span>⚠️ เกินกำหนด ${extraDays} วัน</span>
          <span>+฿${formatMoney(lateFee)}</span>
        </div>
      ` : `
        <div class="summary-row" style="color:var(--success);">
          <span>✅ ไม่เกินกำหนด</span>
          <span>ไม่มีค่าปรับ</span>
        </div>
      `}
    </div>
    <div style="margin-top:16px;">
      <label class="checkbox-wrap">
        <input type="checkbox" id="checkout-key-returned" checked>
        <span>🔑 ผู้เข้าพักคืนกุญแจแล้ว (คืนเงินมัดจำ ฿100)</span>
      </label>
    </div>
    <div class="form-group" style="margin-top:14px;">
      <label class="form-label">วิธีชำระเงิน (สำหรับค่าปรับ/คืนมัดจำ)</label>
      <select class="form-select" id="checkout-method">
        <option value="CASH">เงินสด</option>
        <option value="TRANSFER">โอนเงิน</option>
        <option value="CREDIT_CARD">บัตรเครดิต</option>
      </select>
    </div>
  `;
  openModal('checkout-modal');
}

async function confirmCheckout() {
  if (!checkoutStayId) return;
  const keyReturned = document.getElementById('checkout-key-returned').checked;
  const method = document.getElementById('checkout-method').value;

  try {
    const result = await apiPost(`/checkout/${checkoutStayId}`, {
      key_returned: keyReturned,
      payment_method: method
    });

    let msg = `เช็คเอาท์ห้อง ${result.room_number} สำเร็จ`;
    if (result.late_fee > 0) {
      msg += ` | ค่าปรับ: ฿${formatMoney(result.late_fee)}`;
    }
    if (result.deposit_returned) {
      msg += ' | คืนมัดจำแล้ว';
    }
    showToast(msg, 'success');
    closeModal('checkout-modal');
    loadActiveStays();
  } catch (err) {
    showToast('เช็คเอาท์ล้มเหลว: ' + err.message, 'error');
  }
}

// ===== Payments =====
async function loadPayments() {
  try {
    const payments = await apiGet('/payments');
    const tbody = document.getElementById('payments-table-body');

    tbody.innerHTML = payments.map(p => `
      <tr>
        <td>${formatDateTime(p.payment_date)}</td>
        <td>${p.room_number}</td>
        <td>${p.first_name} ${p.last_name}</td>
        <td>
          <span class="badge ${p.payment_type === 'DEPOSIT_RETURN' ? 'badge-warning' :
        p.payment_type === 'LATE_FEE' ? 'badge-danger' :
          p.payment_type === 'DEPOSIT' ? 'badge-info' : 'badge-success'}">
            ${paymentTypeLabel(p.payment_type)}
          </span>
        </td>
        <td>${methodLabel(p.method)}</td>
        <td style="font-weight:700; ${parseFloat(p.amount) < 0 ? 'color:var(--danger)' : ''}">
          ${parseFloat(p.amount) < 0 ? '-' : ''}฿${formatMoney(Math.abs(p.amount))}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('โหลดข้อมูลการชำระเงินล้มเหลว', 'error');
  }
}

// ===== Reports =====
async function loadReport() {
  const month = document.getElementById('report-month').value;
  const year = document.getElementById('report-year').value;
  try {
    const report = await apiGet(`/reports/monthly?year=${year}&month=${month}`);
    const s = report.summary;

    const thMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    document.getElementById('report-content').innerHTML = `
      <div class="section-title">📊 รายงานเดือน${thMonths[report.month]} ${report.year}</div>

      <div class="stats-grid">
        <div class="stat-card teal">
          <div class="stat-icon">👤</div>
          <div class="stat-value">${s.total_guests}</div>
          <div class="stat-label">ผู้เข้าพักทั้งหมด</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon">🛏️</div>
          <div class="stat-value">${s.total_stays}</div>
          <div class="stat-label">การเข้าพักทั้งหมด</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">🚪</div>
          <div class="stat-value">${s.rooms_used}</div>
          <div class="stat-label">ห้องที่ถูกใช้งาน</div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon">💰</div>
          <div class="stat-value">฿${formatMoney(s.total_revenue)}</div>
          <div class="stat-label">รายได้รวม</div>
        </div>
      </div>

      <div class="report-grid">
        <div class="report-card">
          <h4>💰 รายได้แยกตามประเภท</h4>
          <div class="report-item">
            <span class="label">ค่าห้องพัก</span>
            <span class="value">฿${formatMoney(s.room_revenue)}</span>
          </div>
          <div class="report-item">
            <span class="label">ค่าปรับเกินเวลา</span>
            <span class="value">฿${formatMoney(s.late_fee_revenue)}</span>
          </div>
          <div class="report-item">
            <span class="label">เงินมัดจำรับ</span>
            <span class="value">฿${formatMoney(s.deposit_collected)}</span>
          </div>
          <div class="report-item">
            <span class="label">เงินมัดจำคืน</span>
            <span class="value" style="color:var(--danger)">฿${formatMoney(Math.abs(s.deposit_returned))}</span>
          </div>
          <div class="report-item">
            <span class="label">รายได้สุทธิ</span>
            <span class="value" style="color:var(--primary); font-size:1.05rem;">฿${formatMoney(s.total_revenue)}</span>
          </div>
        </div>

        <div class="report-card">
          <h4>🛏️ แยกตามประเภทห้อง</h4>
          ${report.room_type_breakdown.length > 0 ? report.room_type_breakdown.map(rt => `
            <div class="report-item">
              <span class="label">${bedTypeLabel(rt.bed_type)} (${rt.count} ครั้ง)</span>
              <span class="value">฿${formatMoney(rt.revenue)}</span>
            </div>
          `).join('') : '<div class="report-item"><span class="label">ไม่มีข้อมูล</span><span></span></div>'}
        </div>
      </div>

      ${report.daily_breakdown.length > 0 ? `
        <div style="margin-top:24px;">
          <div class="section-title">📅 รายละเอียดรายวัน</div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr><th>วันที่</th><th>จำนวนเข้าพัก</th><th>ผู้เข้าพัก (ไม่ซ้ำ)</th></tr>
              </thead>
              <tbody>
                ${report.daily_breakdown.map(d => `
                  <tr>
                    <td>${formatDate(d.date)}</td>
                    <td>${d.stays}</td>
                    <td>${d.guests}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;
  } catch (err) {
    showToast('โหลดรายงานล้มเหลว: ' + err.message, 'error');
  }
}

// ===== Room Status Update =====
async function saveRoomStatus() {
  if (!editingRoomId) return;
  const status = document.getElementById('room-status-select').value;
  try {
    await apiPut(`/rooms/${editingRoomId}/status`, { status });
    showToast(`เปลี่ยนสถานะห้องเป็น ${statusLabel(status)} สำเร็จ`);
    closeModal('room-status-modal');
    loadRooms();
  } catch (err) {
    showToast('เปลี่ยนสถานะล้มเหลว: ' + err.message, 'error');
  }
}

// ===== Modal Helpers =====
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ===== Clock =====
function updateClock() {
  const now = new Date();
  document.getElementById('current-time').textContent =
    now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
    ' ' + now.toLocaleTimeString('th-TH');
}

// ===== Sidebar Toggle (Mobile) =====
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen = sidebar.classList.toggle('open');
  if (isOpen) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
  // Hamburger menu toggle
  document.getElementById('hamburger-btn').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  // Navigation (close sidebar on mobile after navigating)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.page);
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });

  // Guest search
  let searchTimeout;
  document.getElementById('guest-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadGuests(e.target.value.trim()), 300);
  });

  // Add guest button
  document.getElementById('btn-add-guest').addEventListener('click', () => {
    document.getElementById('edit-guest-id').value = '';
    document.getElementById('modal-first-name').value = '';
    document.getElementById('modal-last-name').value = '';
    document.getElementById('modal-national-id').value = '';
    document.getElementById('modal-phone').value = '';
    document.getElementById('modal-address').value = '';
    document.getElementById('guest-modal-title').textContent = 'เพิ่มผู้เข้าพัก';
    openModal('guest-modal');
  });

  // Guest modal
  document.getElementById('guest-modal-save').addEventListener('click', saveGuest);
  document.getElementById('guest-modal-close').addEventListener('click', () => closeModal('guest-modal'));
  document.getElementById('guest-modal-cancel').addEventListener('click', () => closeModal('guest-modal'));

  // Check-in flow
  document.getElementById('btn-search-guest').addEventListener('click', searchGuestForCheckin);
  document.getElementById('btn-checkin-next').addEventListener('click', proceedToConfirm);
  document.getElementById('btn-confirm-checkin').addEventListener('click', confirmCheckin);
  document.getElementById('checkin-back1').addEventListener('click', () => {
    document.getElementById('checkin-phase2').style.display = 'none';
    document.getElementById('checkin-phase1').style.display = 'block';
    setCheckinStep(1);
  });
  document.getElementById('checkin-back2').addEventListener('click', () => {
    document.getElementById('checkin-phase3').style.display = 'none';
    document.getElementById('checkin-phase2').style.display = 'block';
    setCheckinStep(2);
  });

  // Checkout modal
  document.getElementById('checkout-modal-confirm').addEventListener('click', confirmCheckout);
  document.getElementById('checkout-modal-close').addEventListener('click', () => closeModal('checkout-modal'));
  document.getElementById('checkout-modal-cancel').addEventListener('click', () => closeModal('checkout-modal'));

  // Room status modal
  document.getElementById('room-status-save').addEventListener('click', saveRoomStatus);
  document.getElementById('room-status-modal-close').addEventListener('click', () => closeModal('room-status-modal'));
  document.getElementById('room-status-cancel').addEventListener('click', () => closeModal('room-status-modal'));

  // Report
  document.getElementById('btn-load-report').addEventListener('click', loadReport);
  const now = new Date();
  document.getElementById('report-month').value = now.getMonth() + 1;
  document.getElementById('report-year').value = now.getFullYear();

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Initial load
  loadDashboard();
});
