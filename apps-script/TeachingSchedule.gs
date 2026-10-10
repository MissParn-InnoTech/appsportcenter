/**
 * TeachingSchedule.gs
 * อ่านตารางสอนรายครู (ทุกแท็บที่ขึ้นต้น A1 ด้วย "ตารางสอน — ...")
 * แล้วส่งออกเป็น JSON ให้แอพ ACT Sport Center
 *
 * เรียกใช้:  <WEB_APP_URL>?action=teachingSchedule
 *           <WEB_APP_URL>?action=teachingSchedule&teacher=ชาญวิทย์
 *           <WEB_APP_URL>?action=teachingSchedule&refresh=1   (ล้างแคช อ่านชีตใหม่)
 */

const TS_SHEET_ID   = '1TnKrz8r3nWwC9tT-76YgJxNGey6iVwCSE4m2XYmdy74';
const TS_CACHE_KEY  = 'teachingSchedule_v1';
const TS_CACHE_SEC  = 600;      // แคช 10 นาที
const TS_CHUNK      = 30000;    // ตัวอักษรไทย = 3 byte, แคชรับได้ 100KB/คีย์
const TS_DAYS       = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
const TS_ROOM_WORDS = /(ห้อง|สนาม|สระ|ศูนย์|ยิม|ลาน|คอร์ท|court|gym|fitness)/i;
const TS_ACTIVITY   = /(ชมรม|ประชุม|ลูกเสือ|กิจกรรม|HR|จริยะ|โฮมรูม)/i;
const TS_ASSIGN_TAB  = 'มอบหมายครู';   // แท็บเก็บรายชื่อครูที่มอบหมายให้แต่ละตาราง (สร้างให้อัตโนมัติ)
const TS_CLASS_TOKEN = /^(\d{1,2}\/\d{1,2}|\d{1,2}[A-Z])$/;

/* ---------- 1) เรียกจาก doGet เดิม ---------- */
function handleTeachingSchedule_(e) {
  const p = (e && e.parameter) || {};
  let data = p.refresh === '1' ? null : tsCacheGet_();
  if (!data) {
    data = buildTeachingSchedule_();
    tsCachePut_(data);
  }

  if (p.teacher) {
    const key = tsNormName_(p.teacher);
    const hits = key.length < 2 ? [] : data.teachers.filter(t => {
      const n = tsNormName_(t.name);
      return n === key || n.includes(key) || key.includes(n);
    });
    const ids = hits.map(h => h.id);
    data = Object.assign({}, data, {
      teachers: hits,
      slots: data.slots.filter(s => ids.indexOf(s.teacherId) >= 0),
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 2) อ่านชีต → JSON ---------- */
function buildTeachingSchedule_() {
  const ss = SpreadsheetApp.openById(TS_SHEET_ID);
  const teachers = [];
  const slots = [];
  const warnings = [];
  const seenGrid = {};
  let periodsMeta = null;
  let year = '';

  ss.getSheets().forEach(sh => {
    const v = sh.getDataRange().getDisplayValues();
    if (!v.length) return;

    const title = String(v[0][0] || '').trim();
    const m = title.match(/^ตารางสอน\s*[—–-]\s*(.+)$/);
    if (!m) {
      if (/#REF!|#N\/A|#ERROR|#VALUE/.test(title)) {
        warnings.push(`แท็บ "${sh.getName()}" มีสูตรเสีย (${title}) — ข้ามแท็บนี้`);
      }
      return; // ไม่ใช่แท็บตารางสอนรายคน (เช่น ตารางรวมทุกคน)
    }

    const name = m[1].trim();
    const sub = String((v[1] || [])[0] || '');
    const dept = ((sub.match(/งาน\/กีฬา:\s*([^|]+)/) || [])[1] || '').trim();
    year = year || (sub.match(/ปีการศึกษา\s*(\d{4})/) || [])[1] || '';

    const hRow = v.findIndex(r => String(r[0]).replace(/\s/g, '') === 'วัน/คาบ');
    if (hRow < 0) {
      warnings.push(`แท็บ "${sh.getName()}" ไม่พบหัวตาราง "วัน / คาบ" — ข้าม`);
      return;
    }

    // หัวคอลัมน์คาบ
    const periods = [];
    for (let c = 1; c < v[hRow].length; c++) {
      const p = tsParsePeriod_(v[hRow][c]);
      if (p) { p.col = c; periods.push(p); }
    }
    periodsMeta = periodsMeta || periods.map(({ col, ...rest }) => rest);

    const teacherId = String(sh.getSheetId());
    const gridSig = [];
    let count = 0;

    for (let r = hRow + 1; r < Math.min(v.length, hRow + 10); r++) {
      const day = String(v[r][0] || '').trim();
      const dayIndex = TS_DAYS.indexOf(day) + 1; // 1 = จันทร์
      if (!dayIndex) continue;

      periods.forEach(p => {
        const raw = String(v[r][p.col] || '').trim();
        if (!raw) return;
        gridSig.push(`${dayIndex}:${p.period}:${raw}`);
        const cell = tsParseCell_(raw);
        if (cell.type === 'teaching' && p.countsAsPeriod) count++;
        slots.push(Object.assign({
          id: `${teacherId}-${dayIndex}-${p.period}`,
          teacherId, teacher: name, dept,
          day, dayIndex,
          period: p.period, periodLabel: p.label,
          start: p.start, end: p.end,
          raw,
        }, cell));
      });
    }

    // ตรวจแท็บที่ข้อมูลซ้ำกันทุกช่อง (มักเกิดจากสูตรอ้างอิงแถวผิด)
    const sig = gridSig.join('|');
    if (sig && seenGrid[sig]) {
      warnings.push(`ตารางของ "${name}" เหมือนกับ "${seenGrid[sig]}" ทุกช่อง — ตรวจสูตรอ้างอิงจาก sheet ตารางรวมทุกคน`);
    } else if (sig) {
      seenGrid[sig] = name;
    }

    teachers.push({ id: teacherId, name, dept, sheetName: sh.getName(), teachingPeriods: count });
  });

  // แนบรายชื่อครูที่มอบหมายให้แต่ละตาราง
  const assign = tsReadAssignments_(ss);
  teachers.forEach(t => { t.assignees = assign[t.name] || []; });

  return {
    meta: {
      source: TS_SHEET_ID,
      academicYear: year,
      updatedAt: new Date().toISOString(),
      periods: periodsMeta || [],
      warnings,
    },
    teachers,
    slots,
  };
}

/* ---------- helpers ---------- */
function tsParsePeriod_(label) {
  const t = String(label || '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const after = /after\s*school/i.test(t);
  const num = (t.match(/คาบ\s*(\d+)/) || [])[1];
  if (!num && !after) return null;
  const tm = t.match(/(\d{1,2})[.:](\d{2})\s*[–—-]?\s*(\d{1,2})[.:](\d{2})/);
  const hhmm = (h, m) => ('0' + h).slice(-2) + ':' + m;
  return {
    period: after ? 'AS' : Number(num),
    label: after ? 'After School' : 'คาบ ' + num,
    start: tm ? hhmm(tm[1], tm[2]) : '',
    end: tm ? hhmm(tm[3], tm[4]) : '',
    countsAsPeriod: !after,
  };
}

function tsParseCell_(text) {
  const brackets = [];
  const body = text.replace(/\[([^\]]*)\]/g, (_, x) => { brackets.push(x.trim()); return ' '; }).trim();

  let room = '';
  const notes = [];
  brackets.forEach(b => {
    if (!room && TS_ROOM_WORDS.test(b)) room = b; else notes.push(b);
  });

  const tokens = body.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);
  const classes = tokens.filter(t => TS_CLASS_TOKEN.test(t));
  const subject = tokens.filter(t => !TS_CLASS_TOKEN.test(t)).join(', ');

  const wk = notes.join(' ').match(/week\s*(\d+)\s*[-–]\s*(\d+)/i);

  return {
    subject,                       // เช่น "วิทย์กีฬา ม.5", "เลือกเสรี"
    classes,                       // เช่น ["4/7","4C","5/4"]
    room,                          // เช่น "ห้องเต้น 1"
    notes,                         // วงเล็บอื่นๆ เช่น "ม.6/9", "week 11-18"
    weeks: wk ? { from: Number(wk[1]), to: Number(wk[2]) } : null,
    type: TS_ACTIVITY.test(body) ? 'activity' : 'teaching',
  };
}

function tsNormName_(s) {
  return String(s || '')
    .replace(/^(ม\.|มิส|มาสเตอร์|ครู|อ\.|mr\.?|ms\.?|mrs\.?|miss)\s*/i, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function tsCachePut_(obj) {
  try {
    const s = JSON.stringify(obj);
    const n = Math.ceil(s.length / TS_CHUNK);
    const map = {};
    for (let i = 0; i < n; i++) map[TS_CACHE_KEY + '_' + i] = s.substr(i * TS_CHUNK, TS_CHUNK);
    map[TS_CACHE_KEY + '_n'] = String(n);
    CacheService.getScriptCache().putAll(map, TS_CACHE_SEC);
  } catch (err) { /* แคชไม่ได้ก็ยังตอบข้อมูลสดได้ */ }
}

function tsCacheGet_() {
  const c = CacheService.getScriptCache();
  const n = Number(c.get(TS_CACHE_KEY + '_n'));
  if (!n) return null;
  const keys = Array.from({ length: n }, (_, i) => TS_CACHE_KEY + '_' + i);
  const got = c.getAll(keys);
  if (keys.some(k => !got[k])) return null;
  try { return JSON.parse(keys.map(k => got[k]).join('')); } catch (e) { return null; }
}

/* ---------- มอบหมายครูผู้สอนให้ตาราง (1 ตาราง มีครูได้หลายคน) ----------
   เก็บในแท็บ "มอบหมายครู": ตาราง | ครู | ผู้มอบหมาย | เวลา  (1 แถว = ครู 1 คน)
   เว็บเรียก POST { action: 'assignScheduleTeachers', payload: { scheduleName, teachers: [...], by } }
   รายชื่อที่ส่งมาจะ "แทนที่" รายชื่อเดิมของตารางนั้นทั้งหมด */
function tsAssignSheet_(ss, create) {
  let sh = ss.getSheetByName(TS_ASSIGN_TAB);
  if (!sh && create) {
    sh = ss.insertSheet(TS_ASSIGN_TAB);
    sh.getRange(1, 1, 1, 4).setValues([['ตาราง', 'ครู', 'ผู้มอบหมาย', 'เวลา']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function tsReadAssignments_(ss) {
  const sh = tsAssignSheet_(ss, false);
  const out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues().forEach(r => {
    const k = String(r[0]).trim(), t = String(r[1]).trim();
    if (!k || !t) return;
    out[k] = out[k] || [];
    if (out[k].indexOf(t) < 0) out[k].push(t);
  });
  return out;
}

function handleAssignScheduleTeachers_(payload) {
  const name = String((payload && payload.scheduleName) || '').trim();
  if (!name) throw new Error('ต้องระบุชื่อตาราง');
  const seen = {};
  const list = ((payload && payload.teachers) || [])
    .map(t => String(t || '').trim())
    .filter(t => t && !seen[t] && (seen[t] = true));
  const by = String((payload && payload.by) || '').trim();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.openById(TS_SHEET_ID);
    const sh = tsAssignSheet_(ss, true);
    // ลบแถวเดิมของตารางนี้ (ไล่จากล่างขึ้นบน) แล้วเขียนรายชื่อใหม่ต่อท้าย
    const last = sh.getLastRow();
    if (last >= 2) {
      const col = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
      for (let i = col.length - 1; i >= 0; i--) {
        if (String(col[i][0]).trim() === name) sh.deleteRow(i + 2);
      }
    }
    if (list.length) {
      const now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');
      sh.getRange(sh.getLastRow() + 1, 1, list.length, 4).setValues(list.map(t => [name, t, by, now]));
    }
    CacheService.getScriptCache().remove(TS_CACHE_KEY + '_n'); // ล้างแคช ให้เว็บเห็นรายชื่อใหม่ทันที
  } finally {
    lock.releaseLock();
  }
  return { scheduleName: name, teachers: list };
}

/* doPost — ถ้าย้ายไปรวมกับโปรเจกต์ที่มี doPost อยู่แล้ว ให้ลบฟังก์ชันนี้ออก แล้วเพิ่ม
   if (action === 'assignScheduleTeachers') ... handleAssignScheduleTeachers_(payload) ใน doPost เดิมแทน */
function doPost(e) {
  let out;
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action !== 'assignScheduleTeachers') throw new Error('unknown action: ' + body.action);
    out = { ok: true, result: handleAssignScheduleTeachers_(body.payload) };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 3) รันทดสอบใน editor ก่อน Deploy ---------- */
function testTeachingSchedule() {
  const d = buildTeachingSchedule_();
  Logger.log(`ครู ${d.teachers.length} คน, ${d.slots.length} ช่อง, ปีการศึกษา ${d.meta.academicYear}`);
  d.teachers.forEach(t => Logger.log(`- ${t.name} (${t.dept}) ${t.teachingPeriods} คาบ`));
  Logger.log('คำเตือน:\n' + (d.meta.warnings.join('\n') || '-'));
  Logger.log(JSON.stringify(d.slots.slice(0, 3), null, 2));
}

/* ---------- 4) doGet — ใช้เมื่อ deploy สคริปต์นี้เป็นโปรเจกต์แยก ----------
   ถ้าจะย้ายไปรวมกับโปรเจกต์ครุภัณฑ์ (Code.gs) ให้ลบฟังก์ชันนี้ออก แล้วเพิ่ม
   if (e.parameter.action === 'teachingSchedule') return handleTeachingSchedule_(e);
   ไว้บรรทัดแรกของ doGet เดิมแทน (โปรเจกต์เดียวกันมี doGet ได้แค่ตัวเดียว) */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'teachingSchedule';
  if (action === 'teachingSchedule') return handleTeachingSchedule_(e);
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unknown action: ' + action }))
    .setMimeType(ContentService.MimeType.JSON);
}
