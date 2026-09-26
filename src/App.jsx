import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar,
} from "recharts";
import {
  LayoutDashboard, Package, MapPin, ArrowLeftRight, Wrench, BarChart3,
  FileText, Sparkles, LogOut, Search, ChevronRight, CheckCircle2, XCircle,
  AlertTriangle, Clock, Plus, X, Eye, Pencil, ShieldCheck, TrendingUp,
  Building2, Shirt, Trophy, Download, Bell, ChevronDown, User, Users,
  ClipboardList, MessageSquare, UserCheck, Play, CalendarDays, ListChecks,
  BookOpen, DollarSign, Upload, ExternalLink, CalendarClock, Lock, Menu, KeyRound, Languages, RefreshCw, Copy, EyeOff,
  Dumbbell, Waves, Target, Music, Sword, Mountain, Flag, Circle, Landmark,
} from "lucide-react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { applyLang, getLang } from "./i18n.js";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { th } from "date-fns/locale/th";

const calendarLocalizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { locale: th }), getDay, locales: { th },
});

/* ============================================================
   DESIGN TOKENS — ACT Sport Center
   Deep Royal Blue + Crimson + Gold on white. Premium enterprise,
   sports-technology feel. No rounded "SaaS card kit" sameness —
   flat panels, a hairline rule system, and a court-line motif.
   ============================================================ */
const C = {
  navy: "#181818",       // primary — near-black (was deep royal blue)
  navyDeep: "#0A0A0A",   // sidebar / hero — true black
  navySoft: "#3D3D3D",   // secondary neutral
  crimson: "#C81E3A",    // primary red accent
  crimsonDeep: "#8C1327",
  gold: "#7A1220",       // tertiary accent — deep red (was gold)
  goldSoft: "#F1D2D6",   // light red tint (was gold tint)
  accent: "#E4354F",     // bright red — for icons/highlights on dark backgrounds
  ink: "#12151C",
  slate: "#5B6273",
  line: "#E2E4EA",
  paper: "#FBFBFA",
  white: "#FFFFFF",
  ok: "#1E7A4C",
  okBg: "#EAF6EF",
  warn: "#B8791A",
  warnBg: "#FBF1DF",
  bad: "#B91C3C",
  badBg: "#FBEAEC",
  mute: "#8A8FA0",
};

const FONT = "'Noto Sans Thai','Sarabun',ui-sans-serif,system-ui,-apple-system,sans-serif";

/* ============================================================
   GOOGLE SHEETS BACKEND
   ------------------------------------------------------------
   ระบบหลังบ้านคือไฟล์ Google Sheet "ระบบครุภัณฑ์ศูนย์กีฬา"
   (https://docs.google.com/spreadsheets/d/15KZQHTfveli-.../edit)
   ผ่าน Web App ที่ deploy จาก Apps Script (ไฟล์ Code.gs ที่แนบมาด้วย)

   วิธีเปิดใช้งานจริง: deploy Code.gs เป็น Web App แล้วนำ URL ที่ได้
   มาใส่ค่าด้านล่างนี้ — ถ้าเว้นว่างไว้ ระบบจะทำงานด้วยข้อมูลตัวอย่าง
   ในเครื่อง (seed data) เหมือนเดิม ไม่กระทบการใช้งาน
   ============================================================ */
// Web App ระบบครุภัณฑ์ (Code.gs)
const API_URL = "https://script.google.com/macros/s/AKfycbzjryObqjBJReU4wVUJ3WLUnzJEYWYyp2bUWTFxV86EtGNTihJO98yBy0TdUZ_ydI2JmQ/exec";
// Web App ตารางสอนรายครู (TeachingSchedule.gs) — deploy แยกเป็นอีกโปรเจกต์
const TEACHING_API_URL = "https://script.google.com/macros/s/AKfycbym8sgvcirl5YoNYHp4P6nmGQSyCh7Hcx4Ap6a-bZCgbou34uiUklwpdrAEsXFpVmU/exec";

// ตัดคำนำหน้าชื่อ (นาย/นาง/น.ส./นางสาว/มิส/ม./ครู/คุณครู) และช่องว่างออก เพื่อเทียบ
// ชื่อครูข้ามแหล่งข้อมูลที่สะกดคำนำหน้าไม่ตรงกัน (ชีตบุคลากร vs ชีตตารางสอน)
function normTeacherName(s) {
  return String(s || "")
    .replace(/(นางสาว|น\.ส\.|นาย|นาง|มาสเตอร์|เมสเตอร์|มิสเตอร์|มิส|คุณครู|ครู|ม\.)/g, "")
    .replace(/\s+/g, "")
    .trim();
}
function catCodeFromName(name) {
  const hit = CATEGORIES.find((c) => c.name === name);
  return hit ? hit.code : name;
}
function fmtDate(v) {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  try { return new Date(v).toISOString().slice(0, 10); } catch { return String(v); }
}
async function sheetsFetch(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error("Sheets API error " + res.status);
  return res.json();
}
const DOC_ICON_STORAGE_KEY = "act.document.icons.v1";
function readDocIconCache() {
  try { return JSON.parse(localStorage.getItem(DOC_ICON_STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveDocIcon(id, icon) {
  if (!id) return;
  try { localStorage.setItem(DOC_ICON_STORAGE_KEY, JSON.stringify({ ...readDocIconCache(), [id]: icon })); } catch { /* ignore */ }
}
async function loadFromSheets() {
  const data = await sheetsFetch(`${API_URL}?action=data`);
  if (!data.ok) throw new Error(data.error || "load failed");
  const items = data.items.map((r) => ({
    id: r["รหัส"], code: r["รหัส"], name: r["รายการ"], brand: r["ยี่ห้อ / รุ่น"] || "",
    catCode: catCodeFromName(r["หมวด"]), loc: r["สถานที่เก็บ"], owner: r["ผู้ดูแล"],
    normal: Number(r["ปกติ"]) || 0, damaged: Number(r["ชำรุด"]) || 0,
    lost: Number(r["สูญหาย"]) || 0, disposed: Number(r["จำหน่ายออก"]) || 0,
    borrowed: Number(r["ถูกยืมอยู่"]) || 0, minAlert: Number(r["เตือนเมื่อเหลือ"]) || 0,
    price: Number(r["ราคา/หน่วย"]) || 0, note: r["หมายเหตุ"] || "", imageUrl: r["รูปภาพ"] || "", _row: r._row,
  }));
  const borrows = data.borrows.map((r) => ({
    id: `BR-${r._row}`, _row: r._row, date: fmtDate(r["วันที่ยืม"]), borrower: r["ผู้ยืม"],
    itemCode: r["รหัสอุปกรณ์"], itemName: r["ชื่ออุปกรณ์"], qty: Number(r["จำนวน"]) || 0,
    where: r["ใช้ที่ไหน"], purpose: r["ใช้ทำอะไร"], due: fmtDate(r["กำหนดคืน"]),
    returned: r["วันที่คืนจริง"] ? fmtDate(r["วันที่คืนจริง"]) : null,
    status: r["วันที่คืนจริง"] ? "returned" : "borrowed",
  }));
  const damages = data.damages.map((r) => ({
    id: `DM-${r._row}`, _row: r._row, date: fmtDate(r["วันที่แจ้ง"]), itemCode: r["รหัสอุปกรณ์"],
    itemName: r["ชื่ออุปกรณ์"], qty: Number(r["จำนวน"]) || 0, symptom: r["อาการ / สาเหตุ"] || "",
    location: r["สถานที่"] || "", reporter: r["ผู้แจ้ง"], severity: "ปานกลาง", status: r["สถานะ"] || "รอตรวจสอบ",
  }));
  const staff = (data.staff || []).map((r) => ({
    id: String(r["ID"]), name: r["ชื่อ"], dept: r["หน่วยงาน"], role: r["หน้าที่"],
    phone: r["เบอร์โทร"] || "", level: (r["Level"] || "L1").trim(), photoUrl: r["รูปโปรไฟล์"] || "",
  }));
  const schedule = (data.schedule || []).map((r) => ({
    id: `SC-${r._row}`, _row: r._row, day: r["วัน"], start: fmtTime(r["เวลาเริ่ม"]), end: fmtTime(r["เวลาจบ"]),
    subject: r["วิชา / กิจกรรม"] || "", teacher: r["ครูผู้สอน"] || "", loc: r["สถานที่"] || "",
    group: r["ระดับชั้น / กลุ่ม"] || "", equipment: r["อุปกรณ์ที่ใช้"] || "", qty: r["จำนวนที่ใช้"] || "", note: r["หมายเหตุ"] || "",
  })).filter((s) => isValidSheetValue(s.day) && isValidSheetValue(s.start)); // skip error rows and blank template rows
  const tasks = (data.tasks || []).map((r) => ({
    id: r["ID"], _row: r._row, title: r["Title"] || "", description: r["Description"] || "",
    priority: r["Priority"] || "NORMAL", status: r["Status"] || "TODO",
    dueDate: r["DueDate"] ? fmtDate(r["DueDate"]) : "", dueTime: r["DueTime"] || "",
    assignee: r["Assignee"] || "", createdBy: r["CreatedBy"] || "", location: r["Location"] || "",
    relatedResource: r["RelatedResource"] || "", relatedFacility: r["RelatedFacility"] || "",
    relatedBorrowId: r["RelatedBorrowId"] || "", relatedDamageId: r["RelatedDamageId"] || "",
    taskType: r["TaskType"] || "general", comments: r["Comments"] || "",
    createdDate: r["CreatedDate"] || "", completedDate: r["CompletedDate"] || "",
  }));
  const orgEvents = (data.orgEvents || []).map((r) => ({
    id: r["ID"], title: r["ชื่องาน"] || "", start: fmtDate(r["วันที่เริ่ม"]), end: fmtDate(r["วันที่สิ้นสุด"]) || fmtDate(r["วันที่เริ่ม"]),
    allDay: r["ทั้งวัน"] === "TRUE" || r["ทั้งวัน"] === true, dept: r["หน่วยงานเจ้าของ"] || "", owner: r["ผู้รับผิดชอบ"] || "",
    loc: r["สถานที่"] || "", description: r["รายละเอียด"] || "", status: r["สถานะ"] || "scheduled",
  })).filter((e) => isValidSheetValue(e.start) && isValidSheetValue(e.title)); // skip error rows
  const repairs = (data.repairs || []).map((r) => ({
    id: r["ID"], ref: r["อ้างอิง"] || "", refName: r["ชื่ออุปกรณ์/สถานที่"] || "", date: fmtDate(r["วันที่ซ่อม"]),
    description: r["รายละเอียด"] || "", cost: Number(r["ค่าใช้จ่าย"]) || 0, owner: r["ผู้รับผิดชอบ"] || "",
    vendor: r["ร้าน/ช่าง"] || "", receiptUrl: r["ลิงก์ใบเสร็จ"] || "", status: r["สถานะ"] || "",
    // รายงานผลการซ่อมจากหน่วยงานภายนอก (คอลัมน์เพิ่มโดย Extras.gs)
    condition: r["สภาพหลังซ่อม"] || "", result: r["ผลการซ่อม"] || "", recommendation: r["คำแนะนำจากช่าง"] || "",
    warrantyUntil: fmtDate(r["รับประกันถึง"]), reportUrl: r["ลิงก์รายงานผล"] || "",
  }));
  const pmSchedule = (data.pmSchedule || []).map((r) => ({
    id: r["ID"], ref: r["อ้างอิง"] || "", refName: r["ชื่ออุปกรณ์/สถานที่"] || "", cycle: r["รอบซ่อม"] || "",
    nextDate: fmtDate(r["วันนัดถัดไป"]), owner: r["ผู้รับผิดชอบ"] || "", note: r["หมายเหตุ"] || "",
  })).filter((p) => isValidSheetValue(p.nextDate) && isValidSheetValue(p.refName)); // skip error rows
  const docIcons = readDocIconCache();
  const docs = (data.docs || []).map((r) => ({
    id: r["ID"], title: r["ชื่อเอกสาร"] || "", category: r["หมวดหมู่"] || "อื่นๆ", url: r["ลิงก์ไฟล์"] || "",
    uploadedBy: r["อัปโหลดโดย"] || "", updatedDate: fmtDate(r["วันที่อัปเดต"]), version: r["เวอร์ชัน"] || "1",
    icon: r["ไอคอน"] || docIcons[String(r["ID"])] || "book",
  }));
  return { items, borrows, damages, staff, schedule, tasks, orgEvents, repairs, pmSchedule, docs };
}
function fmtTime(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  try { const d = new Date(v); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; } catch { return String(v); }
}

// ตรวจสอบว่าเป็นค่าข้อมูลจาก Google Sheets ที่เสียหายหรือเป็น error formula
function isValidSheetValue(v) {
  if (!v) return false;
  const str = String(v).trim();
  // ตัดทิ้งค่า #N/A, #VALUE!, #DIV/0! และ error อื่นๆ จาก Sheets
  if (str.startsWith("#")) return false;
  // ตัดทิ้งค่าว่างหรือ "-"
  if (str === "" || str === "-") return false;
  return true;
}

/* ============================================================
   ตารางสอนรายครู — ดึงจากชีต "ตารางสอนศูนย์กีฬา" ผ่าน
   Apps Script action=teachingSchedule (ไฟล์ apps-script/TeachingSchedule.gs)
   แปลงให้อยู่ในรูปแบบเดียวกับ schedule เดิม เพื่อให้หน้า ตารางสอน /
   ปฏิทิน / สถานที่ / โปรไฟล์ ใช้ได้ทันที — แถวที่มาจากชีตนี้ไม่มี _row
   จึงเป็นแบบดูอย่างเดียว (แก้ที่ชีต "ตารางรวมทุกคน")
   ============================================================ */
async function loadTeachingSchedule() {
  const data = await sheetsFetch(`${TEACHING_API_URL}?action=teachingSchedule`);
  if (!data || !Array.isArray(data.slots)) throw new Error(data?.error || "teachingSchedule not available");
  // ข้ามแท็บที่ไม่ใช่ตารางรายคน: แท็บรวม (เช่น "รวมกีฬา") และแท็บที่ข้อมูลซ้ำกับครูคนก่อนทุกช่อง
  // (เกิดจากสูตรอ้างอิงผิด เช่น ครูประจำระดับ ป.2–ม.6 ที่เหมือน ป.1) — ไม่งั้นตารางรวมกีฬาจะซ้ำหลายเท่า
  const skip = new Set((data.teachers || []).filter((t) => /รวม/.test(t.sheetName || "")).map((t) => t.id));
  const seenGrid = new Map();
  (data.teachers || []).forEach((t) => {
    if (skip.has(t.id)) return;
    const sig = data.slots.filter((s) => s.teacherId === t.id).map((s) => `${s.dayIndex}:${s.period}:${s.raw}`).join("|");
    if (sig && seenGrid.has(sig)) skip.add(t.id); else if (sig) seenGrid.set(sig, t.id);
  });
  const rows = data.slots
    .filter((s) => !skip.has(s.teacherId))
    .filter((s) => s.start && s.end && s.day)
    .map((s) => ({
      id: `TS-${s.id}`,
      day: s.day,
      start: s.start,
      end: s.end,
      period: s.period,
      subject: s.subject || s.dept || (s.type === "activity" ? "กิจกรรม" : "คาบสอน"),
      teacher: s.teacher,
      dept: s.dept || "",
      loc: s.room || "",
      group: (s.classes || []).join(", "),
      note: [...(s.notes || []), s.period === "AS" ? "นอกเวลาเรียน" : ""].filter(Boolean).join(" · "),
      type: s.type,
      source: "teachingSheet",
    }));
  return { rows, combined: buildCombinedSport(data), warnings: data.meta?.warnings || [], year: data.meta?.academicYear || "" };
}

// ชื่อกีฬาของครูแต่ละคน จากช่อง "งาน/กีฬา" ในหัวแท็บ เช่น "สำนักงานศูนย์กีฬา / เต้น" → "เต้น"
function sportNameOf(t) {
  const d = String(t.dept || "").trim();
  const last = d.split("/").pop().trim();
  return last || t.name;
}
const NOT_SPORT_DEPT = /^(ครูประจำระดับ|หัวหน้า)/;

/* ตารางรวมกีฬา — ใช้ข้อมูลจากแท็บ "ตารางรวมกีฬา" เท่านั้น (ห้องเรียนที่มีคาบกีฬาในแต่ละคาบ)
   แล้วจับคู่กับแท็บของครูผู้สอนแต่ละกีฬาในวัน/คาบเดียวกันที่มีห้องเรียนตรงกัน
   เพื่อบอกว่าคาบนั้นมีการสอนกีฬาอะไรบ้าง */
function buildCombinedSport(data) {
  const teachers = data.teachers || [];
  const combinedTab = teachers.find((t) => /รวมกีฬา/.test(t.sheetName || "")) || teachers.find((t) => /รวม/.test(t.sheetName || ""));
  if (!combinedTab) return [];
  const sportTeachers = teachers.filter((t) => t.id !== combinedTab.id && !/รวม/.test(t.sheetName || "") && !NOT_SPORT_DEPT.test(t.dept || ""));
  const byTeacher = new Map(sportTeachers.map((t) => [t.id, t]));
  const others = data.slots.filter((s) => byTeacher.has(s.teacherId));
  return data.slots
    .filter((s) => s.teacherId === combinedTab.id && s.start && s.end && s.day)
    .map((s) => {
      const cls = new Set(s.classes || []);
      const seen = new Set();
      const sports = [];
      others.forEach((o) => {
        if (o.dayIndex !== s.dayIndex || o.period !== s.period) return;
        const overlap = (o.classes || []).filter((c) => cls.has(c));
        if (cls.size && !overlap.length) return; // ต้องมีห้องเรียนตรงกันอย่างน้อย 1 ห้อง
        const t = byTeacher.get(o.teacherId);
        const key = t.id;
        if (seen.has(key)) return;
        seen.add(key);
        sports.push({ name: sportNameOf(t), teacher: t.name, room: o.room || "", classes: overlap.length ? overlap : (o.classes || []), subject: o.subject || "" });
      });
      return {
        id: `CS-${s.id}`, day: s.day, dayIndex: s.dayIndex, period: s.period, start: s.start, end: s.end,
        classes: s.classes || [], group: (s.classes || []).join(", ") || s.subject || s.raw || "",
        sports: sports.sort((a, b) => a.name.localeCompare(b.name, "th")),
      };
    });
}

// รวมตารางจาก 2 แหล่ง — ถ้าครู/วัน/เวลาเดียวกันมีอยู่แล้ว ให้ใช้แถวเดิม (อาจแก้ไขได้)
function mergeSchedules(base, extra) {
  const key = (s) => `${normTeacherName(s.teacher)}|${s.day}|${s.start}|${s.end}`;
  const seen = new Set(base.map(key));
  return [...base, ...extra.filter((s) => !seen.has(key(s)))];
}

// แคชตารางสอนไว้ในเครื่อง — เปิดแอพครั้งถัดไปเห็นตารางทันที แล้วค่อยอัปเดตจาก Sheets เบื้องหลัง
const SCHEDULE_CACHE_KEY = "act.schedule.cache.v1";
function readScheduleCache() {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_CACHE_KEY) || "null") || {}; } catch { return {}; }
}
function writeScheduleCache(patch) {
  try { localStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify({ ...readScheduleCache(), ...patch, savedAt: Date.now() })); } catch { /* ignore */ }
}

async function loadBudgetData(teacherId) {
  const data = await sheetsFetch(`${API_URL}?action=budgetData&teacherId=${encodeURIComponent(teacherId)}`);
  if (!data.ok && data.error && !("budgets" in data)) throw new Error(data.error || "load failed");
  return {
    isManager: !!data.isManager,
    accessNote: data.error || "",
    budgets: (data.budgets || []).map((b) => ({
      id: b["ID"], name: b["ชื่อโครงการ"], owner: b["ผู้รับผิดชอบ"], dept: b["หน่วยงาน"],
      amount: Number(b["งบที่ได้รับ"]) || 0, startDate: fmtDate(b["วันที่เริ่ม"]), endDate: fmtDate(b["วันที่สิ้นสุด"]),
      status: b["สถานะ"] || "active", approvedBy: b["ผู้อนุมัติ"], code: b["เลขที่งบประมาณ"] || "",
    })),
    income: (data.income || []).map((i) => ({
      id: i["ID"], date: fmtDate(i["วันที่"]), type: i["ประเภท"], amount: Number(i["จำนวนเงิน"]) || 0,
      receivedBy: i["ผู้รับเงิน"], receiptRef: i["อ้างอิงใบเสร็จ"], note: i["หมายเหตุ"],
    })),
    expenses: (data.expenses || []).map((e) => ({
      id: e["ID"], budgetId: e["อ้างอิงงบประมาณ"], date: fmtDate(e["วันที่"]), item: e["รายการ"],
      amount: Number(e["จำนวนเงิน"]) || 0, claimant: e["ผู้เบิก"], approvalStatus: e["สถานะอนุมัติ"] || "รออนุมัติ", receiptUrl: e["ใบเสร็จ"],
    })),
  };
}


/* ============================================================
   WORK MANAGEMENT helpers
   ============================================================ */
// วันนี้จริงตามเครื่อง/เบราว์เซอร์ของผู้ใช้ — ห้าม hardcode วันที่ตายตัว ไม่งั้นหน้าแรก/
// ปฏิทิน/สถานะเกินกำหนด จะค้างอยู่ที่วันเดิมตลอดไปไม่ขยับตามวันจริง
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const PRIORITY_META = {
  CRITICAL: { label: "วิกฤต", fg: "#FFFFFF", bg: "#B91C3C" },
  HIGH: { label: "สูง", fg: "#B91C3C", bg: "#FBEAEC" },
  NORMAL: { label: "ปกติ", fg: "#B8791A", bg: "#FBF1DF" },
  LOW: { label: "ต่ำ", fg: "#5B6273", bg: "#F2F3F7" },
};
const STATUS_META = {
  TODO: { label: "รอดำเนินการ", fg: "#5B6273", bg: "#F2F3F7" },
  IN_PROGRESS: { label: "กำลังทำ", fg: "#1E3A8A", bg: "#E8EEFC" },
  WAITING: { label: "รอข้อมูล/อะไหล่", fg: "#B8791A", bg: "#FBF1DF" },
  COMPLETED: { label: "เสร็จแล้ว", fg: "#1E7A4C", bg: "#EAF6EF" },
  OVERDUE: { label: "เกินกำหนด", fg: "#FFFFFF", bg: "#B91C3C" },
  CANCELLED: { label: "ยกเลิก", fg: "#8A8FA0", bg: "#F2F3F7" },
};
function isTaskOverdue(t) {
  if (t.status === "COMPLETED" || t.status === "CANCELLED") return false;
  if (!t.dueDate) return false;
  return t.dueDate < TODAY_ISO;
}
function taskBucket(t) {
  if (t.status === "COMPLETED") return "completed";
  if (t.status === "CANCELLED") return "cancelled";
  if (isTaskOverdue(t)) return "overdue";
  if (t.dueDate === TODAY_ISO) return "today";
  if (t.dueDate && t.dueDate > TODAY_ISO) return "upcoming";
  return "todo";
}
function taskStatusDisplay(t) {
  return isTaskOverdue(t) ? STATUS_META.OVERDUE : (STATUS_META[t.status] || STATUS_META.TODO);
}

function postToSheets(action, payload) {
  if (!API_URL) return Promise.resolve();
  return fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, payload }) }).catch(() => {});
}
async function postToSheetsAwait(action, payload) {
  if (!API_URL) throw new Error("ยังไม่ได้เชื่อมต่อ Google Sheets backend");
  const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, payload }) });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
  return data.result;
}

// resize + compress a File to a JPEG data URL's base64 body, so uploads stay small
function compressImage(file, maxW = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality).split(",")[1]);
      };
      img.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

async function uploadItemImage(code, file) {
  if (!API_URL) throw new Error("ยังไม่ได้เชื่อมต่อ Google Sheets backend — อัปโหลดรูปไม่ได้ในโหมดตัวอย่างนี้");
  const base64 = await compressImage(file);
  const res = await fetch(API_URL, {
    method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "uploadImage", payload: { code, filename: `${code}.jpg`, mimeType: "image/jpeg", base64 } }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");
  return data.result.url;
}
async function uploadProfilePhoto(teacherId, file) {
  if (!API_URL) throw new Error("ยังไม่ได้เชื่อมต่อ Google Sheets backend — อัปโหลดรูปไม่ได้ในโหมดตัวอย่างนี้");
  const base64 = await compressImage(file, 500, 0.85);
  const res = await fetch(API_URL, {
    method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "uploadProfilePhoto", payload: { teacherId, filename: `${teacherId}.jpg`, mimeType: "image/jpeg", base64 } }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");
  return data.result.url;
}

/* ============================================================
   SEED DATA — extracted from ระบบครุภัณฑ์ศูนย์กีฬา (live sheet)
   ============================================================ */
const CATEGORIES = [
  { code: "TKD", name: "เทควันโด" }, { code: "CLB", name: "ปีนหน้าผา" },
  { code: "GLF", name: "กอล์ฟ" }, { code: "FUT", name: "ฟุตซอล" },
  { code: "FBL", name: "ฟุตบอล" }, { code: "BKB", name: "บาสเกตบอล" },
  { code: "TEN", name: "เทนนิส" }, { code: "BDM", name: "แบดมินตัน" },
  { code: "TTN", name: "เทเบิลเทนนิส" }, { code: "DAN", name: "เต้น/การแสดง" },
  { code: "SPS", name: "วิทยาศาสตร์การกีฬา" }, { code: "OFF", name: "อุปกรณ์สำนักงาน" },
  { code: "GEN", name: "อุปกรณ์ฝึกทั่วไป" }, { code: "FAC", name: "สิ่งอำนวยความสะดวก" },
  { code: "UNI", name: "ชุดกีฬา/ชุดแสดง" }, { code: "SWM", name: "สระว่ายน้ำ" },
  { code: "FIT", name: "ฟิตเนส" },
];

const LOCATIONS = [
  { code: "OFF-SPORT", name: "สำนักงานศูนย์กีฬา", owner: "มิสกฤติยา ต่อสกุล" },
  { code: "TTN-ROOM", name: "ห้องเทเบิลเทนนิส", owner: "ม.อนุวัฒน์ เทพประเทียน" },
  { code: "TTN-STORE", name: "ชั้น 3 ห้องเก็บของ", owner: "ม.อนุวัฒน์ เทพประเทียน" },
  { code: "DAN-ROOM", name: "ห้องเต้น", owner: "มิสกฤติยา ต่อสกุล" },
  { code: "TKD-ROOM-1", name: "ห้องเทควันโด 1", owner: "มิสวรรณา จิรพลานุรักษ์" },
  { code: "TKD-ROOM-2", name: "ห้องเทควันโด 2", owner: "มิสวรรณา จิรพลานุรักษ์" },
  { code: "GLF-RANGE", name: "ห้องไดร์ฟกอล์ฟ", owner: "ยังไม่ระบุ" },
  { code: "GLF-CHIP", name: "สนามชิพกอล์ฟ", owner: "ยังไม่ระบุ" },
  { code: "CLB-WALL", name: "ผนังปีนหน้าผา", owner: "ม.ชาญวิทย์ พึ่งอิ่ม" },
  { code: "TEN-COURT", name: "คอร์ตเทนนิส", owner: "ม.ชาญวิทย์ พึ่งอิ่ม" },
  { code: "FUT-COURT", name: "สนามฟุตซอล", owner: "ม.ชาญวิทย์ พึ่งอิ่ม" },
  { code: "FBL-FIELD", name: "สนามฟุตบอล", owner: "ม.ชาญวิทย์ พึ่งอิ่ม" },
  { code: "BKB-COURT", name: "สนามบาสเกตบอล", owner: "ม.ชาญวิทย์ พึ่งอิ่ม" },
  { code: "ARENA", name: "อารีน่า", owner: "ม.ชาญวิทย์ พึ่งอิ่ม" },
  { code: "ACT-ACTIVITY", name: "ห้องฝ่ายกิจกรรม", owner: "ยังไม่ระบุ" },
  { code: "SWM-POOL", name: "สระว่ายน้ำ", owner: "มิสรัตนาภรณ์ ลิ้มทุติเนตร" },
  { code: "FIT-CENTER", name: "ศูนย์ฟิตเนส", owner: "ม.ชวินทร์ โรยอุตระ" },
];

// [code, name, brand, category, location, owner, normal, damaged, lost, disposed, note]
const RAW_ITEMS = [
["OFF-001","คอมพิวเตอร์ All-in-One พร้อมเมาส์/คีย์บอร์ด","DELL All in One","OFF","สำนักงานศูนย์กีฬา","มิสกฤติยา ต่อสกุล",8,0,0,0,"เลขครุภัณฑ์ ACT SPORT-03 4787"],
["OFF-002","โต๊ะสำนักงาน สีเบจ","LOGICA","OFF","สำนักงานศูนย์กีฬา","มิสกฤติยา ต่อสกุล",8,0,0,0,""],
["OFF-003","เก้าอี้สำนักงาน เบาะหนังดำ มีล้อเลื่อน","LOGICA","OFF","สำนักงานศูนย์กีฬา","มิสกฤติยา ต่อสกุล",2,0,0,0,""],
["OFF-007","เครื่องพิมพ์","HP JET PRO LJM20IN","OFF","สำนักงานศูนย์กีฬา","มิสกฤติยา ต่อสกุล",1,0,0,0,""],
["OFF-008","โซฟา สีน้ำตาล","","OFF","ห้องฝ่ายกิจกรรม","มิสกฤติยา ต่อสกุล",2,0,0,0,""],
["FAC-001","ตู้น้ำร้อน-น้ำเย็น","IMARFREX IF-115","FAC","สำนักงานศูนย์กีฬา","มิสกฤติยา ต่อสกุล",1,0,0,0,""],
["GEN-001","นาฬิกาจับเวลา","Geonaute","GEN","สำนักงานศูนย์กีฬา","มิสกฤติยา ต่อสกุล",2,0,0,0,""],
["GEN-002","ปืนปล่อยตัว Blankgun","EKOL Viper 4.5\"","GEN","สำนักงานศูนย์กีฬา","มิสกฤติยา ต่อสกุล",1,0,0,0,""],
["TTN-001","โต๊ะปิงปอง","TIBHAR","TTN","ชั้น 3 ห้องเก็บของ","ม.อนุวัฒน์ เทพประเทียน",2,0,0,0,""],
["TTN-002","เครื่องยิงลูกปิงปอง","ROBO-PONG","TTN","ห้องเทเบิลเทนนิส","ม.อนุวัฒน์ เทพประเทียน",0,1,0,0,""],
["TTN-003","เครื่องยิงลูกปิงปอง","Y&T V-986","TTN","ห้องเทเบิลเทนนิส","ม.อนุวัฒน์ เทพประเทียน",1,0,0,0,""],
["TTN-004","ตาข่ายปิงปอง","FORMULA","TTN","ห้องเทเบิลเทนนิส","ม.อนุวัฒน์ เทพประเทียน",0,1,0,0,""],
["TTN-005","ตาข่ายปิงปอง","BUTTERFLY","TTN","ห้องเทเบิลเทนนิส","ม.อนุวัฒน์ เทพประเทียน",0,2,0,0,""],
["TTN-006","แผ่นพื้นยางจิ๊กซอว์ สีแดง","","TTN","ห้องเทเบิลเทนนิส","ม.อนุวัฒน์ เทพประเทียน",30,0,0,0,""],
["TTN-007","แผ่นพื้นยางจิ๊กซอว์ สีน้ำเงิน","","TTN","ห้องเทเบิลเทนนิส","ม.อนุวัฒน์ เทพประเทียน",40,0,0,0,""],
["TTN-009","เสาปิงปองพร้อมเน็ท","","TTN","ห้องเทเบิลเทนนิส","ม.อนุวัฒน์ เทพประเทียน",2,1,0,0,""],
["FAC-006","พัดลมแอร์","","FAC","ห้องเทเบิลเทนนิส","ม.อนุวัฒน์ เทพประเทียน",1,1,3,0,"⚠️ ต้องยืนยันยอดใหม่"],
["FAC-007","ปลั๊กไฟ","","FAC","ห้องเทเบิลเทนนิส","ม.อนุวัฒน์ เทพประเทียน",4,0,1,0,"⚠️ เดิมระบุ 'หาย 1 เล็ก'"],
["TTN-010","โต๊ะปิงปอง yinhe","รุ่น TOP","TTN","ชั้น 3 ห้องเก็บของ","ม.อนุวัฒน์ เทพประเทียน",2,0,0,0,""],
["TTN-011","โต๊ะปิงปอง joola","","TTN","ชั้น 3 ห้องเก็บของ","ม.อนุวัฒน์ เทพประเทียน",1,4,0,0,""],
["TTN-012","โต๊ะปิงปอง VIGA","","TTN","ชั้น 3 ห้องเก็บของ","ม.อนุวัฒน์ เทพประเทียน",6,0,0,0,""],
["FAC-008","ทีวีจอแบน 45 นิ้ว สีดำ","SONY","FAC","ห้องเต้น","มิสกฤติยา ต่อสกุล",1,0,0,0,""],
["DAN-001","เครื่องเสียง","SONY","DAN","ห้องเต้น","มิสกฤติยา ต่อสกุล",1,0,0,0,""],
["DAN-002","ลำโพงพร้อมไมค์สาย","samson","DAN","ห้องเต้น","มิสกฤติยา ต่อสกุล",1,0,1,0,"⚠️ นับไมค์เป็นสูญหาย"],
["FAC-009","แอร์เคลื่อนที่","","FAC","ห้องเต้น","มิสกฤติยา ต่อสกุล",1,0,0,0,""],
["UNI-001","เสื้อเงินไหล่ตัด + โจงสำเร็จ","","UNI","ห้องเต้น","มิสกฤติยา ต่อสกุล",8,0,0,0,""],
["UNI-004","ชุดพม่า (บอดี้สูท+ผ้าถุง)","","UNI","ห้องเต้น","มิสกฤติยา ต่อสกุล",6,0,0,0,""],
["UNI-005","รองเท้าบัลเล่ต์","","UNI","ห้องเต้น","มิสกฤติยา ต่อสกุล",8,0,0,0,""],
["UNI-010","ชุดบัลเล่ต์เด็กเล็ก","","UNI","ห้องเต้น","มิสกฤติยา ต่อสกุล",2,2,0,0,""],
["UNI-013","ธง + เสาธงโรงเรียน","","UNI","ห้องเต้น","มิสกฤติยา ต่อสกุล",23,0,0,0,""],
["DAN-004","เบาะหนังน้ำเงิน","","DAN","ห้องเต้น","มิสกฤติยา ต่อสกุล",3,1,0,0,""],
["TKD-001","EVERLAST Freestanding Reflex Bag","Everlast","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",2,2,0,0,"ฐานชำรุด เก็บที่ห้องแม่บ้าน"],
["TKD-002","EVERLAST Pro Everflex Freestanding HB","Everlast","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",2,0,0,0,"ฟองน้ำเสื่อมสภาพ"],
["TKD-003","EVERLAST Kick Boxing Trainer (ใหญ่)","Everlast","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",0,2,0,0,"กิ่งหักทั้งหมด"],
["TKD-004","EVERLAST Kick Boxing Trainer (เล็ก)","Everlast","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",0,1,0,0,"กิ่งหักทั้งหมด"],
["TKD-005","หุ่นซ้อมมวย สีแดง","HITMAN","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",2,0,0,0,""],
["TKD-006","หุ่นซ้อมมวย สีน้ำเงิน","HITMAN","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",2,0,0,0,""],
["TKD-007","ชุดป้องกันตัว (เบอร์ 1-4)","WTF","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",23,3,0,0,"เบอร์1=6 เบอร์2=7 เบอร์3=9 เบอร์4=4"],
["TKD-008","เป้า POWER KICK","WTF","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",0,10,0,0,"ชำรุดมาก"],
["TKD-009","เป้า POWER KICK","Pro Kicker","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",8,4,0,0,""],
["TKD-010","เป้า SPEED KICK สีดำ","WTF","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",3,5,0,0,""],
["TKD-011","เป้า SPEED KICK","Kick","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",18,2,0,0,""],
["TKD-012","Headgear เกราะสวมศีรษะ","WTF","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",2,0,0,0,""],
["TKD-013","เฮดการ์ด สีน้ำเงิน","","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",4,4,0,0,""],
["TKD-014","เฮดการ์ด สีแดง","","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",4,5,0,0,""],
["TKD-015","แผ่นพื้นยางจิ๊กซอว์ สีน้ำตาล","BROWN 003","TKD","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",178,0,0,0,""],
["GEN-003","ชุด Cone Hurdle","","GEN","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",20,5,0,0,"⚠️ ต้องยืนยันยอดใหม่"],
["GEN-004","Speed Ring วงกลมฝึกการเคลื่อนไหว","","GEN","ห้องเทควันโด 1","มิสวรรณา จิรพลานุรักษ์",2,8,0,0,"⚠️ ต้องยืนยันยอดใหม่"],
["GLF-001","ไม้กอล์ฟ (เหล็ก)","","GLF","ห้องไดร์ฟกอล์ฟ","ยังไม่ระบุ",30,0,0,0,""],
["GLF-002","พัตเตอร์","","GLF","ห้องไดร์ฟกอล์ฟ","ยังไม่ระบุ",30,0,0,0,""],
["GLF-003","ลูกกอล์ฟ (สำรอง)","toppoint","GLF","ห้องไดร์ฟกอล์ฟ","ยังไม่ระบุ",2000,0,0,0,"วัสดุสิ้นเปลือง"],
["GLF-004","พรมสวิง","","GLF","ห้องไดร์ฟกอล์ฟ","ยังไม่ระบุ",6,0,0,0,""],
["GLF-011","ถุงกอล์ฟพร้อมไม้กอล์ฟ (สนามชิพ)","","GLF","สนามชิพกอล์ฟ","ยังไม่ระบุ",7,0,0,0,""],
["CLB-001","Harness","Black Diamond","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",9,0,0,0,""],
["CLB-004","รองเท้าปีนหน้าผา","Mad Rock","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",8,0,0,0,""],
["CLB-009","Auto Belay","Perfect Descent","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",2,1,0,0,"ชำรุด รอตรวจเช็ค"],
["CLB-011","Quickdraw ควิกดรอว์","Black Diamond","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",55,0,0,0,""],
["CLB-018","เบาะกันกระแทก 6 นิ้ว ยาว 8 ม.","","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",0,1,0,0,"ผ้าใบขาด"],
["CLB-022","ตัวจับปีนหน้าผา สีเหลือง","","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",79,2,0,0,""],
["CLB-024","ตัวจับปีนหน้าผา สีเทา","","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",100,1,0,0,""],
["CLB-026","ตัวจับปีนหน้าผา สีม่วง","","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",79,0,0,0,""],
["CLB-027","ตัวจับปีนหน้าผา สีเขียว","","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",474,0,0,0,""],
["CLB-029","ตัวจับปีนหน้าผา สีชมพู","","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",142,1,0,0,""],
["CLB-030","ตัวจับปีนหน้าผา สีน้ำเงิน","","CLB","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",66,0,0,0,""],
["FAC-016","บันไดอลูมิเนียม 12 ขั้น","","FAC","ผนังปีนหน้าผา","ม.ชาญวิทย์ พึ่งอิ่ม",2,1,0,0,"⚠️ อารีน่ายืมใช้งาน 1 ตัว"],
["FBL-001","เสาประตูฟุตบอลพร้อมตาข่าย","FBT","FBL","สนามฟุตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",1,0,0,0,"ซ่อมแล้ว ตาข่ายขาด"],
["GEN-007","กรวยจราจร เล็ก","FBT","GEN","สนามฟุตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",7,3,0,0,""],
["GEN-008","รั้วกระโดดปรับได้ WT 9\"/12\"","FBT","GEN","สนามฟุตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",2,7,0,0,"⚠️ ต้องยืนยันยอดใหม่"],
["GEN-009","รั้วกระโดดปรับได้ WT 6\"/12\"","FBT","GEN","สนามฟุตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",8,2,0,0,""],
["GEN-010","เทรนนิ่งมาร์กโคน","GRAND SPORT","GEN","สนามฟุตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",10,30,0,0,"1 ชุด 40 อัน"],
["GEN-011","สปีดแลดเดอร์ ยาว 4 เมตร","FBT","GEN","สนามฟุตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",0,1,0,0,""],
["GEN-013","กระเป๋าใส่ลูกบอลใหญ่","FBT","GEN","สนามฟุตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",3,2,0,0,""],
["FAC-020","รั้วตาข่ายกั้นสนาม","","FAC","สนามฟุตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",0,16,0,0,""],
["UNI-014","เสื้อเอี๊ยม สีส้ม","KIPSTA","UNI","สนามฟุตซอล","ม.ชาญวิทย์ พึ่งอิ่ม",8,0,0,0,"⚠️ ต้องยืนยันยอดใหม่"],
["UNI-015","เสื้อเอี๊ยม สีเขียว","KIPSTA","UNI","สนามฟุตซอล","ม.ชาญวิทย์ พึ่งอิ่ม",7,0,0,0,"⚠️ ต้องยืนยันยอดใหม่"],
["TEN-001","ตะกร้าใส่ลูกเทนนิสพร้อมล้อ","","TEN","คอร์ตเทนนิส","ม.ชาญวิทย์ พึ่งอิ่ม",0,2,0,0,""],
["TEN-002","เสาเทนนิส แบบมีเฟือง (ชุดที่ 1)","","TEN","คอร์ตเทนนิส","ม.ชาญวิทย์ พึ่งอิ่ม",0,2,0,0,""],
["TEN-003","เสาเทนนิส แบบมีเฟือง (ชุดที่ 2)","","TEN","คอร์ตเทนนิส","ม.ชาญวิทย์ พึ่งอิ่ม",0,1,0,0,""],
["FUT-005","ลูกฟุตซอล สีขาว-ฟ้า (ใหม่)","Molten","FUT","สนามฟุตซอล","ม.ชาญวิทย์ พึ่งอิ่ม",22,0,0,0,""],
["BKB-004","ลูกบาสเกตบอล SPALDING เบอร์ 5","SPALDING","BKB","สนามบาสเกตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",10,15,0,0,""],
["BKB-005","ลูกบาสเกตบอล SPALDING เบอร์ 6","SPALDING","BKB","สนามบาสเกตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",12,15,0,0,""],
["BKB-006","ลูกบาสเกตบอล Molten เบอร์ 7","Molten","BKB","สนามบาสเกตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",25,15,0,0,""],
["FBL-003","ลูกฟุตบอล Molten","Molten","FBL","สนามฟุตบอล","ม.ชาญวิทย์ พึ่งอิ่ม",50,25,0,0,""],
];

function seedItems() {
  return RAW_ITEMS.map((r, i) => {
    const [code, name, brand, catCode, loc, owner, normal, damaged, lost, disposed, note] = r;
    return {
      id: `${code}-${i}`, code, name, brand, catCode, loc, owner,
      normal, damaged, lost, disposed, borrowed: 0,
      minAlert: normal + damaged > 0 && normal <= 2 ? 2 : 0,
      price: 0, note, imageUrl: "",
    };
  });
}

const STAFF = [
  { id: "10645", name: "น.ส.วรรณา จิรพลานุรักษ์", dept: "ศูนย์กีฬา", role: "สอนกีฬา แผนก EP", phone: "099-453-0235", level: "L1" },
  { id: "10668", name: "นายชวินทร์ โรยอุตระ", dept: "ศูนย์กีฬา", role: "งานศูนย์กีฬา", phone: "085-155-4533", level: "L2" },
  { id: "10691", name: "น.ส.รัตนาภรณ์ ลิ้มทุติเนตร", dept: "งานสระว่ายน้ำ", role: "หัวหน้างานสระว่ายน้ำ", phone: "084-356-5748", level: "L2" },
  { id: "10692", name: "นายชาญวิทย์ พึ่งอิ่ม", dept: "ศูนย์กีฬา", role: "หัวหน้าศูนย์กีฬา", phone: "089-524-1646", level: "L3" },
  { id: "10711", name: "นายณัฐวุฒิ ดอกกฐิน", dept: "งานกิจกรรมนักเรียน", role: "งานกิจกรรมนักเรียน/งานสอนกีฬา", phone: "087-763-3250", level: "L1" },
  { id: "10755", name: "นายศุภรักษ์ สุขพันธ์", dept: "ศูนย์กีฬา", role: "ดูแล ACT Sport Arena/สอนกีฬาเทนนิส", phone: "080-665-5530", level: "L1" },
  { id: "10788", name: "น.ส.มลาภรณ์ ซังปาน", dept: "ศูนย์กีฬา", role: "งานจัดการเรียนการสอนศูนย์กีฬา", phone: "090-708-6748", level: "L2" },
  { id: "10800", name: "นายสุขพงษ์ ประดับพลอย", dept: "ศูนย์กีฬา", role: "ครูผู้สอน ฟุตบอลป.6", phone: "099-396-7779", level: "L1" },
  { id: "10804", name: "นายกรภัทร์ นิ่มนวน", dept: "ศูนย์กีฬา", role: "ครูผู้สอน ฟุตบอลป.4", phone: "087-714-8914", level: "L1" },
  { id: "10819", name: "นายรณกฤต พรจิรกิตติพงศ์", dept: "ศูนย์ฟิตเนส", role: "ผู้ประสานงานศูนย์ฟิตเนส", phone: "081-410-1200", level: "L2" },
  { id: "10830", name: "น.ส.ภวรัญชน์ ผลเจริญ", dept: "ศูนย์กีฬา", role: "งานศูนย์กีฬา", phone: "095-167-4514", level: "L2" },
  { id: "20242", name: "นางวรัญญา ตันพิริยะกุล", dept: "ศูนย์กีฬา", role: "ธุรการศูนย์กีฬา", phone: "095-567-9360", level: "L2" },
  { id: "20246", name: "น.ส.ธนัญญา แสงศิโรเวฐน์", dept: "ศูนย์ฟิตเนส", role: "ประจำเคาท์เตอร์ศูนย์ฟิตเนส", phone: "", level: "L1" },
  { id: "20197", name: "นายธนกร บุญจรัส", dept: "งานสระว่ายน้ำ", role: "ผู้ฝึกสอนกีฬาว่ายน้ำ", phone: "084-209-6530", level: "L1" },
  { id: "62271", name: "นางจำปี เอี่ยมกลิ่น", dept: "งานสระว่ายน้ำ", role: "พนักงานประจำสระว่ายน้ำ", phone: "064-131-8663", level: "L1" },
  { id: "10360", name: "น.ส.เพชรพรรณ์ เหมะสุรินทร์", dept: "งานสระว่ายน้ำ", role: "ประจำเคาท์เตอร์สระว่ายน้ำ", phone: "083-023-2618", level: "L1" },
  { id: "50013", name: "น.ส.กนกวรรณ หม่องสนธิ", dept: "ศูนย์กีฬา", role: "งานการเรียนการสอนกีฬา/สอนเต้น", phone: "063-1596459", level: "L1" },
  { id: "50051", name: "นายธีระพงศ์ ปานเด", dept: "ศูนย์กีฬา", role: "ผู้ฝึกสอนวิชาศิลปะการเต้น/สอนวิชาศิลป์ดนตรี ม.4-6", phone: "099-289-8366", level: "L1" },
  { id: "50052", name: "น.ส.กฤติยา ต่อสกุล", dept: "ศูนย์กีฬา", role: "ผู้ฝึกสอนวิชาศิลปะการเต้น", phone: "088-646-6368", level: "L2" },
  { id: "50053", name: "น.ส.ภวรัญชน์ ผลเจริญ", dept: "บริหารฝ่าย", role: "", phone: "096-642-9968", level: "L2" },
  { id: "50060", name: "นายธภัทร์ ถิ่นทิพย์", dept: "สระว่ายน้ำ", role: "ผู้ฝึกสอนทีมสโมสรว่ายน้ำ/ดูแลสระว่ายน้ำ", phone: "080-054-6597", level: "L1" },
  { id: "50062", name: "นายอนุวัฒน์ เทพประเทียน", dept: "ศูนย์กีฬา", role: "ผู้ฝึกสอนวิชาเทเบิลเทนนิส/สอนเทเบิลเทนนิส", phone: "085095943", level: "L1" },
  { id: "40001", name: "นายวุฒิพร ไชยเผือก", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนเทควันโด", phone: "083-5555727", level: "L1" },
  { id: "40002", name: "นายกรณ์พงษ์ พงษ์ศิริปรีดา", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนเทควันโด", phone: "081-7713306", level: "L1" },
  { id: "40004", name: "นายวิทวัส ศรีระโส", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนเทควันโด", phone: "084-7329426", level: "L1" },
  { id: "40005", name: "นายณัทพงษ์ ศรีไชยกิจ", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนเทควันโด", phone: "085-5167152", level: "L1" },
  { id: "40008", name: "น.สณัฏฐกันย์ วรรณตุง", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนเทควันโด", phone: "086-9943119", level: "L1" },
  { id: "40009", name: "นายธนรัฐ จาตุกานต์นนท์", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนกอล์ฟ", phone: "082-6639149", level: "L1" },
  { id: "40021", name: "นายประทีป กลับบ้านเกาะ", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนว่ายน้ำ", phone: "097-2950564", level: "L1" },
  { id: "40022", name: "นายศาสตรา อินทรประเสริฐ", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนเทนนิส", phone: "091-8746480", level: "L1" },
  { id: "40023", name: "นายสิรภพ จิรจตุรพักตร์", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนปีนหน้าผา", phone: "065-4788744", level: "L1" },
  { id: "40023", name: "นายอัมรินทร์ จุลแวง", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนมวยไทย", phone: "094-5678983", level: "L1" },
  { id: "40024", name: "นายทศพล ภูสมหมาย", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนปีนหน้าผา", phone: "095-5071621", level: "L1" },
  { id: "40025", name: "นายประพัฒน์ เจริญเณรรักษา", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนว่ายน้ำ", phone: "094-5501256", level: "L1" },
  { id: "40030", name: "นายเอกพงษ์ แสงเขียว", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนว่ายน้ำ", phone: "083-102-4750", level: "L1" },
  { id: "40031", name: "นายคชภัค กุลกวีวุฒิ", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนว่ายน้ำ", phone: "089-513-2239", level: "L1" },
  { id: "40033", name: "นายณัฐวินท์ ลิ่มสกุล", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนกอล์ฟ", phone: "082-5274340", level: "L1" },
  { id: "40036", name: "นายแหลมทอง รัตนสมัย", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนมวย", phone: "086-019-8341", level: "L1" },
  { id: "40037", name: "นายอานุภาพ พณิชีพ", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนปีนผา", phone: "0887256147", level: "L1" },
  { id: "40038", name: "นายธีรศักดิ์ อินต๊ะเรือน", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนฟุตซอล", phone: "0852495268", level: "L1" },
  { id: "40039", name: "นายกรวสิษฎิ์ แก้วกระหนก", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนเต้น", phone: "0825659923", level: "L1" },
  { id: "40040", name: "น.ส.มนต์ทิรา พรหมาพันธุ์", dept: "ครูสอนกีฬาพิเศษ", role: "เทควันโด", phone: "095-905-0368", level: "L1" },
  { id: "40043", name: "นายอมรเทพ เจริญชัย", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนปีนผา", phone: "064-348-3071", level: "L1" },
  { id: "40044", name: "นายรุ่งรดิศ ทานะมัย", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนฟุตซอล", phone: "629355988", level: "L1" },
  { id: "40045", name: "นายวัชระ เขียวอุ่ม", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนเต้น", phone: "0826748604", level: "L1" },
  { id: "40047", name: "นายกศมพงศ์ ไตรสมบูรณ์", dept: "ครูสอนกีฬาพิเศษ", role: "ครูสอนว่ายน้ำ", phone: "080-264-2915", level: "L1" },
  { id: "60001", name: "น.ส.สุชารัตน์ ภาพทอง", dept: "ศูนย์ฟิตเนส", role: "ครูสอนคลาส Yoga", phone: "087-0564-696", level: "L1" },
  { id: "60002", name: "น.ส.วนิดา จิรเจริญจิตต์", dept: "ศูนย์ฟิตเนส", role: "ครูสอนคลาส Yoga", phone: "085-3306-629", level: "L1" },
  { id: "60005", name: "นายเจษฎา พินิจมั้ง", dept: "ศูนย์ฟิตเนส", role: "ครูสอนคลาส Weight Training", phone: "097-1313063", level: "L1" },
  { id: "60007", name: "นายพีรวัส ชูเพชร", dept: "ศูนย์ฟิตเนส", role: "ครูสอนคลาส Gym Ball", phone: "087-1094565", level: "L1" },
  { id: "60006", name: "นายกรันติพล โชคศักดิ์ศรีกุล", dept: "ศูนย์ฟิตเนส", role: "ครูสอนคลาส Mind & Body", phone: "085-9952-464", level: "L1" },
  { id: "60008", name: "น.ส.ชฏาภรณ์ จันทะหงษ์", dept: "ศูนย์ฟิตเนส", role: "ครูสอนคลาส Zumba Dance", phone: "080-1101-160", level: "L1" },
  { id: "60009", name: "นายมานิตย์ บุบผาสุข", dept: "ศูนย์ฟิตเนส", role: "ครูสอนคลาส Power Fighting", phone: "090-9722716", level: "L1" },
];

const ROLE_META = {
  L0: { label: "L0 · ครูนอกสังกัด", dash: "ยืม–คืนอุปกรณ์เท่านั้น", tint: C.crimson },
  L1: { label: "L1 · Teacher", dash: "MY WORKSPACE", tint: C.navySoft },
  L2: { label: "L2 · Staff", dash: "OPERATIONS CENTER", tint: C.navy },
  L3: { label: "L3 · Manager", dash: "RESOURCE COMMAND CENTER", tint: C.crimson },
  L4: { label: "L4 · Executive", dash: "EXECUTIVE OVERVIEW · READ ONLY", tint: C.gold },
};

const NAV = {
  L0: [["profile", "โปรไฟล์", User], ["borrow", "ยืม–คืนอุปกรณ์", ArrowLeftRight]],
  L1: [["profile", "โปรไฟล์", User], ["dashboard", "หน้าหลัก", LayoutDashboard], ["tasks", "งานของฉัน", ClipboardList], ["calendar", "ปฏิทิน", CalendarClock], ["borrow", "ยืม–คืน", ArrowLeftRight], ["damage", "แจ้งชำรุด", Wrench], ["schedule", "ตารางสอนของฉัน", CalendarDays], ["budget", "งบของฉัน", DollarSign], ["knowledge", "คลังความรู้", BookOpen]],
  L2: [["profile", "โปรไฟล์", User], ["dashboard", "ภาพรวมปฏิบัติการ", LayoutDashboard], ["tasks", "งานของฉัน", ClipboardList], ["calendar", "ปฏิทิน", CalendarClock], ["inventory", "ครุภัณฑ์", Package], ["facility", "สถานที่", MapPin], ["borrow", "ยืม–คืน", ArrowLeftRight], ["damage", "ชำรุด–ซ่อม", Wrench], ["maintenance", "ซ่อมบำรุง", CalendarClock], ["staff", "บุคลากร", Users], ["schedule", "ตารางสอนของฉัน", CalendarDays], ["budget", "งบของฉัน", DollarSign], ["knowledge", "คลังความรู้", BookOpen]],
  L3: [["profile", "โปรไฟล์", User], ["dashboard", "ภาพรวมระบบ", LayoutDashboard], ["tasks", "จัดการงาน", ClipboardList], ["calendar", "ปฏิทินกลาง", CalendarClock], ["inventory", "ครุภัณฑ์", Package], ["facility", "สถานที่", MapPin], ["borrow", "ยืม–คืน", ArrowLeftRight], ["damage", "ชำรุด–ซ่อม", Wrench], ["maintenance", "ซ่อมบำรุง", CalendarClock], ["staff", "บุคลากร", Users], ["schedule", "ตารางสอน", CalendarDays], ["budget", "งบประมาณ", DollarSign], ["knowledge", "คลังความรู้", BookOpen], ["analytics", "วิเคราะห์ข้อมูล", BarChart3], ["reports", "รายงาน", FileText], ["actions", "สั่งการบริหาร", Sparkles]],
  L4: [["profile", "โปรไฟล์", User], ["dashboard", "ภาพรวมผู้บริหาร", LayoutDashboard], ["tasks", "ภาพรวมงาน", ClipboardList], ["calendar", "ปฏิทินกลาง", CalendarClock], ["inventory", "ครุภัณฑ์", Package], ["facility", "สถานที่", MapPin], ["borrow", "ยืม–คืน", ArrowLeftRight], ["damage", "ชำรุด–ซ่อม", Wrench], ["maintenance", "ซ่อมบำรุง", CalendarClock], ["staff", "บุคลากร", Users], ["schedule", "ตารางสอน", CalendarDays], ["budget", "งบประมาณ", DollarSign], ["knowledge", "คลังความรู้", BookOpen], ["analytics", "วิเคราะห์ข้อมูล", BarChart3], ["reports", "รายงาน", FileText]],
};

// groups the drawer menu into labeled sections (like a categorized mobile-app menu).
// items not listed here fall into "อื่นๆ"; empty groups (role doesn't have any of
// those keys) are skipped automatically when rendering.
const NAV_GROUPS = [
  { label: "ภาพรวม", keys: ["profile", "dashboard", "tasks", "calendar"] },
  { label: "ทรัพยากรและสถานที่", keys: ["inventory", "facility", "borrow", "damage", "maintenance"] },
  { label: "บุคลากร", keys: ["staff", "schedule"] },
  { label: "ข้อมูลอ้างอิง", keys: ["budget", "knowledge"] },
  { label: "บริหารจัดการ", keys: ["analytics", "reports", "actions"] },
];
function groupedNav(nav) {
  const byKey = Object.fromEntries(nav.map((item) => [item[0], item]));
  const used = new Set();
  const groups = NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.keys.filter((k) => byKey[k]).map((k) => { used.add(k); return byKey[k]; }),
  })).filter((g) => g.items.length > 0);
  const leftover = nav.filter((item) => !used.has(item[0]));
  if (leftover.length) groups.push({ label: "อื่นๆ", items: leftover });
  return groups;
}

const canEdit = (role) => role === "L2" || role === "L3";
const canManage = (role) => role === "L3";
const isReadOnly = (role) => role === "L4";

function catName(code) { return CATEGORIES.find((c) => c.code === code)?.name || code; }
function statusOf(it) {
  const avail = it.normal - it.borrowed;
  if (avail <= 0 && it.normal === 0) return { key: "out", label: "หมดสต๊อก", fg: C.bad, bg: C.badBg };
  if (it.damaged > 0 && it.damaged >= it.normal) return { key: "risk", label: "เสี่ยงสูง", fg: C.bad, bg: C.badBg };
  if (it.damaged > 0) return { key: "watch", label: "ต้องจับตา", fg: C.warn, bg: C.warnBg };
  return { key: "ok", label: "ปกติ", fg: C.ok, bg: C.okBg };
}

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
function Pill({ children, fg, bg }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
      style={{ color: fg, background: bg, border: `1px solid ${fg}33` }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, icon: Icon, small }) {
  const base = "inline-flex items-center gap-1.5 font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizing = small ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";
  const styles = {
    primary: { background: C.navy, color: C.white },
    crimson: { background: C.crimson, color: C.white },
    ghost: { background: "transparent", color: C.navy, border: `1px solid ${C.line}` },
    gold: { background: C.gold, color: C.white },
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizing}`} style={styles[variant]}>
      {Icon && <Icon size={small ? 13 : 15} />}
      {children}
    </button>
  );
}

function SectionHead({ eyebrow, title, sub, right }) {
  return (
    <div className="flex items-end justify-between mb-5 pb-4" style={{ borderBottom: `2px solid ${C.navy}` }}>
      <div>
        <div className="text-xs font-semibold tracking-wide mb-1" style={{ color: C.crimson }}>{eyebrow}</div>
        <h1 className="text-2xl font-bold" style={{ color: C.ink }}>{title}</h1>
        {sub && <p className="text-sm mt-1" style={{ color: C.slate }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

const STAT_CARD_TONES = { navy: C.navy, ok: C.ok, crimson: C.crimson, gold: C.warn };

const StatCard = ({ icon: Icon, label, value, color, tone, sub, onClick }) => {
  const accent = color || STAT_CARD_TONES[tone] || C.navy;
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      style={{ borderColor: accent }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Icon size={32} style={{ color: accent }} />
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs mt-1 text-gray-500">{sub}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,26,62,0.55)" }}>
      <div className="w-full flex flex-col" style={{ maxWidth: wide ? 440 : 360, maxHeight: "85dvh", background: C.white, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <h3 className="font-bold text-base" style={{ color: C.navy }}>{title}</h3>
          <button onClick={onClose}><X size={18} style={{ color: C.slate }} /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold mb-1" style={{ color: C.slate }}>{label}</span>
      {children}
    </label>
  );
}
const inputStyle = { border: `1px solid ${C.line}`, padding: "8px 10px", width: "100%", fontFamily: FONT, fontSize: 14, color: C.ink, background: C.white };

/* ============================================================
   LANGUAGE (TH / EN) + PASSWORD MANAGEMENT
   ============================================================ */
const LangContext = React.createContext({ lang: "th", setLang: () => {} });

function LangToggle({ dark = true, className = "" }) {
  const { lang, setLang } = React.useContext(LangContext);
  const fg = dark ? "rgba(255,255,255,0.85)" : C.navy;
  const border = dark ? "rgba(255,255,255,0.25)" : C.line;
  return (
    <div data-no-i18n className={`inline-flex items-center text-xs font-semibold shrink-0 ${className}`} style={{ border: `1px solid ${border}` }} title="ภาษา / Language">
      {[["th", "ไทย"], ["en", "EN"]].map(([k, l]) => (
        <button key={k} onClick={() => setLang(k)} className="px-2.5 py-1"
          style={{ background: lang === k ? C.crimson : "transparent", color: lang === k ? C.white : fg }}>{l}</button>
      ))}
    </div>
  );
}

const PW_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
function randomPassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz", digits = "23456789";
  const pick = (set) => set[Math.floor((window.crypto?.getRandomValues(new Uint32Array(1))[0] ?? Math.random() * 1e9) % set.length)];
  let out = pick(letters) + pick(digits);
  for (let i = 0; i < 8; i++) out += pick(letters + digits);
  return out.split("").sort(() => Math.random() - 0.5).join("");
}

function PwInput({ value, onChange, placeholder, autoComplete = "new-password" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        autoComplete={autoComplete} style={{ ...inputStyle, paddingRight: 36 }} />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute" style={{ right: 8, top: 9, color: C.slate }} aria-label="แสดงรหัสผ่าน">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

// ผู้ใช้เปลี่ยนรหัสผ่านของตัวเอง (หรือถูกบังคับเปลี่ยนหลังหัวหน้ารีเซ็ตให้)
function ChangePasswordModal({ user, onClose, forced = false, oldPassword = "" }) {
  const [cur, setCur] = useState(oldPassword);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const save = async () => {
    setMsg("");
    if (!cur) return setMsg("กรุณากรอกรหัสผ่านปัจจุบัน");
    if (!PW_RULE.test(pw1)) return setMsg("รหัสผ่านอย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข");
    if (pw1 !== pw2) return setMsg("รหัสผ่านไม่ตรงกัน");
    if (pw1 === cur) return setMsg("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม");
    setBusy(true);
    try {
      await postToSheetsAwait("pwChange", { username: user.id, oldPassword: cur, newPassword: pw1 });
      setDone(true);
    } catch (e) { setMsg(e.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ"); }
    setBusy(false);
  };
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,26,62,0.55)" }}>
      <div className="w-full flex flex-col" style={{ maxWidth: 380, maxHeight: "85dvh", background: C.white, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <h3 className="font-bold text-base flex items-center gap-2" style={{ color: C.navy }}><KeyRound size={17} /> {forced ? "ตั้งรหัสผ่านใหม่" : "เปลี่ยนรหัสผ่าน"}</h3>
          {!forced && <button onClick={onClose}><X size={18} style={{ color: C.slate }} /></button>}
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          {done ? (
            <div>
              <div className="p-3 mb-4 text-sm flex items-center gap-2" style={{ background: C.okBg, color: C.ok }}><CheckCircle2 size={16} /> เปลี่ยนรหัสผ่านสำเร็จ</div>
              <Btn onClick={onClose}>ตกลง</Btn>
            </div>
          ) : (
            <>
              {forced && <div className="p-3 mb-3 text-xs" style={{ background: C.goldSoft, color: C.crimsonDeep }}>หัวหน้าได้รีเซ็ตรหัสผ่านของคุณ กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน</div>}
              {!forced && <Field label="รหัสผ่านปัจจุบัน *"><PwInput value={cur} onChange={setCur} autoComplete="current-password" /></Field>}
              <Field label="รหัสผ่านใหม่ *"><PwInput value={pw1} onChange={setPw1} /></Field>
              <Field label="ยืนยันรหัสผ่านใหม่ *"><PwInput value={pw2} onChange={setPw2} /></Field>
              <div className="text-xs mb-3" style={{ color: C.mute }}>รหัสผ่านอย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข</div>
              {msg && <div className="text-xs mb-3" style={{ color: C.crimson }}>{msg}</div>}
              <Btn onClick={save} disabled={busy} icon={busy ? RefreshCw : KeyRound}>{busy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// หัวหน้า (L3) รีเซ็ตรหัสผ่านให้บุคลากร
function ResetPasswordModal({ admin, target, onClose, logAction }) {
  const [pw, setPw] = useState(() => randomPassword());
  const [mustChange, setMustChange] = useState(true);
  const [adminPw, setAdminPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const save = async () => {
    setMsg("");
    if (!PW_RULE.test(pw)) return setMsg("รหัสผ่านอย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข");
    if (!adminPw) return setMsg("กรุณากรอกรหัสผ่านของคุณเพื่อยืนยันตัวตน");
    setBusy(true);
    try {
      await postToSheetsAwait("pwAdminReset", { adminUsername: admin.id, adminPassword: adminPw, targetUsername: target.id, newPassword: pw, mustChange });
      logAction?.(`รีเซ็ตรหัสผ่าน: ${target.name} (${target.id})`);
      setDone(true);
    } catch (e) { setMsg(e.message || "รีเซ็ตรหัสผ่านไม่สำเร็จ"); }
    setBusy(false);
  };
  const copy = () => { navigator.clipboard?.writeText(pw).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); };
  return (
    <Modal title="รีเซ็ตรหัสผ่าน" onClose={onClose}>
      <div className="mb-3 p-3 text-sm" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
        <div className="font-semibold" style={{ color: C.ink }}>{target.name}</div>
        <div className="text-xs" style={{ color: C.slate }}>Username: {target.id}</div>
      </div>
      {done ? (
        <div>
          <div className="p-3 mb-3 text-sm" style={{ background: C.okBg, color: C.ok }}>ตั้งรหัสผ่านใหม่เรียบร้อย — แจ้งรหัสนี้กับเจ้าของบัญชีโดยตรง</div>
          <div className="flex items-center gap-2 mb-4">
            <code data-no-i18n className="flex-1 px-3 py-2 text-base font-bold tracking-wider" style={{ background: C.paper, border: `1px solid ${C.line}`, color: C.navy }}>{pw}</code>
            <Btn variant="ghost" small icon={Copy} onClick={copy}>{copied ? "คัดลอกแล้ว" : "คัดลอก"}</Btn>
          </div>
          <Btn onClick={onClose}>เสร็จสิ้น</Btn>
        </div>
      ) : (
        <>
          <Field label="รหัสผ่านใหม่ *">
            <div className="flex gap-2">
              <div className="flex-1"><PwInput value={pw} onChange={setPw} /></div>
              <Btn variant="ghost" small icon={RefreshCw} onClick={() => setPw(randomPassword())}>สุ่มรหัสผ่าน</Btn>
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm mb-3" style={{ color: C.ink }}>
            <input type="checkbox" checked={mustChange} onChange={(e) => setMustChange(e.target.checked)} />
            บังคับเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป
          </label>
          <Field label="รหัสผ่านของคุณ (ยืนยันตัวตนหัวหน้า) *"><PwInput value={adminPw} onChange={setAdminPw} autoComplete="current-password" /></Field>
          {msg && <div className="text-xs mb-3" style={{ color: C.crimson }}>{msg}</div>}
          <Btn variant="crimson" onClick={save} disabled={busy} icon={busy ? RefreshCw : KeyRound}>{busy ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}</Btn>
        </>
      )}
    </Modal>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
export default function App() {
  const [user, setUser] = useState(null);
  const [loginId, setLoginId] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState(seedItems());
  const [borrows, setBorrows] = useState([
    { id: "BR-1001", date: "2026-09-10", borrower: "อารีน่า (หน่วยงานภายนอก)", itemId: null, itemCode: "FAC-016", itemName: "บันไดอลูมิเนียม 12 ขั้น", qty: 1, where: "อารีน่า", purpose: "ใช้งานทั่วไป", due: "2026-09-30", returned: null, status: "borrowed" },
    { id: "BR-1002", date: "2026-09-15", borrower: "ม.ชาญวิทย์ พึ่งอิ่ม", itemId: null, itemCode: "FUT-005", itemName: "ลูกฟุตซอล สีขาว-ฟ้า (ใหม่)", qty: 10, where: "สนามฟุตซอล", purpose: "สอนคาบ ป.5/2", due: "2026-09-15", returned: null, status: "borrowed" },
  ]);
  const [damages, setDamages] = useState([]);
  const [actionsLog, setActionsLog] = useState([]);
  const [staffList, setStaffList] = useState(STAFF);
  const [schedule, setSchedule] = useState(() => readScheduleCache().base || []);
  const [tasks, setTasks] = useState([]);
  const [orgEvents, setOrgEvents] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [pmSchedule, setPmSchedule] = useState([]);
  const [docs, setDocs] = useState([]);

  const [sheetsError, setSheetsError] = useState("");
  const [lang, setLang] = useState(getLang());
  useEffect(() => { applyLang(lang); }, [lang]);
  const [forcePw, setForcePw] = useState(null); // { oldPassword } เมื่อบัญชีถูกรีเซ็ตรหัสผ่าน
  const [scheduleWarnings, setScheduleWarnings] = useState(() => readScheduleCache().warnings || []);
  // ตารางสอนจากชีตรายครู เก็บแยกจาก schedule หลัก แล้วรวมกันตอนแสดงผล
  // (โหลดพร้อมกันได้ ไม่ต้องรอกัน และไม่เขียนทับกัน)
  const [teachingRows, setTeachingRows] = useState(() => readScheduleCache().teaching || []);
  const [combinedSport, setCombinedSport] = useState(() => readScheduleCache().combined || []);
  const [scheduleLoaded, setScheduleLoaded] = useState(() => !!readScheduleCache().savedAt);
  const allSchedule = useMemo(() => mergeSchedules(schedule, teachingRows), [schedule, teachingRows]);

  // persistence — Google Sheets backend when API_URL is set, else local shared storage
  useEffect(() => {
    // ตารางสอนรายครู — เริ่มโหลดทันทีพร้อมข้อมูลหลัก (ไม่ต้องรอกัน)
    if (TEACHING_API_URL) {
      loadTeachingSchedule()
        .then(({ rows, combined, warnings }) => {
          setTeachingRows(rows); setCombinedSport(combined); setScheduleWarnings(warnings); setScheduleLoaded(true);
          writeScheduleCache({ teaching: rows, combined, warnings });
        })
        .catch(() => {});
    }
    (async () => {
      if (API_URL) {
        try {
          const { items: si, borrows: sb, damages: sd, staff: ss, schedule: sc, tasks: tk, orgEvents: oe, repairs: rp, pmSchedule: pm, docs: dc } = await loadFromSheets();
          setItems(si); setBorrows(sb); setDamages(sd);
          if (ss && ss.length) setStaffList(ss);
          setSchedule(sc || []); setScheduleLoaded(true);
          writeScheduleCache({ base: sc || [] });
          setTasks(tk || []);
          setOrgEvents(oe || []); setRepairs(rp || []); setPmSchedule(pm || []); setDocs(dc || []);
        } catch (e) { setSheetsError("เชื่อมต่อ Google Sheets ไม่สำเร็จ — กำลังใช้ข้อมูลตัวอย่างในเครื่องแทน"); }
        setLoading(false);
        return;
      }
      try {
        const [i, b, d, a] = await Promise.all([
          window.storage?.get("items", true).catch(() => null),
          window.storage?.get("borrows", true).catch(() => null),
          window.storage?.get("damages", true).catch(() => null),
          window.storage?.get("actions", true).catch(() => null),
        ]);
        if (i?.value) setItems(JSON.parse(i.value));
        if (b?.value) setBorrows(JSON.parse(b.value));
        if (d?.value) setDamages(JSON.parse(d.value));
        if (a?.value) setActionsLog(JSON.parse(a.value));
      } catch (e) { /* first run, no data yet */ }
      setLoading(false);
    })();
  }, []);
  useEffect(() => { if (!loading && !API_URL) window.storage?.set("items", JSON.stringify(items), true).catch(() => {}); }, [items, loading]);
  useEffect(() => { if (!loading && !API_URL) window.storage?.set("borrows", JSON.stringify(borrows), true).catch(() => {}); }, [borrows, loading]);
  useEffect(() => { if (!loading && !API_URL) window.storage?.set("damages", JSON.stringify(damages), true).catch(() => {}); }, [damages, loading]);
  useEffect(() => { if (!loading) window.storage?.set("actions", JSON.stringify(actionsLog), true).catch(() => {}); }, [actionsLog, loading]);

  const handleLogin = async (id, password) => {
    // real staff: verify username + password server-side against "9.บุคลากร"
    if (API_URL) {
      try {
        const result = await postToSheetsAwait("login", { username: id.trim(), password: password || "" });
        const u = result.user;
        const role = ["L0", "L1", "L2", "L3", "L4"].includes(u.role) ? u.role : "L1";
        setUser({ id: u.id, name: u.name, role, dept: u.dept, title: u.dept, photoUrl: u.photoUrl || "", phone: u.phone || "" });
        setTab("profile"); setLoginErr("");
        // รหัสผ่านที่หัวหน้ารีเซ็ตให้ → บังคับตั้งรหัสใหม่ก่อนใช้งาน
        if (u.mustChange) setForcePw({ oldPassword: password || "" });
        return;
      } catch (e) {
        setLoginErr(e.message || "Username หรือ Password ไม่ถูกต้อง");
        return;
      }
    }

    // offline/demo fallback (no backend connected yet) — ID-only, same as before
    const s = staffList.find((x) => x.id.toLowerCase() === id.trim().toLowerCase());
    if (s) {
      const role = ["L0", "L1", "L2", "L3", "L4"].includes(s.level) ? s.level : "L1";
      setUser({ id: s.id, name: s.name, role, dept: s.dept, title: s.role, photoUrl: s.photoUrl || "", phone: s.phone || "" });
      setTab("profile"); setLoginErr("");
      return;
    }
    setLoginErr("ไม่พบรหัสครู (Teacher ID) นี้ในระบบ");
  };

  const logAction = useCallback((text) => {
    setActionsLog((prev) => [{ id: `A-${Date.now()}`, ts: new Date().toISOString(), user: user?.name, text }, ...prev].slice(0, 200));
  }, [user]);

  const createTask = useCallback(async (payload) => {
    const full = { ...payload, createdBy: user?.name || "" };
    const r = await postToSheetsAwait("addTask", full);
    const rec = { ...full, id: r.id, comments: "", createdDate: new Date().toISOString(), completedDate: "" };
    setTasks((prev) => [rec, ...prev]);
    logAction(`สร้างงานใหม่: ${payload.title}`);
    return rec;
  }, [user, logAction]);

  const patchTask = useCallback(async (id, patch) => {
    await postToSheetsAwait("updateTask", { id, ...patch });
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      if (patch.status === "COMPLETED") next.completedDate = new Date().toISOString();
      if (patch.addComment) {
        const stamp = new Date().toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
        const line = `[${stamp}] ${patch.commentBy || ""}: ${patch.addComment}`;
        next.comments = t.comments ? `${t.comments}\n${line}` : line;
      }
      delete next.addComment; delete next.commentBy;
      return next;
    }));
    logAction(`อัปเดตงาน ${id}${patch.status ? " → " + patch.status : ""}`);
  }, [logAction]);

  // smart task creation: overdue borrows without a linked follow-up task get one automatically
  useEffect(() => {
    if (!user || loading || !API_URL) return;
    if (!(user.role === "L2" || user.role === "L3")) return;
    const overdueBorrows = borrows.filter((b) => b.status === "borrowed" && b.due && b.due < TODAY_ISO);
    const linked = new Set(tasks.map((t) => t.relatedBorrowId).filter(Boolean));
    overdueBorrows.filter((b) => !linked.has(b.id)).forEach((b) => {
      createTask({
        title: `ติดตามการคืน: ${b.itemName} (${b.itemCode})`,
        description: `ยืมโดย ${b.borrower} กำหนดคืน ${b.due} ยังไม่มีการคืน`,
        priority: "NORMAL", status: "TODO", dueDate: b.due, dueTime: "", assignee: "",
        location: b.where || "", relatedResource: b.itemCode, relatedBorrowId: b.id, taskType: "follow-up",
      }).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, borrows.length, tasks.length]);

  if (!user) return <LangContext.Provider value={{ lang, setLang }}><LoginScreen loginId={loginId} setLoginId={setLoginId} onLogin={handleLogin} err={loginErr} /></LangContext.Provider>;

  const nav = NAV[user.role];

  return (
    <LangContext.Provider value={{ lang, setLang }}>
    <div className="app-shell app-shell-auth" style={{ fontFamily: FONT, background: C.paper, color: C.ink }}>
      <Sidebar user={user} nav={nav} tab={tab} setTab={setTab} onLogout={() => setUser(null)} />
      <div className="app-shell-main-col">
        <TopBar user={user} nav={nav} tab={tab} setTab={setTab} onLogout={() => setUser(null)} />
        {(!API_URL || sheetsError) && (
          <div className="px-4 py-2 text-xs flex items-center gap-2 shrink-0" style={{ background: sheetsError ? C.badBg : C.goldSoft, color: C.crimsonDeep }}>
            <AlertTriangle size={13} className="shrink-0" />
            <span>{sheetsError || "ยังไม่ได้เชื่อมต่อกับ Google Sheet หลังบ้าน — ตอนนี้ใช้ข้อมูลตัวอย่างในเครื่อง"}</span>
          </div>
        )}
        <main className="flex-1 p-4 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>
          {tab === "dashboard" && <Dashboard user={user} items={items} borrows={borrows} damages={damages} tasks={tasks} staffList={staffList} repairs={repairs} pmSchedule={pmSchedule} docs={docs} schedule={allSchedule} setTab={setTab} />}
          {tab === "tasks" && <WorkManagement user={user} tasks={tasks} setTasks={setTasks} staffList={staffList} items={items} createTask={createTask} patchTask={patchTask} logAction={logAction} setTab={setTab} />}
          {tab === "inventory" && <Inventory user={user} items={items} setItems={setItems} logAction={logAction} />}
          {tab === "facility" && <Facility items={items} schedule={allSchedule} pmSchedule={pmSchedule} repairs={repairs} setTab={setTab} />}
          {tab === "staff" && <StaffDirectory staff={staffList} schedule={allSchedule} setStaffList={setStaffList} user={user} logAction={logAction} />}
          {tab === "profile" && <ProfilePage user={user} setUser={setUser} staffList={staffList} setStaffList={setStaffList} tasks={tasks} schedule={allSchedule} patchTask={patchTask} setTab={setTab} logAction={logAction} />}
          {tab === "schedule" && <ScheduleView user={user} schedule={allSchedule} setSchedule={setSchedule} staffList={staffList} tasks={tasks} logAction={logAction} warnings={scheduleWarnings} loaded={scheduleLoaded} combinedSport={combinedSport} />}
          {tab === "calendar" && <CalendarView user={user} tasks={tasks} schedule={schedule} orgEvents={orgEvents} pmSchedule={pmSchedule} setOrgEvents={setOrgEvents} setTab={setTab} logAction={logAction} />}
          {tab === "maintenance" && <MaintenanceView user={user} items={items} repairs={repairs} setRepairs={setRepairs} pmSchedule={pmSchedule} setPmSchedule={setPmSchedule} staffList={staffList} logAction={logAction} />}
          {tab === "knowledge" && <KnowledgeBase user={user} docs={docs} setDocs={setDocs} logAction={logAction} />}
          {tab === "budget" && <BudgetView user={user} staffList={staffList} logAction={logAction} />}
          {tab === "borrow" && <Borrowing user={user} items={items} setItems={setItems} borrows={borrows} setBorrows={setBorrows} logAction={logAction} />}
          {tab === "damage" && <DamageMaint user={user} items={items} setItems={setItems} damages={damages} setDamages={setDamages} setTasks={setTasks} logAction={logAction} />}
          {tab === "analytics" && <Analytics user={user} items={items} borrows={borrows} damages={damages} tasks={tasks} staffList={staffList} schedule={allSchedule} combinedSport={combinedSport} repairs={repairs} pmSchedule={pmSchedule} docs={docs} setTab={setTab} />}
          {tab === "reports" && <Reports user={user} items={items} borrows={borrows} damages={damages} tasks={tasks} staffList={staffList} schedule={allSchedule} combinedSport={combinedSport} repairs={repairs} pmSchedule={pmSchedule} docs={docs} />}
          {tab === "actions" && <ManagementActions user={user} items={items} setItems={setItems} borrows={borrows} damages={damages} tasks={tasks} staffList={staffList} repairs={repairs} pmSchedule={pmSchedule} docs={docs} actionsLog={actionsLog} logAction={logAction} setTab={setTab} />}
        </main>
        <BottomNav nav={nav} tab={tab} setTab={setTab} />
      </div>
      {forcePw && <ChangePasswordModal user={user} forced oldPassword={forcePw.oldPassword} onClose={() => setForcePw(null)} />}
    </div>
    </LangContext.Provider>
  );
}

/* ============================================================
   LOGIN
   ============================================================ */
function LoginScreen({ loginId, setLoginId, onLogin, err }) {
  const LOGO_URL = "https://i.postimg.cc/nz2bfkgs/Beige-Minimal-Color-UI-Search-Page-Job-Portal-Website-Desktop-Prototype-(4).png";
  const MASCOT_URL = "https://i.postimg.cc/hvB9N1n8/Beige-Minimal-Color-UI-Search-Page-Job-Portal-Website-Desktop-Prototype-3.png";
  const MOBILE_BG_URL = "https://i.postimg.cc/90xFhcT9/Beige-Minimal-Color-UI-Search-Page-Job-Portal-Website-Desktop-Prototype-(6).png";
  const [navOpen, setNavOpen] = useState(false);
  const [password, setPassword] = useState("");
  const submit = () => onLogin(loginId, password);
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ fontFamily: FONT, background: "#0A0A0A" }}>
      {/* top navbar — full-width on desktop; stays sensible when squeezed to mobile width */}
      <header className="relative shrink-0 flex items-center justify-between px-5 min-[1080px]:px-10 py-3 min-[1080px]:py-4"
        style={{ background: "linear-gradient(90deg,#2a2a2c,#3a3a3c 40%,#4a4a4c)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <img src={LOGO_URL} alt="ACT 1961 Sport Center" className="h-10 min-[1080px]:h-14 w-auto shrink-0" style={{ objectFit: "contain" }} />
        </div>
        <nav className="hidden min-[1080px]:flex items-center gap-8 ml-auto">
          <LangToggle />
          <a className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>Home</a>
          <a className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>About</a>
          <span className="px-5 py-2 text-sm font-semibold" style={{ background: C.crimson, color: C.white }}>Contact</span>
        </nav>
        <LangToggle className="min-[1080px]:hidden ml-auto mr-1" />
        <button onClick={() => setNavOpen((v) => !v)} className="min-[1080px]:hidden w-11 h-11 flex items-center justify-center shrink-0" aria-label="เมนู">
          <Menu size={22} color="rgba(255,255,255,0.85)" />
        </button>
        {navOpen && (
          <div className="min-[1080px]:hidden absolute top-full left-0 right-0 z-20 flex flex-col" style={{ background: "#2a2a2c", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <a className="px-5 py-3 text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>Home</a>
            <a className="px-5 py-3 text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>About</a>
            <span className="mx-5 my-2 px-5 py-2 text-sm font-semibold text-center" style={{ background: C.crimson, color: C.white }}>Contact</span>
          </div>
        )}
      </header>

      {/* hero — mascot left, login card right on desktop; stacked on mobile */}
      <div className="flex-1 relative flex flex-col min-[1080px]:flex-row overflow-y-auto overflow-x-hidden" style={{
        background: "linear-gradient(135deg,#3a3a3c 0%,#232325 30%,#1a1a1c 60%,#0e0e10 100%)",
      }}>
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(100deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)",
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(60% 50% at 70% 20%, rgba(255,255,255,0.08), transparent 60%)",
        }} />

        {/* mobile: full-bleed background photo with a black→red filter overlay, per the reference */}
        <div className="min-[1080px]:hidden absolute inset-0 z-0" style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,4,4,0.15) 0%, rgba(130,15,25,0.15) 45%, rgba(8,3,3,0.75) 100%), url("${MOBILE_BG_URL}")`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }} />

        {/* mascot illustration — desktop only; mobile uses the full-bleed background above instead */}
        <div className="hidden min-[1080px]:flex relative shrink-0 overflow-hidden min-[1080px]:w-[48%] min-[1080px]:h-full">
          <img src={MASCOT_URL} alt="ACT Sport Center mascots" className="w-full h-full object-cover object-left" />
        </div>

        {/* login column */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-5 sm:px-6 min-[1080px]:px-14 py-5 min-[1080px]:pt-16 min-[1080px]:pb-10">
          <h1 className="text-4xl min-[1080px]:text-6xl tracking-tight min-[1080px]:whitespace-nowrap mb-6 min-[1080px]:mb-10 shrink-0 text-center min-[1080px]:text-left" style={{ color: C.crimson, textShadow: "0 4px 0 rgba(0,0,0,0.4)", fontFamily: "'Anton', sans-serif" }}>
            <span style={{ color: C.white }}>ACT</span> SPORT CENTER
          </h1>
          <div className="flex items-center justify-center min-[1080px]:justify-start">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3 mb-5 justify-center text-center min-[1080px]:justify-start min-[1080px]:text-left">
              <Users size={28} strokeWidth={1.4} style={{ color: "rgba(255,255,255,0.7)" }} />
              <div>
                <div className="text-lg font-semibold" style={{ color: C.white }}>ACT SportHub</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>ลงทะเบียนเข้าใช้งานด้วยรหัสประจำตัวครู</div>
              </div>
            </div>

            <div className="relative p-6" style={{
              background: "linear-gradient(160deg, rgba(158,27,43,0.35), rgba(30,30,32,0.55))",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(232,100,26,0.35)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 40px rgba(200,30,58,0.18)",
            }}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-1.5" style={{ color: C.white }}>Username</label>
                <div className="relative">
                  <User size={15} style={{ position: "absolute", left: 14, top: 14, color: "rgba(255,255,255,0.55)" }} />
                  <input value={loginId} onChange={(e) => setLoginId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="Username เช่น T00125"
                    className="focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 transition-all duration-200"
                    style={{
                      width: "100%", minHeight: 48, padding: "12px 12px 12px 38px", fontFamily: FONT, fontSize: 14,
                      background: "rgba(158,27,43,0.28)", border: "1px solid rgba(255,255,255,0.15)",
                      color: C.white, outline: "none",
                    }} />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-1.5" style={{ color: C.white }}>Password</label>
                <div className="relative">
                  <Lock size={15} style={{ position: "absolute", left: 14, top: 14, color: "rgba(255,255,255,0.55)" }} />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="Password"
                    style={{
                      width: "100%", minHeight: 48, padding: "12px 12px 12px 38px", fontFamily: FONT, fontSize: 14,
                      background: "rgba(158,27,43,0.28)", border: "1px solid rgba(255,255,255,0.15)",
                      color: C.white, outline: "none",
                    }} />
                </div>
              </div>

              {err && <div className="text-xs mb-3 flex items-center gap-1.5" style={{ color: "#FF9EAE" }}><AlertTriangle size={13} />{err}</div>}

              <div className="mt-2 min-[1080px]:mt-5 min-[1080px]:flex min-[1080px]:justify-end">
                <button onClick={submit}
                  className="w-full min-[1080px]:w-auto px-8 py-3 min-[1080px]:py-2.5 text-sm font-bold transition-all duration-200 active:scale-95 hover:brightness-110 hover:shadow-[0_0_28px_rgba(232,100,26,0.75)]"
                  style={{
                    minHeight: 48,
                    background: "linear-gradient(135deg,#FF8A3D,#E8641A)",
                    color: C.white,
                    boxShadow: "0 0 18px rgba(232,100,26,0.55), 0 4px 10px rgba(0,0,0,0.3)",
                  }}>
                  Login
                </button>
              </div>
            </div>

            <div className="mt-6 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              © 2026 Assumption College Thonburi<br />ACT Sport Center Resource Intelligence · v1.0.0
              <br />Developer : P.Prayoon-Anutep
            </div>

          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ============================================================
   SIDEBAR / TOPBAR
   ============================================================ */
function Sidebar({ user, nav, tab, setTab, onLogout }) {
  const meta = ROLE_META[user.role];
  return (
    <aside className="desktop-sidebar shrink-0 flex-col" style={{ display: "none", width: 260, background: C.navyDeep, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="px-5 py-6 flex flex-col items-center text-center shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <img src="https://i.postimg.cc/nz2bfkgs/Beige-Minimal-Color-UI-Search-Page-Job-Portal-Website-Desktop-Prototype-(4).png" alt="ACT 1961 Sport Center" className="w-24" style={{ objectFit: "contain" }} />
      </div>
      <button onClick={() => setTab("profile")} className="mx-4 mt-4 mb-2 p-3 flex items-center gap-3 text-left shrink-0"
        style={{ background: tab === "profile" ? C.crimson : "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: meta.tint }}>
          {user.photoUrl ? <img src={user.photoUrl} alt="" className="w-full h-full" style={{ objectFit: "cover" }} /> : <User size={15} color={C.white} />}
        </div>
        <div className="min-w-0">
          <div className="text-white text-xs font-bold truncate">{user.name}</div>
          <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.55)" }}>{user.title || meta.label}</div>
        </div>
      </button>
      <nav className="flex-1 overflow-y-auto py-1">
        {groupedNav(nav).filter((g) => g.items.some(([k]) => k !== "profile")).map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-1" : ""}>
            <div className="px-5 pt-3 pb-1 text-[10px] font-bold tracking-wider uppercase" style={{ color: "#6B7699" }}>{group.label}</div>
            {group.items.filter(([k]) => k !== "profile").map(([key, label, Icon]) => {
              const active = tab === key;
              return (
                <button key={key} onClick={() => setTab(key)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-left transition-colors"
                  style={{
                    color: active ? C.white : "#AEB8D6",
                    background: active ? "rgba(255,255,255,0.08)" : "transparent",
                    borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
                  }}>
                  <Icon size={16} />{label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="px-5 py-4 shrink-0 flex items-center justify-between gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <button onClick={onLogout} className="flex items-center gap-2 text-xs" style={{ color: "#93A0C4" }}>
          <LogOut size={13} /> ออกจากระบบ
        </button>
        <LangToggle />
      </div>
    </aside>
  );
}

/* ============================================================
   TOP BAR + MOBILE DRAWER (mobile only — see Sidebar for desktop)
   ============================================================ */
function TopBar({ user, nav, tab, setTab, onLogout }) {
  const meta = ROLE_META[user.role];
  const [drawer, setDrawer] = useState(false);
  return (
    <>
      <header className="mobile-only flex items-center justify-between px-3 py-3 shrink-0" style={{ background: C.white, borderBottom: `1px solid ${C.line}`, paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
        <button onClick={() => setDrawer(true)} className="w-9 h-9 flex items-center justify-center shrink-0" aria-label="เมนู">
          <div className="flex flex-col gap-1">
            <span className="block w-5 h-0.5" style={{ background: C.ink }} />
            <span className="block w-5 h-0.5" style={{ background: C.ink }} />
            <span className="block w-5 h-0.5" style={{ background: C.ink }} />
          </div>
        </button>
        <div className="min-w-0 flex-1 flex items-center justify-center gap-2 px-2">
          <img src="https://i.postimg.cc/nz2bfkgs/Beige-Minimal-Color-UI-Search-Page-Job-Portal-Website-Desktop-Prototype-(4).png" alt="ACT 1961 Sport Center" className="h-8 w-auto shrink-0" style={{ objectFit: "contain" }} />
          <div className="text-[11px] font-semibold tracking-wide truncate" style={{ color: meta.tint }}>{meta.dash}</div>
        </div>
        <button onClick={() => setTab("profile")} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: meta.tint }} aria-label="โปรไฟล์">
          {user.photoUrl ? <img src={user.photoUrl} alt="" className="w-full h-full" style={{ objectFit: "cover" }} /> : <User size={15} color={C.white} />}
        </button>
      </header>
      {user.role === "L4" && (
        <div className="px-3 py-1.5 shrink-0" style={{ background: C.goldSoft }}>
          <Pill fg={C.gold} bg={C.goldSoft}><Eye size={12} /> โหมดดูอย่างเดียว</Pill>
        </div>
      )}
      {drawer && (
        <div className="absolute inset-0 z-50 flex" onClick={() => setDrawer(false)}>
          <div className="w-[78%] max-w-[320px] h-full flex flex-col" style={{ background: C.navyDeep }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-5 flex items-center gap-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
              <img src="https://i.postimg.cc/nz2bfkgs/Beige-Minimal-Color-UI-Search-Page-Job-Portal-Website-Desktop-Prototype-(4).png" alt="ACT 1961 Sport Center" className="w-10 h-10" style={{ objectFit: "contain" }} />
              <div>
                <div className="text-white font-bold text-sm leading-tight">ACT SPORT CENTER</div>
                <div className="text-[11px]" style={{ color: "#93A0C4" }}>Resource Intelligence</div>
              </div>
            </div>
            <nav className="flex-1 py-2 overflow-y-auto">
              {groupedNav(nav).map((group, gi) => (
                <div key={group.label} className={gi > 0 ? "mt-1" : ""}>
                  <div className="px-5 pt-3 pb-1 text-[10px] font-bold tracking-wider uppercase" style={{ color: "#6B7699" }}>{group.label}</div>
                  {group.items.map(([key, label, Icon]) => {
                    const active = tab === key;
                    return (
                      <button key={key} onClick={() => { setTab(key); setDrawer(false); }}
                        className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-left transition-colors"
                        style={{
                          color: active ? C.white : "#AEB8D6",
                          background: active ? "rgba(255,255,255,0.08)" : "transparent",
                          borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
                        }}>
                        <Icon size={16} />{label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="px-5 py-4 shrink-0 flex items-center justify-between gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
              <button onClick={onLogout} className="flex items-center gap-2 text-xs" style={{ color: "#93A0C4" }}>
                <LogOut size={13} /> ออกจากระบบ
              </button>
              <LangToggle />
            </div>
          </div>
          <div className="flex-1" style={{ background: "rgba(0,0,0,0.5)" }} />
        </div>
      )}
    </>
  );
}

function BottomNav({ nav, tab, setTab }) {
  const items = nav.slice(0, 5); // primary items only — everything else lives in the drawer
  return (
    <nav className="mobile-only bottom-nav-fixed shrink-0 flex items-stretch" style={{
      background: C.white, borderTop: `1px solid ${C.line}`,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {items.map(([key, label, Icon]) => {
        const active = tab === key;
        return (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
            style={{ color: active ? C.crimson : C.mute }}>
            <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            <span className="text-[10px] leading-tight truncate max-w-[64px]" style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ============================================================
   DASHBOARD (role-adaptive)
   ============================================================ */
function computeKpis(items, borrows) {
  const total = items.length;
  const normal = items.reduce((s, i) => s + i.normal, 0);
  const damaged = items.reduce((s, i) => s + i.damaged, 0);
  const lost = items.reduce((s, i) => s + i.lost, 0);
  const disposed = items.reduce((s, i) => s + i.disposed, 0);
  const activeBorrows = borrows.filter((b) => b.status === "borrowed").length;
  const overdue = borrows.filter((b) => b.status === "borrowed" && b.due && b.due < TODAY_ISO).length;
  const outOfStock = items.filter((i) => i.normal === 0).length;
  const watch = items.filter((i) => i.damaged > 0).length;
  return { total, normal, damaged, lost, disposed, activeBorrows, overdue, outOfStock, watch };
}

function Dashboard({ user, items, borrows, damages, tasks, staffList = [], repairs = [], pmSchedule = [], docs = [], schedule = [], setTab }) {
  const k = computeKpis(items, borrows);
  // ตัวชี้วัดระดับองค์กร — งาน/ซ่อมบำรุง/สถานที่ (ใช้ในภาพรวมของ L3/L4)
  const orgKpis = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
    const unassigned = active.filter((t) => !t.assignee).length;
    const openRepairs = repairs.filter((r) => (r.status || "").toString().indexOf("เสร็จ") < 0 && (r.status || "").toString().toLowerCase() !== "done").length;
    const pmSoon = pmSchedule.filter((p) => p.nextDate && p.nextDate >= TODAY_ISO && p.nextDate <= addDaysISO(30)).length;
    // สถานที่ที่กำลังใช้งานอยู่ (real-time) — ประมาณจากตารางใช้ห้องของวัน/เวลาปัจจุบัน
    const now = new Date();
    const day = THAI_DAY_NOW[now.getDay()];
    const nm = now.getHours() * 60 + now.getMinutes();
    const inUse = new Set(schedule.filter((s) => s.day === day && (() => {
      const st = toMinutes_(s.start), en = toMinutes_(s.end);
      return st !== null && en !== null && nm >= st && nm < en;
    })()).map((s) => s.loc)).size;
    return { activeTasks: active.length, unassigned, openRepairs, pmSoon, inUse };
  }, [tasks, repairs, pmSchedule, schedule]);
  const byCat = useMemo(() => {
    const m = {};
    items.forEach((i) => {
      m[i.catCode] = m[i.catCode] || { cat: catName(i.catCode), ok: 0, damaged: 0 };
      m[i.catCode].ok += i.normal; m[i.catCode].damaged += i.damaged;
    });
    return Object.values(m).sort((a, b) => b.damaged - a.damaged).slice(0, 8);
  }, [items]);
  const pieData = [
    { name: "Normal", value: k.normal, fill: C.ok },
    { name: "Damaged", value: k.damaged, fill: C.crimson },
    { name: "Borrowed", value: k.activeBorrows, fill: C.warn },
  ].filter((entry) => entry.value > 0);

  const topDamaged = useMemo(() => [...items].filter((i) => i.damaged > 0).sort((a, b) => b.damaged - a.damaged).slice(0, 6), [items]);

  const myTasks = useMemo(() => tasks.filter((t) => t.assignee === user.name || t.createdBy === user.name), [tasks, user.name]);
  const taskCounts = useMemo(() => {
    const c = { overdue: 0, today: 0, upcoming: 0, completed: 0 };
    myTasks.forEach((t) => {
      const b = taskBucket(t);
      if (b === "overdue") c.overdue++;
      else if (b === "today") c.today++;
      else if (b === "upcoming") c.upcoming++;
      else if (b === "completed") c.completed++;
    });
    return c;
  }, [myTasks]);
  const todaysTasks = useMemo(() => myTasks.filter((t) => taskBucket(t) === "today" || taskBucket(t) === "overdue"), [myTasks]);

  const orgOverdueTasks = tasks.filter((t) => taskBucket(t) === "overdue");
  const orgTodayTasks = tasks.filter((t) => taskBucket(t) === "today");
  const orgCritical = tasks.filter((t) => t.priority === "CRITICAL" && t.status !== "COMPLETED" && t.status !== "CANCELLED");

  if (user.role === "L1") {
    const mine = borrows.filter((b) => b.borrower === user.name);
    return (
      <div>
        <SectionHead eyebrow="MY WORKSPACE" title={`สวัสดี, ${user.name}`} sub="นี่คือสิ่งที่คุณต้องทำวันนี้" />
        {todaysTasks.length > 0 && (
          <div className="mb-6 p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: C.navy }}><ClipboardList size={15} /> งานของวันนี้</h3>
            <div className="space-y-2">
              {todaysTasks.map((t) => <TaskRow key={t.id} t={t} onOpen={() => setTab("tasks")} />)}
            </div>
          </div>
        )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard label="กำลังยืมอยู่" value={mine.filter((b) => b.status === "borrowed").length} icon={ArrowLeftRight} tone="navy" />
            <StatCard label="เกินกำหนดคืน" value={mine.filter((b) => b.status === "borrowed" && b.due && b.due < TODAY_ISO).length} icon={AlertTriangle} tone="crimson" />
          <StatCard label="คืนแล้วทั้งหมด" value={mine.filter((b) => b.status === "returned").length} icon={CheckCircle2} tone="ok" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <QuickAction icon={ClipboardList} title="งานของฉันทั้งหมด" desc="ดูรายการงานที่ได้รับมอบหมายทั้งหมด" onClick={() => setTab("tasks")} />
          <QuickAction icon={ArrowLeftRight} title="ยืมอุปกรณ์" desc="ค้นหาอุปกรณ์ที่พร้อมใช้และส่งคำขอยืม" onClick={() => setTab("borrow")} />
          <QuickAction icon={Wrench} title="แจ้งของชำรุด" desc="รายงานอุปกรณ์ที่พบว่าชำรุดหรือใช้งานไม่ได้" onClick={() => setTab("damage")} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHead eyebrow={ROLE_META[user.role].dash} title="ภาพรวมทรัพยากรศูนย์กีฬา" sub="อัปเดตแบบเรียลไทม์จากทะเบียนครุภัณฑ์และรายการยืม–คืน" />
      <div className="grid grid-cols-2 gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <StatCard label="รายการทั้งหมด" value={k.total} tone="navy" icon={Package} />
        <StatCard label="ใช้งานได้ (ชิ้น)" value={k.normal.toLocaleString()} tone="ok" icon={CheckCircle2} />
        <StatCard label="ชำรุด (ชิ้น)" value={k.damaged.toLocaleString()} tone="crimson" icon={Wrench} />
        <StatCard label="ถูกยืมอยู่" value={k.activeBorrows} sub={k.overdue > 0 ? `${k.overdue} เกินกำหนด` : "ไม่มีเกินกำหนด"} tone="gold" icon={ArrowLeftRight} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="บุคลากร" value={staffList.length} sub="ที่ใช้งานระบบ" tone="navy" icon={Users} />
        <StatCard label="สถานที่ใช้งานตอนนี้" value={orgKpis.inUse} sub={`${LOCATIONS.length} ห้อง/สนามทั้งหมด`} tone="gold" icon={MapPin} />
        <StatCard label="ซ่อมบำรุงค้าง" value={orgKpis.openRepairs} sub={orgKpis.pmSoon > 0 ? `นัดใน 30 วัน: ${orgKpis.pmSoon}` : "ไม่มีนัดใน 30 วัน"} tone="crimson" icon={Wrench} />
        <StatCard label="คลังความรู้" value={docs.length} sub="เอกสารในระบบ" tone="ok" icon={BookOpen} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="งานที่เปิดอยู่ (ทั้งองค์กร)" value={orgKpis.activeTasks} sub={orgKpis.unassigned > 0 ? `${orgKpis.unassigned} ยังไม่ระบุผู้รับผิดชอบ` : "มอบหมายครบทุกงาน"} tone="navy" icon={ClipboardList} />
        <StatCard label="งานเกินกำหนด (ของฉัน)" value={taskCounts.overdue} tone="crimson" icon={AlertTriangle} />
        <StatCard label="ครบกำหนดวันนี้" value={taskCounts.today} tone="gold" icon={Clock} />
        <StatCard label="เสร็จแล้ว (ของฉัน)" value={taskCounts.completed} tone="ok" icon={CheckCircle2} />
      </div>

      {(orgOverdueTasks.length > 0 || orgTodayTasks.length > 0 || orgCritical.length > 0) && (
        <AttentionAlert
          overdue={orgOverdueTasks} today={orgTodayTasks} critical={orgCritical}
          onOpen={() => setTab("tasks")} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <div className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: C.navy }}>สุขภาพครุภัณฑ์โดยรวม</h3>
          <div className="text-xs mb-2" style={{ color: C.mute }}>สัดส่วนสุขภาพครุภัณฑ์โดยรวม</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart width={400} height={300}>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                {pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
              <Legend />
</PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 text-[11px] mt-1" style={{ color: C.slate }}>
            <span>🟢 ปกติ</span><span>🔴 ชำรุด</span><span>🟡 ยืมอยู่</span>
          </div>
        </div>
        <div className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: C.navy }}>สุขภาพทรัพยากรแยกตามหมวด (Top 8 ชำรุดสูงสุด)</h3>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart width={400} height={300} data={byCat}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="cat" angle={0} textAnchor="middle" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ok" name="ปกติ" fill={C.ok} />
              <Bar dataKey="damaged" name="ชำรุด" fill={C.crimson} />
</BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-4 xl:col-span-2" style={{ background: C.white, border: `1px solid ${C.line}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: C.navy }}>รายการชำรุดมากที่สุด</h3>
          <div className="space-y-2.5">
            {topDamaged.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium" style={{ color: C.ink }}>{it.name}</div>
                  <div className="text-xs" style={{ color: C.mute }}>{it.code}</div>
                </div>
                <Pill fg={C.crimson} bg={C.badBg}>{it.damaged}</Pill>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4" style={{ background: C.badBg, border: `1px solid #E9B9C1` }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} style={{ color: C.crimson, marginTop: 2 }} />
          <div>
            <div className="text-sm font-bold" style={{ color: C.crimsonDeep }}>คำแนะนำเชิงบริหาร</div>
            <p className="text-sm mt-1" style={{ color: "#5B2430" }}>
              หมวด <b>{byCat[0]?.cat}</b> มีอัตราชำรุดสูงสุด ({byCat[0]?.damaged} ชิ้น) — แนะนำให้พิจารณา
              ซ่อม/จัดซื้อทดแทน และตรวจสอบ {k.watch} รายการที่มีของชำรุดปนอยู่กับของปกติในทะเบียน
            </p>
            {user.role === "L3" && <button onClick={() => setTab("actions")} className="text-xs font-semibold mt-2 underline" style={{ color: C.crimsonDeep }}>ไปที่หน้าสั่งการบริหาร →</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttentionAlert({ overdue = [], today = [], critical = [], onOpen }) {
  const [open, setOpen] = useState(false);
  const groups = [
    { key: "overdue", label: "เกินกำหนด", icon: "🔴", tasks: overdue },
    { key: "today",   label: "ครบกำหนดวันนี้", icon: "🟡", tasks: today },
    { key: "critical", label: "งานวิกฤต", icon: "⚠️", tasks: critical },
  ].filter((g) => g.tasks.length > 0);
  return (
    <div className="mb-4" style={{ background: C.badBg, border: `1px solid #E9B9C1` }}>
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left p-4 flex items-start gap-2">
        <AlertTriangle size={16} style={{ color: C.crimson, marginTop: 2 }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold" style={{ color: C.crimsonDeep }}>ATTENTION REQUIRED — ต้องการความสนใจ</h3>
            <ChevronDown size={16} style={{ color: C.crimsonDeep, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm mt-1" style={{ color: "#5B2430" }}>
            {groups.map((g) => <span key={g.key}>{g.icon} {g.tasks.length} {g.label}</span>)}
          </div>
          {!open && <div className="text-[11px] mt-1" style={{ color: "#7B3F4A" }}>คลิกเพื่อดูรายการทั้งหมด</div>}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="text-xs font-bold mb-1.5" style={{ color: C.crimsonDeep }}>{g.icon} {g.label} ({g.tasks.length})</div>
              <div className="space-y-1">
                {g.tasks.slice(0, 8).map((t) => (
                  <div key={t.id} className="flex items-start gap-2 text-xs p-2" style={{ background: C.white, border: `1px solid ${C.line}` }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: C.ink }}>{t.title}</div>
                      <div style={{ color: C.mute }}>
                        {t.assignee ? `${t.assignee}` : "ยังไม่ระบุผู้รับผิดชอบ"}
                        {t.dueDate && ` · กำหนด ${t.dueDate}`}
                        {t.location && ` · ${t.location}`}
                      </div>
                    </div>
                    <Pill fg={(PRIORITY_META[t.priority] || PRIORITY_META.NORMAL).fg} bg={(PRIORITY_META[t.priority] || PRIORITY_META.NORMAL).bg}>{(PRIORITY_META[t.priority] || PRIORITY_META.NORMAL).label}</Pill>
                  </div>
                ))}
                {g.tasks.length > 8 && <div className="text-xs italic" style={{ color: C.mute }}>...และอีก {g.tasks.length - 8} รายการ</div>}
              </div>
            </div>
          ))}
          <button onClick={onOpen} className="text-xs font-semibold underline" style={{ color: C.crimsonDeep }}>ไปที่หน้าจัดการงาน →</button>
        </div>
      )}
    </div>
  );
}

function TaskRow({ t, onOpen, showAssignee }) {
  const sm = taskStatusDisplay(t);
  const pm = PRIORITY_META[t.priority] || PRIORITY_META.NORMAL;
  return (
    <button onClick={onOpen} className="w-full flex items-center justify-between px-3 py-2.5 text-left" style={{ border: `1px solid ${C.line}` }}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate" style={{ color: C.ink }}>{t.title}</div>
        <div className="text-xs mt-0.5" style={{ color: C.mute }}>
          {t.location && <span>{t.location} · </span>}
          {t.dueDate && <span>กำหนด {t.dueDate}{t.dueTime ? ` ${t.dueTime}` : ""}</span>}
          {showAssignee && t.assignee && <span> · {t.assignee}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <Pill fg={pm.fg} bg={pm.bg}>{pm.label}</Pill>
        <Pill fg={sm.fg} bg={sm.bg}>{sm.label}</Pill>
      </div>
    </button>
  );
}

function QuickAction({ icon: Icon, title, desc, onClick }) {
  return (
    <button onClick={onClick} className="text-left p-5 flex items-start gap-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
      <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: C.navy }}>
        <Icon size={18} color={C.white} />
      </div>
      <div>
        <div className="font-bold text-sm" style={{ color: C.ink }}>{title}</div>
        <div className="text-xs mt-1" style={{ color: C.slate }}>{desc}</div>
      </div>
    </button>
  );
}

/* ============================================================
   INVENTORY
   ============================================================ */
function Inventory({ user, items, setItems, logAction }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");
  const [edit, setEdit] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const editable = canEdit(user.role) || canManage(user.role);
  const manager = canManage(user.role);

  const filtered = items.filter((i) =>
    (cat === "ALL" || i.catCode === cat) &&
    (i.name.toLowerCase().includes(q.toLowerCase()) || i.code.toLowerCase().includes(q.toLowerCase()))
  );

  const saveEdit = (patch) => {
    setItems((prev) => prev.map((i) => (i.id === edit.id ? { ...i, ...patch } : i)));
    logAction(`แก้ไขครุภัณฑ์ ${edit.code} — ${edit.name}`);
    postToSheets("updateItem", { code: edit.code, ...patch });
    setEdit(null);
  };

  const addItem = (form) => {
    const rec = { id: form.code, code: form.code, name: form.name, brand: form.brand, catCode: form.catCode,
      loc: form.loc, owner: form.owner, normal: form.normal, damaged: form.damaged, lost: 0, disposed: 0,
      borrowed: 0, minAlert: form.minAlert, price: form.price, note: form.note, imageUrl: "" };
    setItems((prev) => [rec, ...prev]);
    logAction(`เพิ่มครุภัณฑ์ใหม่ ${form.code} — ${form.name}`);
    postToSheets("addItem", { ...form, catName: catName(form.catCode) });
    setShowNew(false);
  };

  const deleteItem = (it) => {
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    logAction(`ลบครุภัณฑ์ ${it.code} — ${it.name}`);
    postToSheets("deleteItem", { code: it.code });
    setConfirmDel(null);
  };

  return (
    <div>
      <SectionHead eyebrow="INVENTORY" title="ทะเบียนครุภัณฑ์" sub={`${filtered.length} รายการ จากทั้งหมด ${items.length} รายการ`}
        right={manager ? <Btn onClick={() => setShowNew(true)} icon={Plus}>เพิ่มครุภัณฑ์ใหม่</Btn> : !editable && <Pill fg={C.gold} bg={C.goldSoft}><Eye size={12} /> ดูอย่างเดียว</Pill>} />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: C.mute }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหารหัสหรือชื่ออุปกรณ์..."
            style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inputStyle, width: 200 }}>
          <option value="ALL">ทุกหมวด</option>
          {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>

      <div className="table-scroll" style={{ border: `1px solid ${C.line}`, background: C.white }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: C.navy, color: C.white }}>
              {["รหัส", "รายการ", "หมวด", "สถานที่", "ปกติ", "ชำรุด", "พร้อมใช้", "สถานะ", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 60).map((it) => {
              const s = statusOf(it);
              const avail = it.normal - it.borrowed;
              return (
                <tr key={it.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: C.slate }}>{it.code}</td>
                  <td className="px-3 py-2 font-medium">
                    <button onClick={() => setPreview(it)} className="text-left hover:underline" style={{ color: C.ink }} title="คลิกเพื่อดูรูปอุปกรณ์">
                      {it.name}{it.brand && <span className="text-xs" style={{ color: C.mute }}> · {it.brand}</span>}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: C.slate }}>{catName(it.catCode)}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: C.slate }}>{it.loc}</td>
                  <td className="px-3 py-2 text-xs">{it.normal}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: it.damaged > 0 ? C.crimson : C.mute, fontWeight: it.damaged > 0 ? 600 : 400 }}>{it.damaged}</td>
                  <td className="px-3 py-2 text-xs font-semibold">{avail}</td>
                  <td className="px-3 py-2"><Pill fg={s.fg} bg={s.bg}>{s.label}</Pill></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {editable ? (
                        <button onClick={() => setEdit(it)}><Pencil size={14} style={{ color: C.navy }} /></button>
                      ) : (
                        <Eye size={14} style={{ color: C.mute }} />
                      )}
                      {manager && <button onClick={() => setConfirmDel(it)}><X size={14} style={{ color: C.crimson }} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={`แก้ไข: ${edit.code}`} onClose={() => setEdit(null)}>
          <ItemEditForm item={edit} onSave={saveEdit} manager={canManage(user.role)} />
        </Modal>
      )}
      {showNew && (
        <Modal title="เพิ่มครุภัณฑ์ใหม่" onClose={() => setShowNew(false)} wide>
          <ItemAddForm onSave={addItem} />
        </Modal>
      )}
      {confirmDel && (
        <Modal title="ยืนยันการลบ" onClose={() => setConfirmDel(null)}>
          <p className="text-sm mb-4" style={{ color: C.ink }}>
            ต้องการลบ <b>{confirmDel.code} — {confirmDel.name}</b> ออกจากทะเบียนใช่หรือไม่? การลบนี้จะลบแถวออกจาก Google Sheet ด้วย และย้อนกลับไม่ได้
          </p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setConfirmDel(null)}>ยกเลิก</Btn>
            <Btn variant="crimson" onClick={() => deleteItem(confirmDel)} icon={X}>ยืนยันลบ</Btn>
          </div>
        </Modal>
      )}
      {preview && (
        <ItemImagePopup
          item={preview}
          onClose={() => setPreview(null)}
          editable={editable}
          onUploaded={(code, url) => {
            setItems((prev) => prev.map((i) => (i.code === code ? { ...i, imageUrl: url } : i)));
            setPreview((prev) => (prev ? { ...prev, imageUrl: url } : prev));
            logAction(`อัปโหลดรูป ${code}`);
          }}
        />
      )}
    </div>
  );
}

function ItemAddForm({ onSave }) {
  const [form, setForm] = useState({ code: "", name: "", brand: "", catCode: CATEGORIES[0].code, loc: "", owner: "", normal: 1, damaged: 0, minAlert: 0, price: 0, note: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }));
  const valid = form.code.trim() && form.name.trim();
  return (
    <div className="grid grid-cols-2 gap-x-4">
      <Field label="รหัสครุภัณฑ์ *"><input value={form.code} onChange={set("code")} placeholder="เช่น BDM-001" style={inputStyle} /></Field>
      <Field label="ชื่อรายการ *"><input value={form.name} onChange={set("name")} style={inputStyle} /></Field>
      <Field label="ยี่ห้อ/รุ่น"><input value={form.brand} onChange={set("brand")} style={inputStyle} /></Field>
      <Field label="หมวด">
        <select value={form.catCode} onChange={set("catCode")} style={inputStyle}>
          {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="สถานที่เก็บ">
        <select value={form.loc} onChange={set("loc")} style={inputStyle}>
          <option value="">— เลือกสถานที่ —</option>
          {LOCATIONS.map((l) => <option key={l.code} value={l.name}>{l.name}</option>)}
        </select>
      </Field>
      <Field label="ผู้ดูแล"><input value={form.owner} onChange={set("owner")} style={inputStyle} /></Field>
      <Field label="จำนวนปกติ"><input type="number" value={form.normal} onChange={setNum("normal")} style={inputStyle} /></Field>
      <Field label="จำนวนชำรุด"><input type="number" value={form.damaged} onChange={setNum("damaged")} style={inputStyle} /></Field>
      <Field label="ราคา/หน่วย (บาท)"><input type="number" value={form.price} onChange={setNum("price")} style={inputStyle} /></Field>
      <Field label="เตือนเมื่อเหลือ"><input type="number" value={form.minAlert} onChange={setNum("minAlert")} style={inputStyle} /></Field>
      <div className="col-span-2">
        <Field label="หมายเหตุ"><textarea rows={2} value={form.note} onChange={set("note")} style={inputStyle} /></Field>
      </div>
      <div className="col-span-2 flex justify-end mt-2">
        <Btn onClick={() => onSave(form)} disabled={!valid}>บันทึกครุภัณฑ์ใหม่</Btn>
      </div>
    </div>
  );
}

function ItemImagePopup({ item, onClose, editable, onUploaded }) {
  const s = statusOf(item);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const pick = () => fileRef.current?.click();
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(""); setUploading(true);
    try {
      const url = await uploadItemImage(item.code, file);
      onUploaded(item.code, url);
    } catch (ex) {
      setErr(ex.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,10,10,0.65)" }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: 340, background: C.white, border: `1px solid ${C.line}` }} onClick={(e) => e.stopPropagation()}>
        <div className="relative flex items-center justify-center overflow-hidden" style={{ height: 200, background: item.imageUrl ? "#000" : `linear-gradient(150deg, ${C.navyDeep}, ${C.navy})` }}>
          <button onClick={onClose} className="absolute top-2 right-2 z-10"><X size={18} color={C.white} /></button>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full" style={{ objectFit: "cover" }} />
          ) : (
            <>
              <Package size={64} color={C.accent} strokeWidth={1.25} />
              <div className="absolute bottom-2 left-2 text-[11px]" style={{ color: "#C9C9CC" }}>ยังไม่มีรูปถ่ายจริงในระบบ — แสดงไอคอนตัวแทน</div>
            </>
          )}
          {editable && (
            <button onClick={pick} disabled={uploading}
              className="absolute bottom-2 right-2 z-10 px-2.5 py-1 text-xs font-medium flex items-center gap-1"
              style={{ background: "rgba(0,0,0,0.55)", color: C.white, border: "1px solid rgba(255,255,255,0.3)" }}>
              <Plus size={12} /> {uploading ? "กำลังอัปโหลด..." : item.imageUrl ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
        {err && <div className="px-4 pt-2 text-xs" style={{ color: C.crimson }}>{err}</div>}
        <div className="p-4">
          <div className="text-xs font-mono mb-1" style={{ color: C.mute }}>{item.code}</div>
          <div className="font-bold text-base mb-1" style={{ color: C.ink }}>{item.name}</div>
          {item.brand && <div className="text-xs mb-2" style={{ color: C.slate }}>ยี่ห้อ/รุ่น: {item.brand}</div>}
          <div className="grid grid-cols-2 gap-2 text-xs mb-3" style={{ color: C.slate }}>
            <div>หมวด: <b style={{ color: C.ink }}>{catName(item.catCode)}</b></div>
            <div>สถานที่: <b style={{ color: C.ink }}>{item.loc}</b></div>
            <div>ผู้ดูแล: <b style={{ color: C.ink }}>{item.owner || "ยังไม่ระบุ"}</b></div>
            <div>สถานะ: <Pill fg={s.fg} bg={s.bg}>{s.label}</Pill></div>
          </div>
          {item.note && <div className="text-xs p-2" style={{ background: C.badBg, color: C.crimsonDeep }}>{item.note}</div>}
        </div>
      </div>
    </div>
  );
}

function ItemEditForm({ item, onSave, manager }) {
  const [normal, setNormal] = useState(item.normal);
  const [damaged, setDamaged] = useState(item.damaged);
  const [note, setNote] = useState(item.note || "");
  return (
    <div>
      <Field label="จำนวนปกติ (พร้อมใช้)">
        <input type="number" value={normal} onChange={(e) => setNormal(Number(e.target.value))} style={inputStyle} />
      </Field>
      <Field label="จำนวนชำรุด">
        <input type="number" value={damaged} onChange={(e) => setDamaged(Number(e.target.value))} style={inputStyle} />
      </Field>
      <Field label="หมายเหตุ">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={inputStyle} />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <Btn variant="primary" onClick={() => onSave({ normal, damaged, note })}>บันทึกการแก้ไข</Btn>
      </div>
      {manager && <p className="text-xs mt-3" style={{ color: C.mute }}>สิทธิ์ผู้จัดการ: การแก้ไขนี้จะถูกบันทึกใน Audit Log</p>}
    </div>
  );
}

/* ============================================================
   FACILITY
   ============================================================ */
const THAI_DAY_NOW = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

// นาทีตั้งแต่เที่ยงคืน จาก "HH:MM" — ใช้เทียบช่วงเวลาปัจจุบันกับตารางสอน
function toMinutes_(hhmm) {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// ไอคอนสถานที่ (สไตล์มินิมอลจาก lucide) — จับคู่จากคำในชื่อห้อง
function pickFacilityIcon(name) {
  const n = String(name || "");
  if (/เทควันโด|มวย|ศิลปะการต่อสู้/.test(n)) return Sword;
  if (/ปีนหน้าผา|ปีนผา/.test(n)) return Mountain;
  if (/เทเบิลเทนนิส|ปิงปอง|เทนนิส|แบดมินตัน/.test(n)) return Target;
  if (/ฟุตซอล|ฟุตบอล|บาสเกตบอล|บาส|วอลเลย์|วอลเล/.test(n)) return Circle;
  if (/กอล์ฟ/.test(n)) return Flag;
  if (/เต้น|แดนซ์|บัลเล่ต์/.test(n)) return Music;
  if (/สระ|ว่ายน้ำ/.test(n)) return Waves;
  if (/ฟิตเนส|ยิม|ยิมนาสติก/.test(n)) return Dumbbell;
  if (/อารีน่า|arena/i.test(n)) return Trophy;
  if (/สำนักงาน|ธุรการ|กิจกรรม/.test(n)) return Building2;
  if (/เก็บของ|สโตร์|store/i.test(n)) return Package;
  return Landmark;
}

function Facility({ items, schedule = [], pmSchedule = [], repairs = [], setTab }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [detailTab, setDetailTab] = useState("items");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000); // อัปเดตสถานะทุก 1 นาที
    return () => clearInterval(t);
  }, []);
  const nowDay = THAI_DAY_NOW[now.getDay()];
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const byLoc = useMemo(() => {
    const m = {};
    LOCATIONS.forEach((l) => { m[l.name] = { ...l, count: 0, ok: 0, damaged: 0 }; });
    items.forEach((i) => {
      if (!m[i.loc]) m[i.loc] = { name: i.loc, owner: i.owner, count: 0, ok: 0, damaged: 0 };
      m[i.loc].count += 1; m[i.loc].ok += i.normal; m[i.loc].damaged += i.damaged;
    });

    // สถานะสด: กำลังใช้งานอยู่ตอนนี้หรือไม่ ตามตารางสอน/ตารางใช้ห้องของสถานที่นั้น
    Object.values(m).forEach((loc) => {
      const todaysRows = schedule.filter((s) => s.loc === loc.name && s.day === nowDay);
      const current = todaysRows.find((s) => {
        const start = toMinutes_(s.start), end = toMinutes_(s.end);
        return start !== null && end !== null && nowMin >= start && nowMin < end;
      });
      const next = todaysRows
        .filter((s) => { const start = toMinutes_(s.start); return start !== null && start > nowMin; })
        .sort((a, b) => toMinutes_(a.start) - toMinutes_(b.start))[0];
      loc.current = current || null;
      loc.next = next || null;

      // สถิติการใช้งาน: จำนวนคาบ/สัปดาห์ ที่สถานที่นี้ถูกใช้ จากตารางทั้งหมด (ไม่ใช่แค่วันนี้)
      const weeklyRows = schedule.filter((s) => s.loc === loc.name);
      loc.periodsPerWeek = weeklyRows.length;
      loc.hoursPerWeek = weeklyRows.reduce((sum, s) => sum + durationHrs(s.start, s.end), 0);

      // นัดซ่อมบำรุงครั้งถัดไป: จาก pmSchedule ที่อ้างอิงชื่อสถานที่นี้ เลือกวันที่ใกล้ที่สุดที่ยังไม่ผ่าน
      const upcoming = pmSchedule
        .filter((p) => p.refName && p.refName.includes(loc.name) && p.nextDate)
        .sort((a, b) => (a.nextDate < b.nextDate ? -1 : 1))
        .find((p) => p.nextDate >= TODAY_ISO) || pmSchedule.find((p) => p.refName && p.refName.includes(loc.name));
      loc.nextMaintenance = upcoming || null;
    });

    return Object.values(m);
  }, [items, schedule, pmSchedule, nowDay, nowMin]);

  const maxPeriods = Math.max(1, ...byLoc.map((l) => l.periodsPerWeek || 0));

  return (
    <div>
      <SectionHead eyebrow="FACILITY" title="สถานที่และผู้ดูแล" sub="สถานะ Real Time · ตารางใช้ห้อง · การนัดซ่อมบำรุงและสถิติ" />
      <div className="grid grid-cols-2 gap-4">
        {byLoc.map((l) => {
          const inUse = !!l.current;
          const utilPct = Math.round(((l.periodsPerWeek || 0) / maxPeriods) * 100);
          return (
            <div key={l.name} className="p-4" style={{ background: C.white, border: `1px solid ${C.line}`, borderLeft: `3px solid ${inUse ? C.gold : (l.damaged > l.ok * 0.3 && l.ok > 0 ? C.crimson : C.ok)}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {(() => { const Ico = pickFacilityIcon(l.name); return <Ico size={16} strokeWidth={1.5} className="shrink-0" style={{ color: C.navy }} />; })()}
                  <button className="font-bold text-sm truncate text-left" style={{ color: C.ink }} onClick={() => { setSelectedLocation(l); setDetailTab("items"); }}>{l.name}</button>
                </div>
                {inUse ? (
                  <Pill fg={C.crimsonDeep} bg={C.badBg}><span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: C.crimson }} />กำลังใช้งาน</Pill>
                ) : (
                  <Pill fg={C.ok} bg={C.okBg}>ว่าง</Pill>
                )}
              </div>
              <div className="text-xs mb-1" style={{ color: C.slate }}>ผู้ดูแล: {l.owner || "ยังไม่ระบุ"}</div>
              {inUse ? (
                <div className="text-xs mb-2" style={{ color: C.crimsonDeep }}>
                  {l.current.subject || "ใช้งาน"} · {l.current.teacher || "-"} · {l.current.start}–{l.current.end}
                </div>
              ) : l.next ? (
                <div className="text-xs mb-2" style={{ color: C.slate }}>คาบถัดไปวันนี้: {l.next.start} · {l.next.subject || "-"}</div>
              ) : (
                <div className="text-xs mb-2" style={{ color: C.mute }}>ไม่มีคาบใช้งานวันนี้แล้ว</div>
              )}

              <div className="flex items-center justify-between text-sm mb-3">
                <div><span className="font-bold">{l.count}</span> <span className="text-xs" style={{ color: C.mute }}>รายการ</span></div>
                <div style={{ color: C.ok }}><span className="font-bold">{l.ok}</span> <span className="text-xs">ใช้ได้</span></div>
                <div style={{ color: C.crimson }}><span className="font-bold">{l.damaged}</span> <span className="text-xs">ชำรุด</span></div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1" style={{ color: C.slate }}>
                  <span>สถิติการใช้งาน</span>
                  <span>{l.periodsPerWeek || 0} คาบ/สัปดาห์ · {l.hoursPerWeek.toFixed(1)} ชม./สัปดาห์</span>
                </div>
                <div className="h-1.5 w-full" style={{ background: C.line }}>
                  <div className="h-1.5" style={{ width: `${utilPct}%`, background: C.navy }} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs pt-2" style={{ borderTop: `1px dashed ${C.line}`, color: l.nextMaintenance ? C.warn : C.mute }}>
                <Wrench size={12} className="shrink-0" />
                {l.nextMaintenance
                  ? <span>นัดซ่อมบำรุงถัดไป: <b>{l.nextMaintenance.nextDate}</b> ({l.nextMaintenance.cycle || "-"})</span>
                  : <span>ยังไม่มีนัดซ่อมบำรุงล่วงหน้า</span>}
                {setTab && (
                  <button className="ml-auto underline" style={{ color: C.navy }} onClick={() => setTab("maintenance")}>ดูรายละเอียด</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selectedLocation && (
        <Modal title={selectedLocation.name} onClose={() => setSelectedLocation(null)} wide>
          <div className="text-xs mb-3" style={{ color: C.slate }}>ผู้ดูแล: {selectedLocation.owner || "ยังไม่ระบุ"}</div>
          <div className="flex mb-4" style={{ borderBottom: `1px solid ${C.line}` }}>
            {[['items', 'ครุภัณฑ์ของห้อง'], ['maintenance', 'ซ่อมบำรุง']].map(([key, label]) => (
              <button key={key} className="px-3 py-2 text-sm font-semibold" onClick={() => setDetailTab(key)}
                style={{ color: detailTab === key ? C.crimson : C.slate, borderBottom: detailTab === key ? `2px solid ${C.crimson}` : "2px solid transparent" }}>{label}</button>
            ))}
          </div>
          {detailTab === "items" ? (() => {
            const roomItems = items.filter((item) => item.loc === selectedLocation.name);
            return roomItems.length ? (
              <div className="table-scroll"><table className="w-full text-sm">
                <thead><tr style={{ color: C.slate }}>{["รหัส", "รายการ", "ปกติ", "ชำรุด", "ผู้ดูแล"].map((h) => <th key={h} className="text-left px-2 py-2 text-xs">{h}</th>)}</tr></thead>
                <tbody>{roomItems.map((item) => <tr key={item.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-2 py-2 text-xs font-mono">{item.code}</td><td className="px-2 py-2">{item.name}</td>
                  <td className="px-2 py-2" style={{ color: C.ok }}>{item.normal}</td><td className="px-2 py-2" style={{ color: item.damaged ? C.crimson : C.slate }}>{item.damaged}</td><td className="px-2 py-2 text-xs">{item.owner || "-"}</td>
                </tr>)}</tbody>
              </table></div>
            ) : <div className="py-8 text-center text-sm" style={{ color: C.mute }}>ยังไม่มีครุภัณฑ์ที่ระบุห้องนี้</div>;
          })() : (() => {
            const locationRepairs = repairs.filter((repair) => repair.refName?.includes(selectedLocation.name) || repair.ref === selectedLocation.code);
            const locationPm = pmSchedule.filter((entry) => entry.refName?.includes(selectedLocation.name) || entry.ref === selectedLocation.code);
            return locationRepairs.length || locationPm.length ? <div className="space-y-4">
              {locationRepairs.length > 0 && <div><h3 className="text-xs font-bold mb-2" style={{ color: C.navy }}>ประวัติการซ่อม</h3><div className="space-y-2">{locationRepairs.map((repair) => <div key={repair.id} className="p-3 text-sm" style={{ background: C.paper }}><div className="flex justify-between gap-2"><b>{repair.description || repair.refName}</b><span className="text-xs" style={{ color: C.mute }}>{repair.date}</span></div><div className="text-xs mt-1" style={{ color: C.slate }}>ค่าใช้จ่าย {repair.cost.toLocaleString()} บาท · {repair.status || "ไม่ระบุสถานะ"}</div></div>)}</div></div>}
              {locationPm.length > 0 && <div><h3 className="text-xs font-bold mb-2" style={{ color: C.navy }}>แผนซ่อมบำรุง</h3><div className="space-y-2">{locationPm.map((entry) => <div key={entry.id} className="p-3 text-sm" style={{ background: C.paper }}><div className="flex justify-between gap-2"><b>{entry.cycle || "ตรวจบำรุง"}</b><span className="text-xs" style={{ color: C.warn }}>{entry.nextDate}</span></div><div className="text-xs mt-1" style={{ color: C.slate }}>ผู้รับผิดชอบ: {entry.owner || "ยังไม่ระบุ"}{entry.note ? ` · ${entry.note}` : ""}</div></div>)}</div></div>}
            </div> : <div className="py-8 text-center text-sm" style={{ color: C.mute }}>ยังไม่มีรายการซ่อมหรือแผนซ่อมบำรุงของห้องนี้</div>;
          })()}
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   STAFF DIRECTORY — safe subset only (name, dept, role, work phone)
   Full HR data (ID card, salary, address, DOB, religion) is kept
   OUT of this system entirely — delivered separately as an
   internal-only spreadsheet, never wired into the web app or the
   Google Sheets backend.
   ============================================================ */
function StaffDirectory({ staff, schedule = [], setStaffList, user, logAction }) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("ALL");
  const [edit, setEdit] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [resetPw, setResetPw] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const manager = canManage(user.role);
  const isHead = user.role === "L3"; // จัดการรหัสผ่านได้เฉพาะหัวหน้า
  const depts = useMemo(() => Array.from(new Set(staff.map((s) => s.dept))), [staff]);
  const filtered = staff.filter((s) =>
    (dept === "ALL" || s.dept === dept) &&
    (s.name.toLowerCase().includes(q.toLowerCase()) || s.role.toLowerCase().includes(q.toLowerCase()))
  );

  const saveEdit = (patch) => {
    setStaffList((prev) => prev.map((s) => (s.id === edit.id ? { ...s, ...patch } : s)));
    logAction(`แก้ไขบุคลากร ${edit.id} — ${edit.name}`);
    postToSheets("updateStaff", { id: edit.id, ...patch });
    setEdit(null);
  };

  const addStaff = (form) => {
    setStaffList((prev) => [{ ...form }, ...prev]);
    logAction(`เพิ่มบุคลากรใหม่ ${form.id} — ${form.name}`);
    postToSheets("addStaff", form);
    setShowNew(false);
  };

  const deleteStaff = (s) => {
    setStaffList((prev) => prev.filter((x) => x.id !== s.id));
    logAction(`ลบบุคลากร ${s.id} — ${s.name}`);
    postToSheets("deleteStaff", { id: s.id });
    setConfirmDel(null);
  };

  return (
    <div>
      <SectionHead eyebrow="STAFF DIRECTORY" title="ทำเนียบบุคลากรศูนย์กีฬา"
        sub={`${filtered.length} คน จากทั้งหมด ${staff.length} คน — แสดงเฉพาะชื่อ/หน่วยงาน/หน้าที่/เบอร์ติดต่องาน (ไม่มีข้อมูลอ่อนไหว)`}
        right={manager ? <Btn onClick={() => setShowNew(true)} icon={Plus}>เพิ่มบุคลากร</Btn> : <Pill fg={C.gold} bg={C.goldSoft}><Eye size={12} /> ดูอย่างเดียว</Pill>} />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: C.mute }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อหรือหน้าที่..."
            style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ ...inputStyle, width: 220 }}>
          <option value="ALL">ทุกหน่วยงาน</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((s) => (
          <div key={s.id} role="button" tabIndex={0} onClick={() => setSelectedStaff(s)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedStaff(s); } }} className="w-full p-4 text-left cursor-pointer" style={{ background: C.white, border: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: C.navy, color: C.white }}>
                  <User size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: C.ink }}>{s.name}</div>
                  <div className="text-xs" style={{ color: C.mute }}>{s.dept}</div>
                </div>
              </div>
              {manager && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {isHead && <button onClick={(e) => { e.stopPropagation(); setResetPw(s); }} title="รีเซ็ตรหัสผ่าน"><KeyRound size={13} style={{ color: C.gold }} /></button>}
                  <button onClick={(e) => { e.stopPropagation(); setEdit(s); }}><Pencil size={13} style={{ color: C.navy }} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDel(s); }}><X size={13} style={{ color: C.crimson }} /></button>
                </div>
              )}
            </div>
            <div className="text-xs mb-1" style={{ color: C.slate }}>{s.role || "-"}</div>
            <div className="flex items-center justify-between">
              {s.phone && <div className="text-xs font-mono" style={{ color: C.navySoft }}>{s.phone}</div>}
              {s.level && <Pill fg={ROLE_META[s.level]?.tint || C.navy} bg="#F2F3F7">{s.level}</Pill>}
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <Modal title={`แก้ไขบุคลากร: ${edit.name}`} onClose={() => setEdit(null)}>
          <StaffForm initial={edit} onSave={saveEdit} idEditable={false} />
        </Modal>
      )}
      {selectedStaff && (
        <Modal title={selectedStaff.name} onClose={() => setSelectedStaff(null)} wide>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: C.navy, color: C.white }}>
              {selectedStaff.photoUrl ? <img src={selectedStaff.photoUrl} alt="" className="w-full h-full" style={{ objectFit: "cover" }} /> : <User size={22} />}
            </div>
            <div><div className="text-sm font-semibold">{selectedStaff.role || "บุคลากร"}</div><div className="text-xs" style={{ color: C.slate }}>{selectedStaff.dept || "ไม่ระบุหน่วยงาน"} · {selectedStaff.phone || "ไม่มีเบอร์ติดต่อ"}</div></div>
          </div>
          <h3 className="text-sm font-bold mb-2" style={{ color: C.navy }}>ตารางสอน</h3>
          {(() => {
            const rows = schedule.filter((entry) => normTeacherName(entry.teacher) === normTeacherName(selectedStaff.name) && entry.period !== "AS").sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start.localeCompare(b.start));
            return rows.length ? <div className="table-scroll"><table className="w-full text-sm"><thead><tr style={{ color: C.slate }}>{["วัน", "เวลา", "วิชา/กิจกรรม", "สถานที่", "กลุ่ม"].map((h) => <th key={h} className="text-left px-2 py-2 text-xs">{h}</th>)}</tr></thead><tbody>{rows.map((entry) => <tr key={entry.id} style={{ borderTop: `1px solid ${C.line}` }}><td className="px-2 py-2">{entry.day}</td><td className="px-2 py-2 font-mono text-xs">{entry.start}–{entry.end}</td><td className="px-2 py-2">{entry.subject || "-"}</td><td className="px-2 py-2">{entry.loc || "-"}</td><td className="px-2 py-2">{entry.group || "-"}</td></tr>)}</tbody></table></div> : <div className="py-6 text-center text-sm" style={{ color: C.mute }}>ไม่พบตารางสอนของบุคลากรคนนี้</div>;
          })()}
        </Modal>
      )}
      {showNew && (
        <Modal title="เพิ่มบุคลากรใหม่" onClose={() => setShowNew(false)}>
          <StaffForm initial={{ id: "", name: "", dept: "", role: "", phone: "", level: "L1" }} onSave={addStaff} idEditable />
        </Modal>
      )}
      {resetPw && <ResetPasswordModal admin={user} target={resetPw} onClose={() => setResetPw(null)} logAction={logAction} />}
      {confirmDel && (
        <Modal title="ยืนยันการลบ" onClose={() => setConfirmDel(null)}>
          <p className="text-sm mb-4" style={{ color: C.ink }}>ต้องการลบ <b>{confirmDel.name}</b> ออกจากทำเนียบบุคลากรใช่หรือไม่? การลบนี้จะลบแถวออกจาก Google Sheet ด้วย และย้อนกลับไม่ได้</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setConfirmDel(null)}>ยกเลิก</Btn>
            <Btn variant="crimson" onClick={() => deleteStaff(confirmDel)} icon={X}>ยืนยันลบ</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StaffForm({ initial, onSave, idEditable }) {
  const [form, setForm] = useState(initial);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.id.trim() && form.name.trim();
  return (
    <div>
      <Field label="Teacher ID *"><input value={form.id} onChange={set("id")} disabled={!idEditable} style={{ ...inputStyle, opacity: idEditable ? 1 : 0.6 }} /></Field>
      <Field label="ชื่อ-นามสกุล *"><input value={form.name} onChange={set("name")} style={inputStyle} /></Field>
      <Field label="หน่วยงาน"><input value={form.dept} onChange={set("dept")} style={inputStyle} /></Field>
      <Field label="หน้าที่รับผิดชอบ"><input value={form.role} onChange={set("role")} style={inputStyle} /></Field>
      <Field label="เบอร์โทรงาน"><input value={form.phone} onChange={set("phone")} style={inputStyle} /></Field>
      <Field label="สิทธิ์การใช้งาน (Level)">
        <select value={form.level} onChange={set("level")} style={inputStyle}>
          {["L0", "L1", "L2", "L3", "L4"].map((l) => <option key={l} value={l}>{l} — {ROLE_META[l].label}</option>)}
        </select>
      </Field>
      <div className="flex justify-end mt-2">
        <Btn onClick={() => onSave(form)} disabled={!valid}>บันทึก</Btn>
      </div>
    </div>
  );
}

/* ============================================================
   SCHEDULE / WORKLOAD — reads & writes "7.ตารางสอน"
   L0: no access. L1/L2: own schedule only, read-only.
   L3: everyone's schedule — add/assign duty, edit, delete,
   with day+location overlap conflict checking. L4: view all.
   ============================================================ */
const DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

function durationHrs(start, end) {
  const [sh, sm] = (start || "0:0").split(":").map(Number);
  const [eh, em] = (end || "0:0").split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function ScheduleView({ user, schedule, setSchedule, staffList, tasks = [], logAction, warnings = [], loaded = true, combinedSport = [] }) {
  const manager = canManage(user.role);
  const [showNew, setShowNew] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [conflict, setConflict] = useState(null); // { form, with }
  const [budget, setBudget] = useState({ budgets: [], loaded: false });
  const [editRow, setEditRow] = useState(null); // แถวที่กำลังแก้ไขรายครั้งในมุมมองกริด
  // สิทธิ์การดู:
  //  L1/L2 — เห็นเฉพาะตารางสอนของตัวเองเท่านั้น (ไม่มีตารางรวมทุกคน)
  //  L3 หัวหน้า — สลับได้ระหว่าง "ตารางของฉัน" กับ "ตารางรวมกีฬา"
  //  L4 ผู้บริหาร — เห็น "ตารางรวมกีฬา" (ดูอย่างเดียว)
  const hasOwnSchedule = user.role === "L1" || user.role === "L2" || manager;
  const canSeeSport = manager || user.role === "L4";
  const myPeriodCount = useMemo(
    () => schedule.filter((s) => normTeacherName(s.teacher) === normTeacherName(user.name)).length,
    [schedule, user.name]
  );
  // หัวหน้าที่ไม่มีคาบสอนของตัวเอง — เปิดหน้าให้เจอ "ตารางรวมกีฬา" เลย
  const [managerViewMine, setManagerViewMine] = useState(() => !manager || myPeriodCount > 0);
  useEffect(() => { if (manager) setManagerViewMine(myPeriodCount > 0); }, [manager, myPeriodCount]);
  const mine = hasOwnSchedule && (!manager || managerViewMine);
  // เทียบชื่อครูแบบตัดคำนำหน้าออกก่อน (นาย/น.ส./มิส/ม./ครู ฯลฯ) เพราะชื่อครูผู้สอนที่
  // ดึงมาจากชีตตารางสอน (เช่น "ม.ชาญวิทย์ พึ่งอิ่ม") อาจสะกดคำนำหน้าไม่ตรงกับชื่อที่
  // login เข้ามา (เช่น "นายชาญวิทย์ พึ่งอิ่ม" จากชีตบุคลากร)
  const sportRows = useMemo(() => schedule.filter((s) => !isRoomScheduleRow(s)), [schedule]);
  const rows = mine
    ? schedule.filter((s) => normTeacherName(s.teacher) === normTeacherName(user.name))
    : canSeeSport ? combinedSport : [];

  // งานอื่นที่หัวหน้ามอบหมาย (ไม่ใช่คาบสอน) — จาก Work Management, กรองเฉพาะที่ assign ให้ฉัน
  const myOtherTasks = useMemo(
    () => tasks.filter((t) => t.assignee === user.name && t.status !== "COMPLETED" && t.status !== "CANCELLED"),
    [tasks, user.name]
  );

  // โครงการ/งบประมาณที่รับผิดชอบ — โหลดจาก Budget module เฉพาะตอนเป็นมุมมองส่วนตัว
  useEffect(() => {
    if (!mine || !API_URL) return;
    loadBudgetData(user.id).then((d) => {
      setBudget({ budgets: (d.budgets || []).filter((b) => b.owner === user.name), loaded: true });
    }).catch(() => setBudget({ budgets: [], loaded: true }));
  }, [mine, user.id, user.name]);

  const workload = useMemo(() => {
    const m = {};
    sportRows.forEach((s) => {
      m[s.teacher] = m[s.teacher] || { teacher: s.teacher, periods: 0, hours: 0 };
      m[s.teacher].periods += 1;
      m[s.teacher].hours += durationHrs(s.start, s.end);
    });
    return Object.values(m).sort((a, b) => b.hours - a.hours);
  }, [sportRows]);

  const submitSchedule = async (form, force) => {
    try {
      const result = await postToSheetsAwait("addSchedule", { ...form, force });
      if (result.conflict && !force) { setConflict({ form, with: result.with }); return; }
      const rec = { id: `SC-${Date.now()}`, ...form };
      setSchedule((prev) => [...prev, rec]);
      logAction(`เพิ่มตารางสอน/มอบหมายงาน — ${form.teacher} วัน${form.day} ${form.start}-${form.end}`);
      setShowNew(false); setConflict(null);
    } catch (e) {
      alert(e.message || "บันทึกไม่สำเร็จ");
    }
  };

  const deleteRow = async (row) => {
    try {
      await postToSheetsAwait("deleteSchedule", { row: row._row });
      setSchedule((prev) => prev.filter((x) => x.id !== row.id));
      logAction(`ลบตารางสอน — ${row.teacher} วัน${row.day} ${row.start}-${row.end}`);
    } catch (e) { alert(e.message || "ลบไม่สำเร็จ"); }
    setConfirmDel(null);
  };

  const submitEditSchedule = async (form) => {
    try {
      await postToSheetsAwait("updateSchedule", { row: editRow._row, ...form });
      setSchedule((prev) => prev.map((x) => (x._row === editRow._row ? { ...x, ...form } : x)));
      logAction(`แก้ไขตารางสอน — ${form.teacher || editRow.teacher} วัน${form.day} ${form.start}-${form.end}`);
      setEditRow(null);
    } catch (e) {
      alert(e.message || "แก้ไขไม่สำเร็จ");
    }
  };

  return (
    <div>
      <SectionHead eyebrow="SCHEDULE" title={mine ? "ตารางสอนของฉัน" : "ตารางรวมกีฬา"}
        sub={mine ? `${rows.length} คาบ/สัปดาห์ — เห็นเฉพาะตารางของคุณเอง` : `${rows.length} คาบ — จากชีต "ตารางรวมกีฬา" พร้อมกีฬาที่สอนในแต่ละคาบ`}
        right={
          <div className="flex items-center gap-2">
            {manager && (
              <div className="flex items-center" style={{ border: `1px solid ${C.line}` }}>
                <button onClick={() => setManagerViewMine(true)}
                  className="px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={managerViewMine ? { background: C.navy, color: C.white } : { background: C.white, color: C.slate }}>
                  ตารางของฉัน
                </button>
                <button onClick={() => setManagerViewMine(false)}
                  className="px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={!managerViewMine ? { background: C.navy, color: C.white } : { background: C.white, color: C.slate }}>
                  ตารางรวมกีฬา
                </button>
              </div>
            )}
            {manager && !mine && <Btn onClick={() => setShowNew(true)} icon={Plus}>เพิ่มคาบ/มอบหมายงาน</Btn>}
          </div>
        } />

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm mb-6" style={{ color: C.mute, border: `1px dashed ${C.line}`, background: C.white }}>
          {!loaded ? "กำลังโหลดตารางสอน…" : !mine ? "ไม่พบข้อมูลในชีต \"ตารางรวมกีฬา\"" : mine ? "ยังไม่มีตารางสอนของคุณในระบบ — รอผู้ดูแลนำเข้าข้อมูล หรือมอบหมายงานให้" : "ยังไม่มีข้อมูลตารางรวมกีฬาในระบบ"}
        </div>
      ) : mine ? (
        <ScheduleGrid rows={rows} onEdit={(s) => setEditRow(s)} onDelete={(s) => setConfirmDel(s)} />
      ) : (
        <SportScheduleBoard rows={rows} />
      )}

      {mine && (myOtherTasks.length > 0 || budget.budgets.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {myOtherTasks.length > 0 && (
            <div className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: C.navy }}>
                <ClipboardList size={14} /> งานอื่นที่ได้รับมอบหมาย
              </h3>
              <div className="space-y-2">
                {myOtherTasks.map((t) => (
                  <div key={t.id} className="px-3 py-2 flex items-center justify-between gap-2" style={{ border: `1px solid ${C.line}` }}>
                    <div className="min-w-0">
                      <div className="text-sm truncate" style={{ color: C.ink }}>{t.title}</div>
                      <div className="text-xs" style={{ color: C.mute }}>{t.location || "-"}{t.dueDate ? ` · กำหนด ${t.dueDate}` : ""}</div>
                    </div>
                    <Pill fg={taskStatusDisplay(t).fg} bg={taskStatusDisplay(t).bg}>{taskStatusDisplay(t).label}</Pill>
                  </div>
                ))}
              </div>
            </div>
          )}
          {budget.budgets.length > 0 && (
            <div className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: C.navy }}>
                <DollarSign size={14} /> งบประมาณ/โครงการที่รับผิดชอบ
              </h3>
              <div className="space-y-2">
                {budget.budgets.map((b) => (
                  <div key={b.id} className="px-3 py-2 flex items-center justify-between gap-2" style={{ border: `1px solid ${C.line}` }}>
                    <div className="min-w-0">
                      <div className="text-sm truncate" style={{ color: C.ink }}>{b.name}</div>
                      <div className="text-xs" style={{ color: C.mute }}>{b.startDate || "-"} – {b.endDate || "-"}</div>
                    </div>
                    <div className="text-xs font-semibold shrink-0" style={{ color: C.navy }}>{b.amount.toLocaleString()} บาท</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {manager && !mine && workload.length > 0 && (
        <div className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: C.navy }}>ภาระงานรวมรายบุคคล (Workload)</h3>
          <div className="grid grid-cols-2 gap-3">
            {workload.map((w) => (
              <div key={w.teacher} className="flex items-center justify-between px-3 py-2" style={{ border: `1px solid ${C.line}` }}>
                <span className="text-sm truncate" style={{ color: C.ink }}>{w.teacher}</span>
                <span className="text-xs shrink-0" style={{ color: C.slate }}>{w.periods} คาบ · {w.hours.toFixed(1)} ชม./สัปดาห์</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && (
        <Modal title="เพิ่มคาบสอน หรือ มอบหมายงาน" onClose={() => setShowNew(false)} wide>
          <ScheduleForm staffList={staffList} onSubmit={(form) => submitSchedule(form, false)} />
        </Modal>
      )}
      {conflict && (
        <Modal title="เวลาซ้อนทับ ⚠️" onClose={() => setConflict(null)}>
          <p className="text-sm mb-3" style={{ color: C.ink }}>
            ช่วงเวลานี้ที่ <b>{conflict.form.loc}</b> วัน<b>{conflict.form.day}</b> ซ้อนกับ:
          </p>
          <div className="p-3 mb-4 text-sm" style={{ background: C.badBg, color: C.crimsonDeep }}>
            {conflict.with.teacher} — {conflict.with.subject} ({conflict.with.start}–{conflict.with.end})
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setConflict(null)}>ยกเลิก แก้เวลาใหม่</Btn>
            <Btn variant="crimson" onClick={() => submitSchedule(conflict.form, true)}>ยืนยันบันทึกทับซ้อน</Btn>
          </div>
        </Modal>
      )}
      {confirmDel && (
        <Modal title="ยืนยันการลบ" onClose={() => setConfirmDel(null)}>
          <p className="text-sm mb-4" style={{ color: C.ink }}>ลบคาบ <b>{confirmDel.subject}</b> ของ <b>{confirmDel.teacher}</b> วัน{confirmDel.day} {confirmDel.start}-{confirmDel.end} ใช่หรือไม่?</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setConfirmDel(null)}>ยกเลิก</Btn>
            <Btn variant="crimson" onClick={() => deleteRow(confirmDel)} icon={X}>ยืนยันลบ</Btn>
          </div>
        </Modal>
      )}
      {editRow && (
        <Modal title="แก้ไขคาบสอนครั้งนี้" onClose={() => setEditRow(null)} wide>
          <ScheduleForm staffList={staffList} initial={editRow} submitLabel="บันทึกการแก้ไข" onSubmit={submitEditSchedule} />
        </Modal>
      )}
    </div>
  );
}

// ตารางของห้อง/สถานที่ (ไม่ใช่ครู) และงานดูแลห้อง — ไม่นำมารวมใน "ตารางรวมกีฬา"
const ROOM_SCHEDULE_RE = /^(ห้อง|สนาม|สระ|ศูนย์|จัดเก็บ|คลัง|ลาน|อาคาร|โรงยิม|อารีน่า|ยิม)/;
function isRoomScheduleRow(s) {
  const who = normTeacherName(s.teacher);
  return ROOM_SCHEDULE_RE.test(who) || /ดูแลห้อง|จัดเก็บ/.test(s.subject || "");
}

// ตารางรวมกีฬา — เลือกวัน แล้วแสดงทุกคาบของวันนั้น เรียงตามเวลา (อ่านง่ายบนมือถือ)
function SportScheduleBoard({ rows }) {
  const dayList = DAYS.slice(0, 6);
  const todayName = DAYS[(new Date().getDay() + 6) % 7];
  const [day, setDay] = useState(dayList.includes(todayName) ? todayName : dayList[0]);
  const [sport, setSport] = useState("");

  // สรุปกีฬาที่มีการสอนทั้งสัปดาห์: จำนวนคาบ + ครูผู้สอน + สถานที่
  const sportSummary = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => (r.sports || []).forEach((sp) => {
      const x = m.get(sp.name) || { name: sp.name, periods: 0, teachers: new Set(), rooms: new Set(), days: new Set() };
      x.periods += 1; x.teachers.add(sp.teacher); if (sp.room) x.rooms.add(sp.room); x.days.add(r.day);
      m.set(sp.name, x);
    }));
    return [...m.values()].sort((a, b) => b.periods - a.periods);
  }, [rows]);

  const match = (r) => !sport || (r.sports || []).some((sp) => sp.name === sport);
  const dayRows = rows.filter((r) => r.day === day && match(r)).sort((a, b) => a.start.localeCompare(b.start));
  const countOf = (d) => rows.filter((r) => r.day === d && match(r)).length;

  return (
    <div className="mb-6">
      {sportSummary.length > 0 && (
        <div className="p-3 mb-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
          <div className="text-sm font-bold mb-2 flex items-center gap-1.5" style={{ color: C.navy }}><Trophy size={14} /> กีฬาที่มีการสอน ({sportSummary.length} กีฬา)</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSport("")} className="px-2.5 py-1.5 text-xs font-semibold"
              style={!sport ? { background: C.navy, color: C.white } : { background: C.white, color: C.slate, border: `1px solid ${C.line}` }}>ทั้งหมด</button>
            {sportSummary.map((x) => (
              <button key={x.name} onClick={() => setSport(sport === x.name ? "" : x.name)} className="px-2.5 py-1.5 text-left"
                style={sport === x.name ? { background: C.crimson, color: C.white } : { background: C.paper, color: C.ink, border: `1px solid ${C.line}` }}>
                <div className="text-xs font-bold">{x.name} <span style={{ opacity: 0.75 }}>· {x.periods} คาบ/สัปดาห์</span></div>
                <div className="text-[10px]" style={{ opacity: 0.8 }}>{[...x.teachers].join(", ")}{x.rooms.size ? ` · ${[...x.rooms].join(", ")}` : ""}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {dayList.map((d) => (
          <button key={d} onClick={() => setDay(d)} className="px-3 py-1.5 text-xs font-semibold shrink-0"
            style={d === day ? { background: dayColor(d).bar, color: C.white } : { background: dayColor(d).bg, color: dayColor(d).fg, border: `1px solid ${dayColor(d).bar}` }}>
            {d} <span style={{ opacity: 0.7 }}>({countOf(d)})</span>
          </button>
        ))}
      </div>

      {dayRows.length === 0 ? (
        <div className="p-6 text-center text-sm" style={{ color: C.mute, border: `1px dashed ${C.line}`, background: C.white }}>ไม่มีคาบ{sport ? ` ${sport}` : ""}ในวัน{day}</div>
      ) : (
        <div className="space-y-2">
          {dayRows.map((r) => {
            const col = dayColor(r.day);
            return (
              <div key={r.id} style={{ background: col.bg, borderLeft: `4px solid ${col.bar}` }}>
                <div className="px-3 pt-2 flex items-baseline justify-between gap-2">
                  <div className="text-xs font-bold font-mono" style={{ color: col.fg }}>
                    {r.period === "AS" ? "After School" : `คาบ ${r.period}`} · {r.start}–{r.end}
                  </div>
                  <div className="text-[11px]" style={{ color: col.fg, opacity: 0.8 }}>{r.classes.length} ห้อง</div>
                </div>
                <div className="px-3 text-[11px]" style={{ color: col.fg }}>ห้องเรียน: {r.group || "-"}</div>
                <div className="px-3 pb-2 pt-1.5 flex flex-wrap gap-1.5">
                  {(r.sports || []).length === 0 ? (
                    <span className="text-[11px]" style={{ color: col.fg, opacity: 0.7 }}>ยังไม่พบครู/กีฬาที่ตรงกับคาบนี้ในแท็บรายคน</span>
                  ) : r.sports.map((sp) => (
                    <span key={sp.teacher} className="px-2 py-1 text-[11px]" title={sp.classes.join(", ")}
                      style={{ background: C.white, color: col.fg, border: `1px solid ${col.bar}`, fontWeight: sp.name === sport ? 700 : 500 }}>
                      <b>{sp.name}</b> · {sp.teacher}{sp.room ? ` · ${sp.room}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScheduleForm({ staffList, onSubmit, initial, submitLabel = "บันทึก" }) {
  const [form, setForm] = useState({ day: DAYS[0], start: "08:00", end: "09:00", subject: "", teacher: "", loc: "", group: "", equipment: "", qty: "", note: "", ...(initial || {}) });
  const [isDuty, setIsDuty] = useState(initial ? initial.subject === "ดูแลห้อง" : false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.teacher.trim() && form.loc.trim() && form.subject.trim();
  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <label className="flex items-center gap-1.5 text-xs" style={{ color: C.slate }}>
          <input type="radio" checked={!isDuty} onChange={() => { setIsDuty(false); setForm((f) => ({ ...f, subject: "" })); }} /> คาบสอนปกติ
        </label>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: C.slate }}>
          <input type="radio" checked={isDuty} onChange={() => { setIsDuty(true); setForm((f) => ({ ...f, subject: "ดูแลห้อง" })); }} /> มอบหมายดูแลห้อง/สถานที่ (นับเป็น workload)
        </label>
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="ครูผู้รับผิดชอบ *">
          <select value={form.teacher} onChange={set("teacher")} style={inputStyle}>
            <option value="">— เลือกบุคลากร —</option>
            {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="สถานที่ *">
          <select value={form.loc} onChange={set("loc")} style={inputStyle}>
            <option value="">— เลือกสถานที่ —</option>
            {LOCATIONS.map((l) => <option key={l.code} value={l.name}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="วัน">
          <select value={form.day} onChange={set("day")} style={inputStyle}>
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="เวลาเริ่ม"><input type="time" value={form.start} onChange={set("start")} style={inputStyle} /></Field>
          <Field label="เวลาจบ"><input type="time" value={form.end} onChange={set("end")} style={inputStyle} /></Field>
        </div>
        <div className="col-span-2">
          <Field label={isDuty ? "รายละเอียดงาน" : "วิชา/กิจกรรม *"}>
            <input value={form.subject} onChange={set("subject")} disabled={isDuty} style={{ ...inputStyle, opacity: isDuty ? 0.7 : 1 }} placeholder={isDuty ? "ดูแลห้อง" : "เช่น พลศึกษา ป.4"} />
          </Field>
        </div>
        <Field label="กลุ่ม/ระดับชั้น"><input value={form.group} onChange={set("group")} style={inputStyle} /></Field>
        <Field label="อุปกรณ์ที่ใช้ (ถ้ามี)"><input value={form.equipment} onChange={set("equipment")} style={inputStyle} /></Field>
        <div className="col-span-2">
          <Field label="หมายเหตุ"><textarea rows={2} value={form.note} onChange={set("note")} style={inputStyle} /></Field>
        </div>
        <div className="col-span-2 flex justify-end mt-2">
          <Btn onClick={() => onSubmit(form)} disabled={!valid}>{submitLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

// สีประจำวัน: จันทร์เหลือง อังคารชมพู พุธเขียว พฤหัสส้ม ศุกร์ฟ้า เสาร์ม่วง (อาทิตย์แดง)
const DAY_COLORS = {
  "จันทร์": { bg: "#FFF6CC", fg: "#7A5A00", bar: "#E6B800" },
  "อังคาร": { bg: "#FCE4EF", fg: "#9E2A5E", bar: "#E0609A" },
  "พุธ": { bg: "#E3F5E6", fg: "#1E6B3F", bar: "#3DAA63" },
  "พฤหัสบดี": { bg: "#FFE9D6", fg: "#9A4A0B", bar: "#F08A2E" },
  "ศุกร์": { bg: "#E0F2FC", fg: "#135E86", bar: "#3BA7DE" },
  "เสาร์": { bg: "#EFE5FB", fg: "#5B3B9E", bar: "#8E5BD6" },
  "อาทิตย์": { bg: "#FBE3E3", fg: "#8C1C1C", bar: "#D9423F" },
};
function dayColor(day) { return DAY_COLORS[day] || DAY_COLORS["จันทร์"]; }

// ตารางสอนแบบกริด (วัน x คาบ) สำหรับมุมมอง "ตารางสอนของฉัน" — คลิกที่คาบซึ่งเพิ่มเอง
// ในระบบ (มี _row) เพื่อแก้ไข/ลบรายครั้งได้ทันที ส่วนคาบที่ดึงมาจากชีตตารางสอนกลาง
// อัตโนมัติ (ไม่มี _row) จะดูได้อย่างเดียว เพราะแก้ที่นี่แล้วจะไม่สะท้อนกลับไปต้นทาง
// คาบเรียนเต็มวัน 08:10–16:00 (คาบ 1–9 ไม่รวม After School) ให้ตรงกับ PERIOD_TIMES_ ฝั่ง Code.gs
// ใช้เป็นแกนเวลาคงที่ของตาราง เพื่อให้เห็นทุกคาบทุกวันแม้ช่องนั้นจะว่าง ไม่ใช่แสดงเฉพาะ
// คาบ/วันที่มีข้อมูลเท่านั้น
const FULL_DAY_SLOTS = [
  ["08:10", "09:00"], ["09:00", "09:50"], ["10:00", "10:50"], ["10:50", "11:40"],
  ["11:40", "12:30"], ["12:30", "13:20"], ["13:20", "14:10"], ["14:10", "15:00"],
  ["15:10", "16:00"],
].map(([start, end]) => ({ start, end }));

const AFTER_SCHOOL_SLOT = { start: "16:30", end: "18:00" };

function ScheduleGrid({ rows, onEdit, onDelete }) {
  const dayList = DAYS.slice(0, 6); // จันทร์–เสาร์ เสมอ ไม่ว่าวันนั้นจะมีคาบหรือไม่
  // 08:10–16:00 เสมอ + แถว After School (16:30–18:00) เฉพาะเมื่อมีคาบนอกเวลา
  const slots = rows.some((r) => r.start === AFTER_SCHOOL_SLOT.start && r.end === AFTER_SCHOOL_SLOT.end)
    ? [...FULL_DAY_SLOTS, AFTER_SCHOOL_SLOT] : FULL_DAY_SLOTS;

  return (
    <div className="mb-6 overflow-x-auto" style={{ border: `1px solid ${C.line}`, background: C.white }}>
      <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr>
            <th className="text-left px-3 py-2.5 text-xs font-semibold" style={{ background: C.navy, color: C.white, minWidth: 100 }}>เวลา</th>
            {dayList.map((d) => (
              <th key={d} className="text-center px-3 py-2.5 text-xs font-semibold" style={{ background: C.navy, color: C.white, minWidth: 150, borderBottom: `4px solid ${dayColor(d).bar}` }}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={`${slot.start}-${slot.end}`} style={{ borderTop: `1px solid ${C.line}` }}>
              <td className="px-3 py-2 text-xs align-top font-mono" style={{ background: C.paper, color: C.slate }}>{slot.start}–{slot.end}</td>
              {dayList.map((d) => {
                const s = rows.find((r) => r.day === d && r.start === slot.start && r.end === slot.end);
                if (!s) return <td key={d} className="px-2 py-2 text-center text-xs align-middle" style={{ color: C.mute }}>–</td>;
                const col = dayColor(d);
                const editable = !!s._row;
                return (
                  <td key={d} className="px-2 py-2 align-top">
                    <div className="p-2" style={{ background: col.bg, borderLeft: `3px solid ${col.bar}` }}>
                      <div className="text-xs font-bold" style={{ color: col.fg }}>{s.subject}</div>
                      {s.loc && <div className="text-[11px] mt-0.5" style={{ color: col.fg }}>{s.loc}</div>}
                      {s.group && s.group !== s.subject && <div className="text-[11px]" style={{ color: col.fg, opacity: 0.85 }}>{s.group}</div>}
                      {s.source === "teachingSheet" && s.note && <div className="text-[10px]" style={{ color: col.fg, opacity: 0.75 }}>{s.note}</div>}
                      {editable ? (
                        <div className="flex gap-2 mt-1.5">
                          <button onClick={() => onEdit(s)} className="text-[11px] underline" style={{ color: col.fg }}>แก้ไข</button>
                          <button onClick={() => onDelete(s)} className="text-[11px] underline" style={{ color: C.crimson }}>ลบ</button>
                        </div>
                      ) : (
                        <div className="text-[10px] mt-1" style={{ color: col.fg, opacity: 0.7 }}>จากตารางสอนกลาง</div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   BORROWING
   ============================================================ */
function Borrowing({ user, items, setItems, borrows, setBorrows, logAction }) {
  const [showNew, setShowNew] = useState(false);
  const editable = canEdit(user.role) || canManage(user.role);
  // L0/L1 can self-service return only their own borrowed items; L2/L3 can process any return
  const canReturn = (b) => editable || b.borrower === user.name;

  const submit = ({ itemId, qty, where, purpose, due }) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const rec = { id: `BR-${Date.now()}`, date: todayISO(), borrower: user.name, itemId, itemCode: item.code, itemName: item.name, qty, where, purpose, due, returned: null, status: "borrowed" };
    setBorrows((p) => [rec, ...p]);
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, borrowed: i.borrowed + qty } : i)));
    logAction(`บันทึกการยืม ${item.code} จำนวน ${qty}`);
    postToSheets("borrow", { date: rec.date, borrower: rec.borrower, itemCode: item.code, itemName: item.name, qty, where, purpose, due });
    setShowNew(false);
  };

  const markReturned = (b) => {
    const returnedDate = todayISO();
    setBorrows((p) => p.map((x) => (x.id === b.id ? { ...x, status: "returned", returned: returnedDate } : x)));
    setItems((prev) => prev.map((i) => (i.id === b.itemId ? { ...i, borrowed: Math.max(0, i.borrowed - b.qty) } : i)));
    logAction(`บันทึกการคืน ${b.itemCode}`);
    postToSheets("return", { itemCode: b.itemCode, borrower: b.borrower, returnedDate });
  };

  const available = items.filter((i) => i.normal - i.borrowed > 0);

  return (
    <div>
      <SectionHead eyebrow="BORROWING" title="ยืม–คืนอุปกรณ์" sub="ขั้นตอน: บันทึกการยืม → ใช้งาน → บันทึกการคืน"
        right={<Btn onClick={() => setShowNew(true)} icon={Plus}>บันทึกการยืมใหม่</Btn>} />

      <div className="table-scroll" style={{ border: `1px solid ${C.line}`, background: C.white }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: C.navy, color: C.white }}>
              {["วันที่ยืม", "ผู้ยืม", "อุปกรณ์", "จำนวน", "ใช้ที่", "กำหนดคืน", "สถานะ", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {borrows.map((b) => {
              const overdue = b.status === "borrowed" && b.due && b.due < todayISO();
              return (
                <tr key={b.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-3 py-2 text-xs">{b.date}</td>
                  <td className="px-3 py-2 font-medium">{b.borrower}</td>
                  <td className="px-3 py-2 text-xs">{b.itemName} <span style={{ color: C.mute }}>({b.itemCode})</span></td>
                  <td className="px-3 py-2 text-xs">{b.qty}</td>
                  <td className="px-3 py-2 text-xs">{b.where}</td>
                  <td className="px-3 py-2 text-xs">{b.due}</td>
                  <td className="px-3 py-2">
                    {b.status === "returned"
                      ? <Pill fg={C.ok} bg={C.okBg}><CheckCircle2 size={11} /> คืนแล้ว</Pill>
                      : overdue ? <Pill fg={C.bad} bg={C.badBg}><AlertTriangle size={11} /> เกินกำหนด</Pill>
                      : <Pill fg={C.warn} bg={C.warnBg}><Clock size={11} /> ยังไม่คืน</Pill>}
                  </td>
                  <td className="px-3 py-2">
                    {canReturn(b) && b.status === "borrowed" && (
                      <button onClick={() => markReturned(b)} className="text-xs font-semibold underline" style={{ color: C.crimson }}>บันทึกคืน</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNew && (
        <Modal title="บันทึกการยืม" onClose={() => setShowNew(false)}>
          <BorrowForm available={available} onSubmit={submit} />
        </Modal>
      )}
    </div>
  );
}

// วันที่วันนี้ตามเวลาเครื่อง (YYYY-MM-DD)
function todayISO() { return new Date().toLocaleDateString("sv-SE"); }
function addDaysISO(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); }

// ข้อความมาตรฐานของการยืม — เลือกจากรายการแทนการพิมพ์เอง ให้ข้อมูลสม่ำเสมอ นำไปวิเคราะห์/รายงานได้
const BORROW_PURPOSES = ["การเรียนการสอน", "ฝึกซ้อมนักกีฬา", "การแข่งขัน", "กิจกรรมโรงเรียน", "หน่วยงานภายนอกขอยืม", "ซ่อมบำรุง/ตรวจสอบ", "อื่นๆ"];
const OTHER = "อื่นๆ";

function BorrowForm({ available, onSubmit }) {
  const [itemId, setItemId] = useState(available[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [where, setWhere] = useState(LOCATIONS[0].name);
  const [whereOther, setWhereOther] = useState("");
  const [purpose, setPurpose] = useState(BORROW_PURPOSES[0]);
  const [detail, setDetail] = useState(""); // เช่น ชั้น/ห้องเรียน หรือชื่อรายการแข่งขัน
  const [due, setDue] = useState(addDaysISO(7));
  const chosen = available.find((i) => i.id === itemId);
  const max = chosen ? chosen.normal - chosen.borrowed : 1;
  const place = where === OTHER ? whereOther.trim() : where;
  const needsDetail = purpose === OTHER;
  const purposeText = detail.trim() ? `${purpose} — ${detail.trim()}` : purpose;
  const valid = chosen && qty >= 1 && place && due && (!needsDetail || detail.trim());
  const detailHint = { "การเรียนการสอน": "เช่น ป.5/2 คาบ 3", "ฝึกซ้อมนักกีฬา": "เช่น ทีมฟุตซอล ม.ต้น", "การแข่งขัน": "เช่น กีฬาสีภายใน 2569", "กิจกรรมโรงเรียน": "เช่น ACT College Day", "หน่วยงานภายนอกขอยืม": "ชื่อหน่วยงาน/ผู้ติดต่อ" }[purpose] || "ระบุรายละเอียด";
  return (
    <div>
      <Field label="อุปกรณ์ *">
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} style={inputStyle}>
          {available.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name} (พร้อมใช้ {i.normal - i.borrowed})</option>)}
        </select>
      </Field>
      <Field label={`จำนวน * (สูงสุด ${max})`}>
        <input type="number" min={1} max={max} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(max, Number(e.target.value) || 1)))} style={inputStyle} />
      </Field>
      <Field label="สถานที่ใช้งาน *">
        <select value={where} onChange={(e) => setWhere(e.target.value)} style={inputStyle}>
          {LOCATIONS.map((l) => <option key={l.code} value={l.name}>{l.name}</option>)}
          <option value={OTHER}>อื่นๆ (ระบุ)</option>
        </select>
        {where === OTHER && <input value={whereOther} onChange={(e) => setWhereOther(e.target.value)} placeholder="ระบุสถานที่" style={{ ...inputStyle, marginTop: 6 }} />}
      </Field>
      <Field label="วัตถุประสงค์ *">
        <select value={purpose} onChange={(e) => setPurpose(e.target.value)} style={inputStyle}>
          {BORROW_PURPOSES.map((x) => <option key={x}>{x}</option>)}
        </select>
      </Field>
      <Field label={needsDetail ? "รายละเอียด *" : "รายละเอียด (ถ้ามี)"}>
        <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={detailHint} style={inputStyle} />
      </Field>
      <Field label="กำหนดคืน *"><input type="date" min={todayISO()} value={due} onChange={(e) => setDue(e.target.value)} style={inputStyle} /></Field>
      <div className="text-[11px] mb-2" style={{ color: C.mute }}>บันทึกเป็น: {purposeText} · {place || "-"}</div>
      <div className="flex justify-end mt-2">
        <Btn onClick={() => onSubmit({ itemId, qty, where: place, purpose: purposeText, due })} disabled={!valid}>ยืนยันการยืม</Btn>
      </div>
    </div>
  );
}

/* ============================================================
   DAMAGE & MAINTENANCE
   ============================================================ */
const SEVERITY = ["น้อย", "ปานกลาง", "สูง"];
const MAINT_ACTIONS = ["Repair", "Waiting Part", "Replace", "Write-off"];

function DamageMaint({ user, items, setItems, damages, setDamages, setTasks, logAction }) {
  const [showNew, setShowNew] = useState(false);
  const manage = canEdit(user.role) || canManage(user.role);

  const submit = async ({ itemId, qty, symptom, location }) => {
    const item = items.find((i) => i.id === itemId);
    const loc = location || item.loc || "";
    const rec = { id: `DM-${Date.now()}`, date: "2026-09-15", itemId, itemCode: item.code, itemName: item.name, qty, symptom, location: loc, reporter: user.name, severity: "ปานกลาง", status: "รอตรวจสอบ", action: "", cost: 0 };
    setDamages((p) => [rec, ...p]);
    logAction(`แจ้งชำรุด ${item.code} จำนวน ${qty} ที่ ${loc || "-"}`);
    setShowNew(false);
    try {
      const result = await postToSheetsAwait("damage", { date: rec.date, itemCode: item.code, itemName: item.name, qty, symptom, location: loc, reporter: user.name });
      if (result.taskId) {
        setTasks((prev) => [{
          id: result.taskId, title: `ซ่อม/ตรวจสอบ: ${item.name} (${item.code})`, description: symptom,
          priority: "HIGH", status: "TODO", dueDate: "", dueTime: "", assignee: "", createdBy: user.name,
          location: loc, relatedResource: item.code, relatedFacility: loc, relatedBorrowId: "",
          relatedDamageId: result.damageId || "", taskType: "maintenance", comments: "",
          createdDate: new Date().toISOString(), completedDate: "",
        }, ...prev]);
      }
    } catch (e) { /* damage already saved locally; task mirror is best-effort */ }
  };

  const advance = (d, patch) => {
    setDamages((p) => p.map((x) => (x.id === d.id ? { ...x, ...patch } : x)));
    logAction(`อัปเดต${patch.status ? "สถานะซ่อม" : "ความรุนแรง"} ${d.itemCode} → ${patch.status || patch.severity}`);
    if (d._row && patch.status) postToSheets("updateDamageStatus", { row: d._row, status: patch.status });
  };

  return (
    <div>
      <SectionHead eyebrow="DAMAGE & MAINTENANCE" title="แจ้งชำรุด–ซ่อมบำรุง" sub="Report → Review → Severity → Maintenance → Resolved"
        right={<Btn onClick={() => setShowNew(true)} icon={Plus}>แจ้งของชำรุด</Btn>} />

      {damages.length === 0 ? (
        <div className="p-8 text-center text-sm" style={{ color: C.mute, border: `1px dashed ${C.line}`, background: C.white }}>
          ยังไม่มีรายการแจ้งชำรุดใหม่ในรอบนี้ — ใช้ปุ่ม "แจ้งของชำรุด" เพื่อเริ่มบันทึก
        </div>
      ) : (
        <div className="table-scroll" style={{ border: `1px solid ${C.line}`, background: C.white }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: C.navy, color: C.white }}>
                {["วันที่แจ้ง", "อุปกรณ์", "สถานที่", "จำนวน", "อาการ", "ผู้แจ้ง", "ความรุนแรง", "สถานะ", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {damages.map((d) => (
                <tr key={d.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-3 py-2 text-xs">{d.date}</td>
                  <td className="px-3 py-2 text-xs">{d.itemName} <span style={{ color: C.mute }}>({d.itemCode})</span></td>
                  <td className="px-3 py-2 text-xs" style={{ color: C.slate }}>{d.location || "-"}</td>
                  <td className="px-3 py-2 text-xs">{d.qty}</td>
                  <td className="px-3 py-2 text-xs">{d.symptom}</td>
                  <td className="px-3 py-2 text-xs">{d.reporter}</td>
                  <td className="px-3 py-2">                    {manage ? (
                      <select value={d.severity} onChange={(e) => advance(d, { severity: e.target.value })} style={{ ...inputStyle, padding: "3px 6px", fontSize: 12, width: 110 }}>
                        {SEVERITY.map((severity) => <option key={severity}>{severity}</option>)}
                      </select>
                    ) : <span className="text-xs">{d.severity}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {manage ? (
                      <select value={d.status} onChange={(e) => advance(d, { status: e.target.value })} style={{ ...inputStyle, padding: "3px 6px", fontSize: 12, width: 130 }}>
                        {["รอตรวจสอบ", ...MAINT_ACTIONS, "Resolved"].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    ) : <Pill fg={C.warn} bg={C.warnBg}>{d.status}</Pill>}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: C.mute }}>{d.status === "Resolved" ? "✓ ปิดงาน" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <Modal title="แจ้งของชำรุด" onClose={() => setShowNew(false)}>
          <DamageForm items={items} onSubmit={submit} />
        </Modal>
      )}
    </div>
  );
}

function DamageForm({ items, onSubmit }) {
  const [itemId, setItemId] = useState(items[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [symptom, setSymptom] = useState("");
  const [location, setLocation] = useState(items[0]?.loc || "");
  const [locTouched, setLocTouched] = useState(false);

  const pickItem = (e) => {
    const id = e.target.value;
    setItemId(id);
    if (!locTouched) {
      const it = items.find((i) => i.id === id);
      setLocation(it?.loc || "");
    }
  };

  return (
    <div>
      <Field label="อุปกรณ์">
        <select value={itemId} onChange={pickItem} style={inputStyle}>
          {items.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.name}</option>)}
        </select>
      </Field>
      <Field label="สถานที่ (เติมอัตโนมัติจากตำแหน่งเก็บของอุปกรณ์ — เลือกใหม่ได้ถ้าจุดที่ชำรุดไม่ตรง)">
        <select
          value={location}
          onChange={(e) => { setLocTouched(true); setLocation(e.target.value); }}
          style={inputStyle}
        >
          <option value="">— เลือกสถานที่ —</option>
          {location && !LOCATIONS.some((l) => l.name === location) && (
            <option value={location}>{location} (จากข้อมูลเดิม)</option>
          )}
          {LOCATIONS.map((l) => <option key={l.code} value={l.name}>{l.name}</option>)}
        </select>
      </Field>
      <Field label="จำนวนที่ชำรุด"><input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={inputStyle} /></Field>
      <Field label="อาการ / รายละเอียด"><textarea rows={3} value={symptom} onChange={(e) => setSymptom(e.target.value)} style={inputStyle} /></Field>
      <div className="flex justify-end mt-2">
        <Btn variant="crimson" onClick={() => onSubmit({ itemId, qty, symptom, location })} disabled={!symptom}>ส่งรายงานชำรุด</Btn>
      </div>
    </div>
  );
}

/* ============================================================
   ANALYTICS
   ============================================================ */
/* ============================================================
   ANALYTICS (L3/L4) — วิเคราะห์ข้อมูลทั้งศูนย์จากทุกชีต:
   ครุภัณฑ์ · บุคลากร/ภาระงาน · ตารางสอน · งาน · ยืม-คืน/ชำรุด/ซ่อม ·
   งบประมาณ · คุณภาพข้อมูล  → สรุปเป็น "สิ่งที่ต้องจัดการ" ให้หัวหน้าตัดสินใจได้ทันที
   ============================================================ */
const baht = (n) => `${Math.round(n || 0).toLocaleString("th-TH")} ฿`;
function AnaCard({ title, children, right, span2 }) {
  return (
    <div className={`p-4 ${span2 ? "col-span-2" : ""}`} style={{ background: C.white, border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: C.navy }}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}
function MiniBar({ label, value, max, color = C.navy, suffix = "" }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-0.5"><span className="truncate pr-2" style={{ color: C.ink }}>{label}</span><span className="font-mono shrink-0" style={{ color: C.slate }}>{value.toLocaleString("th-TH")}{suffix}</span></div>
      <div style={{ height: 6, background: C.paper }}><div style={{ width: `${pct}%`, height: 6, background: color }} /></div>
    </div>
  );
}

function Analytics({ user, items, borrows = [], damages = [], tasks = [], staffList = [], schedule = [], combinedSport = [], repairs = [], pmSchedule = [], docs = [], setTab }) {
  const [budget, setBudget] = useState({ budgets: [], expenses: [], income: [], loaded: false });
  useEffect(() => {
    if (!API_URL || !user) return;
    loadBudgetData(user.id).then((d) => setBudget({ ...d, loaded: true })).catch(() => setBudget((b) => ({ ...b, loaded: true })));
  }, [user?.id]);

  const A = useMemo(() => {
    // ---------- ครุภัณฑ์ ----------
    const units = { ok: 0, damaged: 0, lost: 0, disposed: 0, borrowed: 0 };
    let value = 0, damagedValue = 0;
    const byCat = {}, byLoc = {}, byOwner = {};
    items.forEach((i) => {
      units.ok += i.normal; units.damaged += i.damaged; units.lost += i.lost; units.disposed += i.disposed; units.borrowed += i.borrowed;
      value += (i.normal + i.damaged) * (i.price || 0); damagedValue += i.damaged * (i.price || 0);
      const c = (byCat[i.catCode] = byCat[i.catCode] || { name: catName(i.catCode), items: 0, ok: 0, damaged: 0, value: 0 });
      c.items += 1; c.ok += i.normal; c.damaged += i.damaged; c.value += (i.normal + i.damaged) * (i.price || 0);
      const l = (byLoc[i.loc || "ไม่ระบุ"] = byLoc[i.loc || "ไม่ระบุ"] || { name: i.loc || "ไม่ระบุ", items: 0, damaged: 0 });
      l.items += 1; l.damaged += i.damaged;
      const o = i.owner && i.owner !== "ยังไม่ระบุ" ? i.owner : "ยังไม่ระบุผู้ดูแล";
      byOwner[o] = (byOwner[o] || 0) + 1;
    });
    const totalUnits = units.ok + units.damaged + units.lost;
    const cats = Object.values(byCat).map((c) => ({ ...c, rate: c.ok + c.damaged ? Math.round((c.damaged / (c.ok + c.damaged)) * 100) : 0 }));
    const outOfStock = items.filter((i) => i.normal - i.borrowed <= 0);
    const lowStock = items.filter((i) => i.minAlert && i.normal - i.borrowed > 0 && i.normal - i.borrowed <= i.minAlert);
    const riskItems = items.filter((i) => i.damaged > 0 && i.damaged >= i.normal).sort((a, b) => b.damaged - a.damaged);

    // ---------- บุคลากร & ภาระงาน ----------
    const byUnit = {}, byLevel = {};
    staffList.forEach((s) => { byUnit[s.dept || "ไม่ระบุ"] = (byUnit[s.dept || "ไม่ระบุ"] || 0) + 1; byLevel[s.level || "L1"] = (byLevel[s.level || "L1"] || 0) + 1; });
    const periodsBy = {};
    schedule.filter((r) => r.period !== "AS" && !isRoomScheduleRow(r)).forEach((r) => {
      const k = r.teacher || "-"; periodsBy[k] = (periodsBy[k] || 0) + 1;
    });
    const workload = Object.entries(periodsBy).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
    const sportPeriods = {};
    combinedSport.forEach((r) => (r.sports || []).forEach((sp) => { sportPeriods[sp.name] = (sportPeriods[sp.name] || 0) + 1; }));
    const classesPerWeek = combinedSport.reduce((s, r) => s + (r.classes || []).length, 0);

    // ---------- งาน ----------
    const tStatus = {}; tasks.forEach((t) => { tStatus[t.status] = (tStatus[t.status] || 0) + 1; });
    const openTasks = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
    const overdueTasks = openTasks.filter((t) => isTaskOverdue(t));
    const unassigned = openTasks.filter((t) => !t.assignee);
    const doneRate = tasks.length ? Math.round(((tStatus.COMPLETED || 0) / tasks.length) * 100) : 0;

    // ---------- ยืม-คืน / ชำรุด / ซ่อม ----------
    const today = new Date().toLocaleDateString("sv-SE");
    const openBorrows = borrows.filter((b) => b.status !== "returned");
    const overdueBorrows = openBorrows.filter((b) => b.due && b.due < today);
    const openDamages = damages.filter((d) => !/เสร็จ|ซ่อมแล้ว|ปิด/.test(d.status || ""));
    const repairCost = repairs.reduce((s, r) => s + (r.cost || 0), 0);

    // ---------- คุณภาพข้อมูล ----------
    const n = items.length || 1;
    const quality = [
      { label: "มีราคาต่อหน่วย", have: items.filter((i) => i.price > 0).length, fix: "ใส่ราคาเพื่อคำนวณมูลค่าและค่าเสื่อม" },
      { label: "ระบุผู้ดูแล", have: items.filter((i) => i.owner && i.owner !== "ยังไม่ระบุ").length, fix: "กำหนดผู้รับผิดชอบทุกรายการ" },
      { label: "มีรูปภาพ", have: items.filter((i) => i.imageUrl).length, fix: "ถ่ายรูปช่วยตรวจนับ/ยืมได้ง่าย" },
    ].map((q) => ({ ...q, pct: Math.round((q.have / n) * 100) }));

    return { units, totalUnits, value, damagedValue, cats, byLoc: Object.values(byLoc).sort((a, b) => b.items - a.items), byOwner, outOfStock, lowStock, riskItems,
      byUnit, byLevel, workload, sportPeriods, classesPerWeek, tStatus, openTasks, overdueTasks, unassigned, doneRate,
      openBorrows, overdueBorrows, openDamages, repairCost, quality };
  }, [items, borrows, damages, tasks, staffList, schedule, combinedSport, repairs]);

  // ---------- งบประมาณ ----------
  const budgetRows = useMemo(() => budget.budgets.map((b) => {
    const ex = budget.expenses.filter((e) => e.budgetId === b.id);
    const approved = ex.filter((e) => /อนุมัติแล้ว|approved/i.test(e.approvalStatus)).reduce((s, e) => s + e.amount, 0);
    const pending = ex.filter((e) => /รอ/.test(e.approvalStatus)).reduce((s, e) => s + e.amount, 0);
    return { ...b, approved, pending, used: approved + pending, pct: b.amount ? Math.round(((approved + pending) / b.amount) * 100) : 0, n: ex.length };
  }), [budget]);
  const pendingExpenses = budget.expenses.filter((e) => /รอ/.test(e.approvalStatus));

  // ---------- สิ่งที่ต้องจัดการ (เรียงตามความสำคัญ) ----------
  const actions = [];
  budgetRows.filter((b) => b.pct > 100).forEach((b) => actions.push({ tone: "bad", text: `โครงการ "${b.name.trim()}" ใช้งบเกิน ${b.pct - 100}% (${baht(b.used)} / ${baht(b.amount)})`, tab: "budget" }));
  if (pendingExpenses.length) actions.push({ tone: "warn", text: `รายจ่ายรออนุมัติ ${pendingExpenses.length} รายการ รวม ${baht(pendingExpenses.reduce((s, e) => s + e.amount, 0))}`, tab: "budget" });
  if (A.overdueBorrows.length) actions.push({ tone: "bad", text: `อุปกรณ์ยืมเกินกำหนดคืน ${A.overdueBorrows.length} รายการ`, tab: "borrow" });
  if (A.overdueTasks.length) actions.push({ tone: "bad", text: `งานเกินกำหนด ${A.overdueTasks.length} งาน`, tab: "tasks" });
  if (A.unassigned.length) actions.push({ tone: "warn", text: `งานยังไม่มอบหมายผู้รับผิดชอบ ${A.unassigned.length} งาน`, tab: "tasks" });
  if (A.units.damaged) actions.push({ tone: "warn", text: `อุปกรณ์ชำรุด ${A.units.damaged.toLocaleString()} ชิ้น ใน ${items.filter((i) => i.damaged).length} รายการ — ควรส่งซ่อมหรือจำหน่ายออก`, tab: "damage" });
  if (A.outOfStock.length) actions.push({ tone: "warn", text: `รายการที่ไม่มีของพร้อมใช้ ${A.outOfStock.length} รายการ`, tab: "inventory" });
  if (A.lowStock.length) actions.push({ tone: "warn", text: `ใกล้หมด (ต่ำกว่าจุดเตือน) ${A.lowStock.length} รายการ`, tab: "inventory" });
  if (!pmSchedule.length) actions.push({ tone: "info", text: "ยังไม่มีแผนซ่อมบำรุงล่วงหน้า (PM) — ควรตั้งรอบตรวจสนาม/สระ/ฟิตเนส", tab: "maintenance" });
  A.quality.filter((q) => q.pct < 50).forEach((q) => actions.push({ tone: "info", text: `ข้อมูลครุภัณฑ์${q.label}เพียง ${q.pct}% — ${q.fix}`, tab: "inventory" }));
  const toneStyle = { bad: { bg: C.badBg, fg: C.bad }, warn: { bg: C.warnBg, fg: C.warn }, info: { bg: "#EAF2FB", fg: "#1B5E8A" } };

  const health = [
    { name: "ใช้งานได้", value: A.units.ok, fill: C.ok },
    { name: "ชำรุด", value: A.units.damaged, fill: C.crimson },
    { name: "สูญหาย", value: A.units.lost, fill: C.warn },
  ];
  const readyPct = A.totalUnits ? Math.round((A.units.ok / A.totalUnits) * 100) : 0;
  const maxWork = A.workload[0]?.n || 1;
  const sportList = Object.entries(A.sportPeriods).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <SectionHead eyebrow="ANALYTICS" title="วิเคราะห์ข้อมูลศูนย์กีฬา" sub="สรุปจากทุกชีต: ครุภัณฑ์ · บุคลากร · ตารางสอน · งาน · ยืม-คืน · ซ่อม · งบประมาณ" />

      <div className="grid grid-cols-2 gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <StatCard label="มูลค่าครุภัณฑ์ (ที่มีราคา)" value={baht(A.value)} sub={`${items.length} รายการ · ${A.totalUnits.toLocaleString()} ชิ้น`} icon={Package} />
        <StatCard label="พร้อมใช้งาน" value={`${readyPct}%`} sub={`ชำรุด ${A.units.damaged} · สูญหาย ${A.units.lost}`} tone={readyPct >= 90 ? "navy" : "crimson"} icon={ShieldCheck} />
        <StatCard label="บุคลากรในระบบ" value={staffList.length} sub={Object.entries(A.byLevel).sort().map(([k, v]) => `${k}:${v}`).join(" · ")} icon={Users} />
        <StatCard label="คาบกีฬา/สัปดาห์" value={combinedSport.length} sub={`${A.classesPerWeek} ห้องเรียน-คาบ · ${sportList.length} กีฬา`} icon={Trophy} />
        <StatCard label="งานค้าง" value={A.openTasks.length} sub={`เกินกำหนด ${A.overdueTasks.length} · สำเร็จ ${A.doneRate}%`} tone={A.overdueTasks.length ? "crimson" : "navy"} icon={ClipboardList} />
        <StatCard label="งบประมาณที่ใช้" value={budgetRows.length ? `${Math.round(budgetRows.reduce((s, b) => s + b.used, 0) / Math.max(1, budgetRows.reduce((s, b) => s + b.amount, 0)) * 100)}%` : "–"} sub={budgetRows.length ? `${baht(budgetRows.reduce((s, b) => s + b.used, 0))} / ${baht(budgetRows.reduce((s, b) => s + b.amount, 0))}` : budget.loaded ? "ไม่มีข้อมูล" : "กำลังโหลด…"} icon={DollarSign} />
      </div>

      <AnaCard title={`สิ่งที่ต้องจัดการ (${actions.length})`}>
        {actions.length === 0 ? <div className="text-sm" style={{ color: C.ok }}>ไม่มีเรื่องค้าง 🎉</div> : (
          <div className="space-y-1.5">
            {actions.map((a, i) => (
              <button key={i} onClick={() => setTab && setTab(a.tab)} className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2"
                style={{ background: toneStyle[a.tone].bg, color: toneStyle[a.tone].fg }}>
                <span>{a.tone === "bad" ? "⛔" : a.tone === "warn" ? "⚠️" : "ℹ️"} {a.text}</span><ChevronRight size={14} className="shrink-0" />
              </button>
            ))}
          </div>
        )}
      </AnaCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-4">
        <AnaCard title="สุขภาพครุภัณฑ์ (ชิ้น)">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={health} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                {health.map((h, i) => <Cell key={i} fill={h.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ fontFamily: FONT, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: FONT }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-xs text-center" style={{ color: C.mute }}>มูลค่าของชำรุด {baht(A.damagedValue)} · จำหน่ายออกแล้ว {A.units.disposed} ชิ้น</div>
        </AnaCard>
        <AnaCard title="อัตราชำรุดแยกตามหมวด (%)">
          {A.cats.filter((c) => c.damaged).sort((a, b) => b.rate - a.rate).slice(0, 8).map((c) => (
            <MiniBar key={c.name} label={`${c.name} (${c.damaged}/${c.ok + c.damaged})`} value={c.rate} max={100} color={c.rate >= 30 ? C.crimson : C.warn} suffix="%" />
          ))}
          {!A.cats.some((c) => c.damaged) && <div className="text-sm" style={{ color: C.mute }}>ไม่มีของชำรุด</div>}
        </AnaCard>
        <AnaCard title="จำนวนรายการตามสถานที่เก็บ">
          {A.byLoc.slice(0, 8).map((l) => <MiniBar key={l.name} label={l.name} value={l.items} max={A.byLoc[0]?.items} />)}
        </AnaCard>
        <AnaCard title="ภาระดูแลครุภัณฑ์ตามผู้ดูแล">
          {Object.entries(A.byOwner).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <MiniBar key={k} label={k} value={v} max={items.length} color={k === "ยังไม่ระบุผู้ดูแล" ? C.warn : C.navy} suffix=" รายการ" />
          ))}
        </AnaCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <AnaCard title="คาบสอนต่อสัปดาห์รายบุคคล" right={<span className="text-[11px]" style={{ color: C.mute }}>จากตารางสอน</span>}>
          {A.workload.length === 0 ? <div className="text-sm" style={{ color: C.mute }}>ยังไม่มีข้อมูลตารางสอน</div> :
            A.workload.slice(0, 12).map((w) => <MiniBar key={w.name} label={w.name} value={w.n} max={maxWork} color={w.n >= 30 ? C.crimson : C.navy} suffix=" คาบ" />)}
          {A.workload.length > 0 && <div className="text-[11px] mt-2" style={{ color: C.mute }}>สีแดง = ≥ 30 คาบ/สัปดาห์ ควรพิจารณากระจายภาระงาน</div>}
        </AnaCard>
        <AnaCard title="กีฬาที่สอน (คาบ/สัปดาห์)" right={<span className="text-[11px]" style={{ color: C.mute }}>จากตารางรวมกีฬา</span>}>
          {sportList.length === 0 ? <div className="text-sm" style={{ color: C.mute }}>ยังไม่มีข้อมูล</div> :
            sportList.map(([k, v]) => <MiniBar key={k} label={k} value={v} max={sportList[0][1]} color={C.crimson} suffix=" คาบ" />)}
        </AnaCard>
        <AnaCard title="บุคลากรตามหน่วยงาน">
          {Object.entries(A.byUnit).sort((a, b) => b[1] - a[1]).map(([k, v]) => <MiniBar key={k} label={k} value={v} max={staffList.length} suffix=" คน" />)}
        </AnaCard>
        <AnaCard title="งานและกิจกรรมยืม-คืน-ซ่อม">
          <div className="grid grid-cols-2 gap-2 text-center">
            {[
              ["งานทั้งหมด", tasks.length], ["ยังไม่มอบหมาย", A.unassigned.length],
              ["ยืมอยู่", A.openBorrows.length], ["ยืมเกินกำหนด", A.overdueBorrows.length],
              ["แจ้งชำรุดค้าง", A.openDamages.length], ["ค่าซ่อมรวม", baht(A.repairCost)],
            ].map(([k, v]) => (
              <div key={k} className="p-2" style={{ background: C.paper }}>
                <div className="text-base font-bold" style={{ color: C.ink }}>{v}</div>
                <div className="text-[11px]" style={{ color: C.mute }}>{k}</div>
              </div>
            ))}
          </div>
        </AnaCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <AnaCard title="งบประมาณ: ได้รับ vs ใช้ไป" span2>
          {!budget.loaded ? <div className="text-sm" style={{ color: C.mute }}>กำลังโหลด…</div> : budgetRows.length === 0 ? <div className="text-sm" style={{ color: C.mute }}>ไม่มีข้อมูลงบประมาณ</div> : (
            <div className="space-y-3">
              {budgetRows.map((b) => (
                <div key={b.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold" style={{ color: C.ink }}>{b.name}</span>
                    <span style={{ color: b.pct > 100 ? C.bad : C.slate }}>{baht(b.used)} / {baht(b.amount)} ({b.pct}%)</span>
                  </div>
                  <div className="flex" style={{ height: 8, background: C.paper }}>
                    <div style={{ width: `${Math.min(100, (b.approved / (b.amount || 1)) * 100)}%`, background: C.ok }} />
                    <div style={{ width: `${Math.min(100, (b.pending / (b.amount || 1)) * 100)}%`, background: b.pct > 100 ? C.bad : C.warn }} />
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: C.mute }}>อนุมัติแล้ว {baht(b.approved)} · รออนุมัติ {baht(b.pending)} · {b.n} รายการ</div>
                </div>
              ))}
            </div>
          )}
        </AnaCard>
        <AnaCard title="ความครบถ้วนของข้อมูลครุภัณฑ์" span2>
          {A.quality.map((q) => <MiniBar key={q.label} label={`${q.label} (${q.have}/${items.length})`} value={q.pct} max={100} color={q.pct >= 80 ? C.ok : q.pct >= 50 ? C.warn : C.bad} suffix="%" />)}
        </AnaCard>
      </div>

      {A.riskItems.length > 0 && (
        <AnaCard title={`รายการความเสี่ยงสูง (ชำรุด ≥ ใช้งานได้) — ${A.riskItems.length} รายการ`}>
          <div className="grid grid-cols-2 gap-2">
            {A.riskItems.slice(0, 10).map((it) => (
              <div key={it.id} className="flex items-center justify-between px-3 py-2" style={{ background: C.badBg }}>
                <div className="min-w-0"><div className="text-sm font-medium truncate" style={{ color: C.ink }}>{it.name}</div><div className="text-xs" style={{ color: C.mute }}>{it.code} · {it.loc}</div></div>
                <Pill fg={C.crimson} bg={C.white}>ชำรุด {it.damaged}/{it.normal + it.damaged}</Pill>
              </div>
            ))}
          </div>
        </AnaCard>
      )}
    </div>
  );
}

/* ============================================================
   REPORTS
   ============================================================ */
const REPORT_TYPES = [
  "Inventory Report", "Facility Report", "Borrowing Report", "Return Report",
  "Damage Report", "Maintenance Report", "Utilization Report", "Monthly Management Report",
];

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")].concat(rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(",")));
  return lines.join("\n");
}

const REPORT_CATALOG = [
  { key: "inventory",   label: "ทะเบียนครุภัณฑ์",     desc: "รายการอุปกรณ์ทั้งหมด (ปกติ/ชำรุด/สูญหาย)" },
  { key: "facility",    label: "สถานที่และการใช้งาน",   desc: "รายชื่อห้อง/สนาม + สถิติการใช้งานรายสัปดาห์" },
  { key: "borrowing",   label: "การยืม–คืน",             desc: "รายการยืม-คืนอุปกรณ์ + สถานะปัจจุบัน" },
  { key: "damage",      label: "อุปกรณ์ชำรุด/สูญหาย",   desc: "บันทึกอุปกรณ์ชำรุดและการดำเนินการ" },
  { key: "maintenance", label: "การซ่อมบำรุง",           desc: "ประวัติการซ่อม + ค่าใช้จ่ายรวม" },
  { key: "schedule",    label: "ตารางสอนและ Workload",   desc: "คาบ/สัปดาห์ต่อครู + สรุปประเภทกีฬา" },
  { key: "staff",       label: "บุคลากรและสิทธิ์",        desc: "รายชื่อบุคลากร แยกตามหน่วยงานและระดับสิทธิ์" },
  { key: "tasks",       label: "งานที่ได้รับมอบหมาย",   desc: "งานทั้งหมด + สถานะ + ผู้รับผิดชอบ" },
  { key: "monthly",     label: "สรุปประจำเดือน (ฝ่ายบริหาร)", desc: "ภาพรวมทุกด้านสำหรับผู้บริหาร" },
];

function Reports({ user, items = [], borrows = [], damages = [], tasks = [], staffList = [], schedule = [], combinedSport = [], repairs = [], pmSchedule = [], docs = [] }) {
  const [key, setKey] = useState("inventory");
  const now = new Date();
  const nowStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

  // สร้างข้อมูลจริงต่อประเภทรายงาน
  const report = useMemo(() => {
    if (key === "inventory") {
      const rows = items.map((i) => ({
        รหัส: i.code, รายการ: i.name, หมวด: catName(i.catCode), สถานที่: i.loc,
        ผู้ดูแล: i.owner || "ยังไม่ระบุ",
        ใช้งานได้: i.normal, ชำรุด: i.damaged, สูญหาย: i.lost || 0, จำหน่ายออก: i.disposed || 0,
      }));
      const summary = [
        { label: "รายการทั้งหมด", value: items.length },
        { label: "ใช้งานได้ (ชิ้น)", value: items.reduce((s, i) => s + i.normal, 0) },
        { label: "ชำรุด (ชิ้น)", value: items.reduce((s, i) => s + i.damaged, 0), tone: "crimson" },
        { label: "สูญหาย (ชิ้น)", value: items.reduce((s, i) => s + (i.lost || 0), 0), tone: "gold" },
      ];
      return { rows, summary };
    }
    if (key === "facility") {
      const rows = LOCATIONS.map((l) => {
        const li = items.filter((i) => i.loc === l.name);
        const sc = schedule.filter((s) => s.loc === l.name);
        return {
          รหัส: l.code, สถานที่: l.name, ผู้ดูแล: l.owner || "ยังไม่ระบุ",
          จำนวนอุปกรณ์: li.length,
          ใช้งานได้: li.reduce((s, i) => s + i.normal, 0),
          ชำรุด: li.reduce((s, i) => s + i.damaged, 0),
          คาบต่อสัปดาห์: sc.length,
          "ชั่วโมง/สัปดาห์": sc.reduce((s, r) => s + durationHrs(r.start, r.end), 0).toFixed(1),
        };
      });
      const summary = [
        { label: "จำนวนสถานที่", value: LOCATIONS.length },
        { label: "คาบใช้งาน/สัปดาห์", value: schedule.length },
        { label: "อุปกรณ์ทั้งหมด", value: items.length },
      ];
      return { rows, summary };
    }
    if (key === "borrowing") {
      const rows = borrows.map((b) => ({
        เลขที่: b.id, วันที่ยืม: b.date, ผู้ยืม: b.borrower, อุปกรณ์: b.itemName, รหัสอุปกรณ์: b.itemCode,
        จำนวน: b.qty, สถานที่: b.where || "-", วัตถุประสงค์: b.purpose || "-",
        กำหนดคืน: b.due || "-", วันคืน: b.returnedAt || "-", สถานะ: b.status,
      }));
      const active = borrows.filter((b) => b.status === "borrowed");
      const overdue = active.filter((b) => b.due && b.due < TODAY_ISO);
      const summary = [
        { label: "รายการยืมทั้งหมด", value: borrows.length },
        { label: "ยังไม่คืน", value: active.length, tone: "gold" },
        { label: "เกินกำหนดคืน", value: overdue.length, tone: "crimson" },
      ];
      return { rows, summary };
    }
    if (key === "damage") {
      const rows = damages.map((d) => ({
        เลขที่: d.id, วันที่: d.date, อุปกรณ์: d.itemName, รหัส: d.itemCode,
        จำนวน: d.qty, ผู้แจ้ง: d.reporter, สาเหตุ: d.cause || "-", สถานที่: d.where || "-", สถานะ: d.status,
      }));
      const open = damages.filter((d) => d.status !== "resolved" && d.status !== "disposed");
      const summary = [
        { label: "รายการแจ้งชำรุดทั้งหมด", value: damages.length },
        { label: "รอดำเนินการ", value: open.length, tone: "crimson" },
      ];
      return { rows, summary };
    }
    if (key === "maintenance") {
      const rows = repairs.map((r) => ({
        เลขที่: r.id, วันที่ซ่อม: r.date, อ้างอิง: r.ref, "ชื่ออุปกรณ์/สถานที่": r.refName,
        ร้านช่าง: r.vendor, ค่าใช้จ่าย: r.cost, สภาพหลังซ่อม: r.condition || "-",
        รับประกันถึง: r.warrantyUntil || "-", สถานะ: r.status || "-",
      }));
      const totalCost = repairs.reduce((s, r) => s + (r.cost || 0), 0);
      const pmSoon = pmSchedule.filter((p) => p.nextDate && p.nextDate >= TODAY_ISO && p.nextDate <= addDaysISO(30)).length;
      const summary = [
        { label: "ครั้งที่ซ่อมทั้งหมด", value: repairs.length },
        { label: "ค่าใช้จ่ายรวม (บาท)", value: totalCost.toLocaleString() },
        { label: "นัด PM ใน 30 วัน", value: pmSoon, tone: "gold" },
      ];
      return { rows, summary };
    }
    if (key === "schedule") {
      const perTeacher = {};
      schedule.forEach((s) => {
        const t = (s.teacher || "").trim();
        if (!t || t === "เลือกกีฬา") return;
        perTeacher[t] = perTeacher[t] || { ครูผู้สอน: t, คาบต่อสัปดาห์: 0, "ชั่วโมง/สัปดาห์": 0, สถานที่หลัก: {} };
        perTeacher[t]["คาบต่อสัปดาห์"] += 1;
        perTeacher[t]["ชั่วโมง/สัปดาห์"] += durationHrs(s.start, s.end);
        if (s.loc) perTeacher[t]["สถานที่หลัก"][s.loc] = (perTeacher[t]["สถานที่หลัก"][s.loc] || 0) + 1;
      });
      const rows = Object.values(perTeacher).map((r) => ({
        ...r,
        "ชั่วโมง/สัปดาห์": r["ชั่วโมง/สัปดาห์"].toFixed(1),
        "สถานที่หลัก": Object.entries(r["สถานที่หลัก"]).sort((a, b) => b[1] - a[1])[0]?.[0] || "-",
      })).sort((a, b) => b["คาบต่อสัปดาห์"] - a["คาบต่อสัปดาห์"]);
      const summary = [
        { label: "จำนวนครูที่มีคาบ", value: rows.length },
        { label: "คาบรวม/สัปดาห์", value: schedule.length },
        { label: "ตารางรวมกีฬา (คาบ)", value: combinedSport.length },
      ];
      return { rows, summary };
    }
    if (key === "staff") {
      const rows = staffList.map((s) => ({
        รหัส: s.id, ชื่อ: s.name, หน่วยงาน: s.dept || "-",
        หน้าที่: s.role || "-", เบอร์โทร: s.phone || "-", ระดับสิทธิ์: s.level || "L1",
      }));
      const byLevel = {};
      staffList.forEach((s) => { byLevel[s.level || "L1"] = (byLevel[s.level || "L1"] || 0) + 1; });
      const summary = [
        { label: "บุคลากรทั้งหมด", value: staffList.length },
        { label: "L3 (หัวหน้า)", value: byLevel.L3 || 0 },
        { label: "L1 (ครู)", value: byLevel.L1 || 0 },
        { label: "L2 (ผู้ช่วย)", value: byLevel.L2 || 0 },
      ];
      return { rows, summary };
    }
    if (key === "tasks") {
      const rows = tasks.map((t) => ({
        รหัส: t.id, ชื่องาน: t.title, ความสำคัญ: t.priority || "-", สถานะ: t.status || "-",
        ผู้รับผิดชอบ: t.assignee || "ยังไม่ระบุ", ผู้สั่ง: t.createdBy || "-",
        กำหนดเสร็จ: t.dueDate || "-", สถานที่: t.location || "-",
      }));
      const active = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
      const summary = [
        { label: "งานทั้งหมด", value: tasks.length },
        { label: "งานที่เปิดอยู่", value: active.length },
        { label: "เกินกำหนด", value: tasks.filter((t) => taskBucket(t) === "overdue").length, tone: "crimson" },
        { label: "ยังไม่ระบุผู้รับผิดชอบ", value: active.filter((t) => !t.assignee).length, tone: "gold" },
      ];
      return { rows, summary };
    }
    // monthly: ภาพรวมทุกด้าน
    const rows = [
      { หมวด: "ครุภัณฑ์", "รายการ/ชิ้น": items.length, ปกติ: items.reduce((s, i) => s + i.normal, 0), ชำรุด: items.reduce((s, i) => s + i.damaged, 0) },
      { หมวด: "การยืม-คืน (ยังเปิดอยู่)", "รายการ/ชิ้น": borrows.filter((b) => b.status === "borrowed").length, ปกติ: "-", ชำรุด: borrows.filter((b) => b.status === "borrowed" && b.due < TODAY_ISO).length },
      { หมวด: "การซ่อมบำรุง (เดือนนี้)", "รายการ/ชิ้น": repairs.filter((r) => (r.date || "").startsWith(TODAY_ISO.slice(0, 7))).length, ปกติ: "-", ชำรุด: "-" },
      { หมวด: "งานที่เปิดอยู่", "รายการ/ชิ้น": tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length, ปกติ: "-", ชำรุด: tasks.filter((t) => taskBucket(t) === "overdue").length },
      { หมวด: "บุคลากร", "รายการ/ชิ้น": staffList.length, ปกติ: "-", ชำรุด: "-" },
      { หมวด: "สถานที่", "รายการ/ชิ้น": LOCATIONS.length, ปกติ: "-", ชำรุด: "-" },
      { หมวด: "คลังความรู้", "รายการ/ชิ้น": docs.length, ปกติ: "-", ชำรุด: "-" },
    ];
    const summary = [
      { label: "หมวดในรายงาน", value: rows.length },
      { label: "อัปเดตล่าสุด", value: nowStr },
    ];
    return { rows, summary };
  }, [key, items, borrows, damages, tasks, staffList, schedule, combinedSport, repairs, pmSchedule, docs, nowStr]);

  const current = REPORT_CATALOG.find((r) => r.key === key);
  const exportCsv = () => {
    if (!report.rows.length) return;
    const blob = new Blob(["\ufeff" + toCsv(report.rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ACT_Sport_${current.label}_${TODAY_ISO}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const printPage = () => window.print();

  const headers = report.rows[0] ? Object.keys(report.rows[0]) : [];

  return (
    <div>
      <SectionHead eyebrow="REPORTS" title="รายงาน" sub={`ข้อมูลสด ณ ${nowStr} — สามารถส่งออก CSV หรือพิมพ์เก็บได้ทุกรายงาน`} />
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 space-y-1">
          {REPORT_CATALOG.map((r) => (
            <button key={r.key} onClick={() => setKey(r.key)} className="w-full text-left px-3 py-2.5 text-sm"
              style={{ background: key === r.key ? C.navy : C.white, color: key === r.key ? C.white : C.ink, border: `1px solid ${C.line}` }}>
              <div className="font-semibold">{r.label}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: key === r.key ? "rgba(255,255,255,0.7)" : C.mute }}>{r.desc}</div>
            </button>
          ))}
        </div>
        <div className="col-span-3 space-y-4">
          <div className="p-5" style={{ background: C.white, border: `1px solid ${C.line}` }}>
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-lg" style={{ color: C.navy }}>{current.label}</h3>
                <p className="text-sm mt-0.5" style={{ color: C.slate }}>{current.desc}</p>
              </div>
              <div className="flex gap-2">
                <Btn variant="ghost" small icon={FileText} onClick={printPage}>พิมพ์</Btn>
                <Btn small icon={Download} onClick={exportCsv} disabled={!report.rows.length}>ส่งออก CSV</Btn>
              </div>
            </div>
            <div className={`grid gap-3 mb-2 grid-cols-${Math.min(report.summary.length, 4)}`}>
              {report.summary.map((c) => <StatCard key={c.label} label={c.label} value={c.value} tone={c.tone || "navy"} />)}
            </div>
          </div>
          <div className="p-5" style={{ background: C.white, border: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm" style={{ color: C.navy }}>ตัวอย่างข้อมูล ({report.rows.length} แถว)</h4>
              {report.rows.length > 25 && <span className="text-xs" style={{ color: C.mute }}>แสดง 25 แถวแรก · ส่งออกเพื่อดูทั้งหมด</span>}
            </div>
            {report.rows.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: C.mute, border: `1px dashed ${C.line}` }}>ยังไม่มีข้อมูลในรายงานนี้</div>
            ) : (
              <div className="table-scroll">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: C.paper }}>
                      {headers.map((h) => <th key={h} className="text-left px-2 py-2 font-semibold" style={{ color: C.slate, borderBottom: `1px solid ${C.line}` }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.slice(0, 25).map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
                        {headers.map((h) => <td key={h} className="px-2 py-2" style={{ color: C.ink }}>{String(r[h] ?? "-")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MANAGEMENT ACTIONS (L3 only)
   ============================================================ */
function ManagementActions({ user, items = [], setItems, borrows = [], damages = [], tasks = [], staffList = [], repairs = [], pmSchedule = [], docs = [], actionsLog = [], logAction, setTab }) {
  // สแกนศูนย์กีฬาแบบครบวงจร — สร้างรายการ "ต้องสั่งการ" ในทุกด้าน
  const buckets = useMemo(() => {
    const activeTasks = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
    const overdueBorrows = borrows.filter((b) => b.status === "borrowed" && b.due && b.due < TODAY_ISO);
    const openDamages = damages.filter((d) => d.status !== "resolved" && d.status !== "disposed");
    const outOfStock = items.filter((i) => i.normal === 0 && i.damaged > 0);
    const highDamage = items.filter((i) => i.damaged > 0 && (i.damaged / (i.normal + i.damaged || 1)) >= 0.3);
    const noOwner = items.filter((i) => !i.owner || i.owner === "ยังไม่ระบุ");
    const noPrice = items.filter((i) => !(i.price > 0));
    const noPhoto = items.filter((i) => !i.imageUrl);
    const unassigned = activeTasks.filter((t) => !t.assignee);
    const pmOverdue = pmSchedule.filter((p) => p.nextDate && p.nextDate < TODAY_ISO);
    const openRepairs = repairs.filter((r) => {
      const st = String(r.status || "").toLowerCase();
      return st && !st.includes("เสร็จ") && st !== "done" && st !== "closed";
    });
    return {
      overdueBorrows, openDamages, outOfStock, highDamage, noOwner, noPrice, noPhoto,
      unassigned, activeTasks, pmOverdue, openRepairs,
    };
  }, [items, borrows, damages, tasks, repairs, pmSchedule]);

  const recommended = useMemo(() => items
    .filter((i) => i.damaged > 0)
    .map((i) => {
      const rate = i.damaged / (i.normal + i.damaged || 1);
      let rec = "Monitor";
      if (rate >= 0.7) rec = "Replace";
      else if (rate >= 0.4) rec = "Procure";
      else rec = "Repair";
      return { ...i, rate, rec };
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 12),
  [items]);

  const [tab_, setTab_] = useState("recommend"); // recommend | quality | operations
  const takeAction = (it, action) => {
    logAction(`สั่งการ: ${action} — ${it.code} (${it.name})`);
    if (action === "Repair") {
      const newNormal = it.normal + it.damaged;
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, normal: newNormal, damaged: 0 } : x)));
      postToSheets("updateItem", { code: it.code, normal: newNormal, damaged: 0 });
    }
  };

  // สรุปตัวชี้วัดการสั่งการ (KPI)
  const kpis = [
    { label: "อุปกรณ์ต้องซ่อม/จัดหา", value: recommended.length, tone: "crimson", icon: Wrench, sub: buckets.outOfStock.length > 0 ? `${buckets.outOfStock.length} รายการหมดสต๊อก` : "", go: () => setTab_("recommend") },
    { label: "งานที่ยังไม่มีผู้รับผิดชอบ", value: buckets.unassigned.length, tone: "gold", icon: ClipboardList, sub: `จากงานที่เปิดอยู่ ${buckets.activeTasks.length}`, go: () => setTab && setTab("tasks") },
    { label: "อุปกรณ์ที่ยืมเกินกำหนดคืน", value: buckets.overdueBorrows.length, tone: "crimson", icon: ArrowLeftRight, sub: buckets.overdueBorrows[0] ? `เก่าสุด: ${buckets.overdueBorrows.sort((a,b)=>a.due.localeCompare(b.due))[0].due}` : "", go: () => setTab && setTab("borrow") },
    { label: "แจ้งชำรุดรอดำเนินการ", value: buckets.openDamages.length, tone: "navy", icon: AlertTriangle, sub: "", go: () => setTab && setTab("damage") },
    { label: "นัดซ่อมบำรุงที่ผ่านมา", value: buckets.pmOverdue.length, tone: "gold", icon: CalendarClock, sub: buckets.pmOverdue.length > 0 ? "ต้องเลื่อนนัดใหม่" : "", go: () => setTab && setTab("maintenance") },
    { label: "งานซ่อมยังไม่ปิด", value: buckets.openRepairs.length, tone: "navy", icon: Wrench, sub: "", go: () => setTab && setTab("maintenance") },
  ];

  const dataQuality = [
    { label: "อุปกรณ์ไม่มีผู้ดูแล", value: buckets.noOwner.length, sample: buckets.noOwner.slice(0, 5).map((i) => i.name) },
    { label: "อุปกรณ์ไม่มีราคาต่อหน่วย", value: buckets.noPrice.length, sample: buckets.noPrice.slice(0, 5).map((i) => i.name) },
    { label: "อุปกรณ์ไม่มีรูปภาพ", value: buckets.noPhoto.length, sample: buckets.noPhoto.slice(0, 5).map((i) => i.name) },
  ];

  return (
    <div>
      <SectionHead eyebrow="MANAGEMENT ACTION" title="สั่งการบริหารทรัพยากร"
        sub="DATA → INSIGHT → DECISION → ACTION · สแกนศูนย์กีฬาแบบครบทุกด้าน" />

      {/* KPI ต้องสั่งการ */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {kpis.map((k) => (
          <button key={k.label} onClick={k.go}
            className="text-left p-4 transition-colors hover:brightness-95"
            style={{ background: C.white, border: `1px solid ${C.line}`, borderLeft: `3px solid ${k.tone === "crimson" ? C.crimson : k.tone === "gold" ? C.gold : C.navy}` }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium" style={{ color: C.slate }}>{k.label}</span>
              <k.icon size={14} style={{ color: k.tone === "crimson" ? C.crimson : k.tone === "gold" ? C.gold : C.navy }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: C.ink }}>{k.value}</div>
            {k.sub && <div className="text-[11px] mt-0.5" style={{ color: C.mute }}>{k.sub}</div>}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3">
        {[
          ["recommend", "แนะนำให้ดำเนินการ", recommended.length],
          ["quality",   "คุณภาพข้อมูล", dataQuality.reduce((s, q) => s + q.value, 0)],
          ["operations","ปฏิบัติการวันนี้", buckets.overdueBorrows.length + buckets.unassigned.length + buckets.openDamages.length],
        ].map(([k, label, count]) => (
          <button key={k} onClick={() => setTab_(k)} className="px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: tab_ === k ? C.navy : C.white, color: tab_ === k ? C.white : C.slate,
              border: `1px solid ${C.line}`,
            }}>
            {label} <span style={{ opacity: 0.7 }}>({count})</span>
          </button>
        ))}
      </div>

      {tab_ === "recommend" && (
        <div className="p-4 mb-5" style={{ background: C.white, border: `1px solid ${C.line}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: C.navy }}>รายการที่ระบบแนะนำให้ดำเนินการ</h3>
          {recommended.length === 0 ? (
            <div className="text-sm py-4 text-center" style={{ color: C.mute }}>ไม่มีอุปกรณ์ที่ต้องดำเนินการเร่งด่วนตอนนี้ ✅</div>
          ) : (
          <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: C.slate }}>
                {["อุปกรณ์", "หมวด", "สถานที่", "อัตราชำรุด", "คำแนะนำระบบ", "การดำเนินการ"].map((h) => <th key={h} className="text-left px-2 py-2 text-xs font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {recommended.map((it) => (
                <tr key={it.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-2 py-2">{it.name} <span className="text-xs" style={{ color: C.mute }}>({it.code})</span></td>
                  <td className="px-2 py-2 text-xs">{catName(it.catCode)}</td>
                  <td className="px-2 py-2 text-xs" style={{ color: C.slate }}>{it.loc || "-"}</td>
                  <td className="px-2 py-2"><Pill fg={it.rate >= 0.7 ? C.bad : it.rate >= 0.4 ? C.warn : C.ok} bg={it.rate >= 0.7 ? C.badBg : it.rate >= 0.4 ? C.warnBg : C.okBg}>{Math.round(it.rate * 100)}%</Pill></td>
                  <td className="px-2 py-2 text-xs font-semibold" style={{ color: C.navy }}>{it.rec}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1.5">
                      {["Repair", "Replace", "Procure"].map((a) => (
                        <Btn key={a} small variant={a === it.rec ? "crimson" : "ghost"} onClick={() => takeAction(it, a)}>{a}</Btn>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          )}
        </div>
      )}

      {tab_ === "quality" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {dataQuality.map((q) => (
            <div key={q.label} className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: C.slate }}>{q.label}</span>
                <Pill fg={q.value === 0 ? C.ok : C.crimson} bg={q.value === 0 ? C.okBg : C.badBg}>{q.value}</Pill>
              </div>
              {q.value === 0 ? (
                <div className="text-xs py-3 text-center" style={{ color: C.mute }}>ข้อมูลครบถ้วน ✅</div>
              ) : (
                <div className="text-xs space-y-1" style={{ color: C.slate }}>
                  <div className="mb-1 font-semibold" style={{ color: C.ink }}>ตัวอย่าง:</div>
                  {q.sample.map((s, i) => <div key={i} className="truncate">• {s}</div>)}
                  {q.value > q.sample.length && <div className="italic mt-1">...และอีก {q.value - q.sample.length} รายการ</div>}
                  <button onClick={() => setTab && setTab("inventory")} className="mt-2 text-xs font-semibold underline" style={{ color: C.navy }}>ไปหน้าครุภัณฑ์ →</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab_ === "operations" && (
        <div className="space-y-4 mb-5">
          <OpsList title="อุปกรณ์ยืมเกินกำหนดคืน" empty="ไม่มีอุปกรณ์เกินกำหนดคืน ✅" items={buckets.overdueBorrows.slice(0, 10).map((b) => ({
            key: b.id, primary: `${b.itemName} — ${b.borrower}`, secondary: `กำหนดคืน ${b.due} · ${b.where || "-"}`,
          }))} action={{ label: "ไปหน้ายืม-คืน", onClick: () => setTab && setTab("borrow") }} />
          <OpsList title="งานที่ยังไม่มีผู้รับผิดชอบ" empty="ทุกงานมีผู้รับผิดชอบครบ ✅" items={buckets.unassigned.slice(0, 10).map((t) => ({
            key: t.id, primary: t.title, secondary: `${(PRIORITY_META[t.priority] || PRIORITY_META.NORMAL).label} · ${t.dueDate ? `กำหนด ${t.dueDate}` : "ไม่มีกำหนด"}`,
          }))} action={{ label: "ไปหน้าจัดการงาน", onClick: () => setTab && setTab("tasks") }} />
          <OpsList title="แจ้งชำรุดที่รอดำเนินการ" empty="ไม่มีการแจ้งชำรุดที่ค้าง ✅" items={buckets.openDamages.slice(0, 10).map((d) => ({
            key: d.id, primary: `${d.itemName} × ${d.qty}`, secondary: `แจ้ง ${d.date} · ${d.reporter || "-"}`,
          }))} action={{ label: "ไปหน้าชำรุด-ซ่อม", onClick: () => setTab && setTab("damage") }} />
          <OpsList title="นัดซ่อมบำรุงที่เลยกำหนด" empty="ไม่มีนัดซ่อมค้าง ✅" items={buckets.pmOverdue.slice(0, 10).map((p) => ({
            key: p.id, primary: p.refName, secondary: `นัดเดิม ${p.nextDate} · ${p.cycle || "-"}`,
          }))} action={{ label: "ไปหน้าซ่อมบำรุง", onClick: () => setTab && setTab("maintenance") }} />
        </div>
      )}

      <div className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: C.navy }}><ShieldCheck size={15} /> Audit Log ล่าสุด</h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {actionsLog.length === 0 && <div className="text-sm" style={{ color: C.mute }}>ยังไม่มีการดำเนินการที่บันทึกไว้</div>}
          {actionsLog.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
              <span style={{ color: C.ink }}>{a.text}</span>
              <span style={{ color: C.mute }}>{a.user} · {new Date(a.ts).toLocaleTimeString("th-TH")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OpsList({ title, items = [], empty, action }) {
  return (
    <div className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold" style={{ color: C.navy }}>{title} <span style={{ color: C.mute, fontWeight: 400 }}>({items.length})</span></h4>
        {action && items.length > 0 && (
          <button onClick={action.onClick} className="text-xs font-semibold underline" style={{ color: C.navy }}>{action.label} →</button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="text-sm py-2" style={{ color: C.mute }}>{empty}</div>
      ) : (
        <div className="space-y-1">
          {items.map((r) => (
            <div key={r.key} className="p-2 text-xs" style={{ border: `1px solid ${C.line}` }}>
              <div className="font-medium" style={{ color: C.ink }}>{r.primary}</div>
              <div style={{ color: C.mute }}>{r.secondary}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   WORK MANAGEMENT — task list, filters, detail/comments, team workload
   L0: no access. L1/L2: their own tasks (assignee or creator), status
   updates only. L3: everyone's tasks — create, assign/reassign, filter,
   team workload. L4: everyone's tasks, read-only.
   ============================================================ */
const TASK_TYPE_LABEL = { general: "ทั่วไป", maintenance: "ซ่อมบำรุง", "follow-up": "ติดตามการคืน", inspection: "ตรวจสอบ", approval: "อนุมัติ" };
const TASK_BUCKETS = [
  ["today", "วันนี้"], ["overdue", "เกินกำหนด"], ["upcoming", "กำลังจะถึง"], ["todo", "ยังไม่กำหนด"], ["completed", "เสร็จแล้ว"],
];

function WorkManagement({ user, tasks, setTasks, staffList, items, createTask, patchTask, logAction, setTab }) {
  const manager = canManage(user.role);
  const readOnly = user.role === "L4";
  const personal = user.role === "L1" || user.role === "L2";

  const [bucket, setBucket] = useState("ALL");
  const [priorityF, setPriorityF] = useState("ALL");
  const [assigneeF, setAssigneeF] = useState("ALL");
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState(null);

  const base = personal ? tasks.filter((t) => t.assignee === user.name || t.createdBy === user.name) : tasks;
  const rows = base.filter((t) =>
    (bucket === "ALL" || taskBucket(t) === bucket) &&
    (priorityF === "ALL" || t.priority === priorityF) &&
    (assigneeF === "ALL" || t.assignee === assigneeF) &&
    (t.title.toLowerCase().includes(q.toLowerCase()) || (t.location || "").toLowerCase().includes(q.toLowerCase()))
  ).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));

  const counts = useMemo(() => {
    const c = { today: 0, overdue: 0, upcoming: 0, todo: 0, completed: 0 };
    base.forEach((t) => { const b = taskBucket(t); if (c[b] !== undefined) c[b]++; });
    return c;
  }, [base]);

  const workload = useMemo(() => {
    if (personal) return [];
    const m = {};
    tasks.forEach((t) => {
      const who = t.assignee || "ยังไม่มอบหมาย";
      m[who] = m[who] || { name: who, assigned: 0, inProgress: 0, completed: 0, overdue: 0 };
      m[who].assigned += 1;
      if (t.status === "IN_PROGRESS") m[who].inProgress += 1;
      if (t.status === "COMPLETED") m[who].completed += 1;
      if (taskBucket(t) === "overdue") m[who].overdue += 1;
    });
    return Object.values(m).sort((a, b) => b.assigned - a.assigned);
  }, [tasks, personal]);

  const assignees = useMemo(() => Array.from(new Set(tasks.map((t) => t.assignee).filter(Boolean))), [tasks]);

  const submitNew = async (form) => {
    await createTask(form);
    setShowNew(false);
  };

  return (
    <div>
      <SectionHead eyebrow="WORK MANAGEMENT" title={personal ? "งานของฉัน" : readOnly ? "ภาพรวมงานทั้งหมด" : "จัดการงาน"}
        sub={`${rows.length} งาน${personal ? " ที่มอบหมายให้คุณหรือคุณสร้างไว้" : "ในระบบ"}`}
        right={<div className="flex items-center gap-2"><Btn variant="ghost" onClick={() => setTab("profile")} icon={User}>กลับโปรไฟล์ของฉัน</Btn>{manager && <Btn onClick={() => setShowNew(true)} icon={Plus}>สร้างงานใหม่</Btn>}</div>} />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => setBucket("ALL")} className="px-3 py-1.5 text-xs font-medium" style={{ background: bucket === "ALL" ? C.navy : C.white, color: bucket === "ALL" ? C.white : C.ink, border: `1px solid ${C.line}` }}>ทั้งหมด ({base.length})</button>
        {TASK_BUCKETS.map(([key, label]) => (
          <button key={key} onClick={() => setBucket(key)} className="px-3 py-1.5 text-xs font-medium" style={{ background: bucket === key ? C.navy : C.white, color: bucket === key ? C.white : C.ink, border: `1px solid ${C.line}` }}>{label} ({counts[key] || 0})</button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: C.mute }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่องาน/สถานที่..." style={{ ...inputStyle, paddingLeft: 30 }} />
        </div>
        <select value={priorityF} onChange={(e) => setPriorityF(e.target.value)} style={{ ...inputStyle, width: 150 }}>
          <option value="ALL">ทุกความสำคัญ</option>
          {Object.keys(PRIORITY_META).map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
        </select>
        {!personal && (
          <select value={assigneeF} onChange={(e) => setAssigneeF(e.target.value)} style={{ ...inputStyle, width: 180 }}>
            <option value="ALL">ทุกคน</option>
            {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm mb-6" style={{ color: C.mute, border: `1px dashed ${C.line}`, background: C.white }}>ไม่มีงานในหมวดนี้</div>
      ) : (
        <div className="space-y-2 mb-6">
          {rows.map((t) => <TaskRow key={t.id} t={t} onOpen={() => setDetail(t)} showAssignee={!personal} />)}
        </div>
      )}

      {!personal && workload.length > 0 && (
        <div className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: C.navy }}><Users size={15} /> ภาระงานทีม (Team Workload)</h3>
          <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: C.slate }}>
                {["ผู้รับผิดชอบ", "มอบหมาย", "กำลังทำ", "เสร็จแล้ว", "เกินกำหนด", "อัตราเสร็จ"].map((h) => <th key={h} className="text-left px-2 py-2 text-xs font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {workload.map((w) => (
                <tr key={w.name} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-2 py-2">{w.name}</td>
                  <td className="px-2 py-2">{w.assigned}</td>
                  <td className="px-2 py-2">{w.inProgress}</td>
                  <td className="px-2 py-2" style={{ color: C.ok }}>{w.completed}</td>
                  <td className="px-2 py-2" style={{ color: w.overdue > 0 ? C.crimson : C.mute, fontWeight: w.overdue > 0 ? 600 : 400 }}>{w.overdue}</td>
                  <td className="px-2 py-2 w-32">
                    <div className="h-1.5 w-full" style={{ background: C.line }}>
                      <div className="h-1.5" style={{ width: `${w.assigned ? Math.round((w.completed / w.assigned) * 100) : 0}%`, background: C.ok }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showNew && (
        <Modal title="สร้างงานใหม่" onClose={() => setShowNew(false)} wide>
          <TaskForm staffList={staffList} items={items} onSubmit={submitNew} />
        </Modal>
      )}
      {detail && (
        <TaskDetailModal t={detail} user={user} manager={manager} readOnly={readOnly} staffList={staffList}
          onClose={() => setDetail(null)} patchTask={patchTask} />
      )}
    </div>
  );
}

function TaskForm({ staffList, items, onSubmit }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "NORMAL", status: "TODO", dueDate: "", dueTime: "", assignee: "", location: "", relatedResource: "", taskType: "general" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.title.trim();
  return (
    <div className="grid grid-cols-2 gap-x-4">
      <div className="col-span-2"><Field label="หัวข้องาน *"><input value={form.title} onChange={set("title")} style={inputStyle} /></Field></div>
      <div className="col-span-2"><Field label="รายละเอียด"><textarea rows={2} value={form.description} onChange={set("description")} style={inputStyle} /></Field></div>
      <Field label="ผู้รับผิดชอบ">
        <select value={form.assignee} onChange={set("assignee")} style={inputStyle}>
          <option value="">— ยังไม่มอบหมาย —</option>
          {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="ประเภทงาน">
        <select value={form.taskType} onChange={set("taskType")} style={inputStyle}>
          {Object.entries(TASK_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      <Field label="ลำดับความสำคัญ">
        <select value={form.priority} onChange={set("priority")} style={inputStyle}>
          {Object.entries(PRIORITY_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="กำหนดเสร็จ"><input type="date" value={form.dueDate} onChange={set("dueDate")} style={inputStyle} /></Field>
        <Field label="เวลา"><input type="time" value={form.dueTime} onChange={set("dueTime")} style={inputStyle} /></Field>
      </div>
      <Field label="สถานที่"><input value={form.location} onChange={set("location")} style={inputStyle} placeholder="เช่น สนามฟุตบอล" /></Field>
      <Field label="อุปกรณ์ที่เกี่ยวข้อง (ถ้ามี)">
        <select value={form.relatedResource} onChange={set("relatedResource")} style={inputStyle}>
          <option value="">— ไม่ระบุ —</option>
          {items.slice(0, 200).map((i) => <option key={i.id} value={i.code}>{i.code} — {i.name}</option>)}
        </select>
      </Field>
      <div className="col-span-2 flex justify-end mt-2">
        <Btn onClick={() => onSubmit(form)} disabled={!valid}>สร้างงาน</Btn>
      </div>
    </div>
  );
}

function TaskDetailModal({ t, user, manager, readOnly, staffList, onClose, patchTask }) {
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const sm = taskStatusDisplay(t);
  const pm = PRIORITY_META[t.priority] || PRIORITY_META.NORMAL;
  const canAct = !readOnly && (manager || t.assignee === user.name);

  const doPatch = async (patch) => {
    setSaving(true);
    try { await patchTask(t.id, patch); onClose(); } finally { setSaving(false); }
  };
  const submitComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try { await patchTask(t.id, { addComment: comment, commentBy: user.name }); setComment(""); onClose(); } finally { setSaving(false); }
  };

  return (
    <Modal title={t.title} onClose={onClose} wide>
      <div className="flex items-center gap-2 mb-4">
        <Pill fg={pm.fg} bg={pm.bg}>{pm.label}</Pill>
        <Pill fg={sm.fg} bg={sm.bg}>{sm.label}</Pill>
        {t.taskType && <Pill fg={C.navySoft} bg="#F2F3F7">{TASK_TYPE_LABEL[t.taskType] || t.taskType}</Pill>}
      </div>
      {t.description && <p className="text-sm mb-4" style={{ color: C.ink }}>{t.description}</p>}
      <div className="grid grid-cols-2 gap-3 text-xs mb-4" style={{ color: C.slate }}>
        <div>ผู้รับผิดชอบ: <b style={{ color: C.ink }}>{t.assignee || "ยังไม่มอบหมาย"}</b></div>
        <div>ผู้สร้าง: <b style={{ color: C.ink }}>{t.createdBy || "-"}</b></div>
        <div>กำหนดเสร็จ: <b style={{ color: C.ink }}>{t.dueDate || "-"} {t.dueTime}</b></div>
        <div>สถานที่: <b style={{ color: C.ink }}>{t.location || "-"}</b></div>
        {t.relatedResource && <div>อุปกรณ์ที่เกี่ยวข้อง: <b style={{ color: C.ink }}>{t.relatedResource}</b></div>}
        {t.relatedDamageId && <div>อ้างอิงการแจ้งชำรุด: <b style={{ color: C.ink }}>{t.relatedDamageId}</b></div>}
        {t.relatedBorrowId && <div>อ้างอิงการยืม: <b style={{ color: C.ink }}>{t.relatedBorrowId}</b></div>}
        <div>สร้างเมื่อ: <b style={{ color: C.ink }}>{t.createdDate ? new Date(t.createdDate).toLocaleDateString("th-TH") : "-"}</b></div>
        {t.completedDate && <div>เสร็จเมื่อ: <b style={{ color: C.ok }}>{new Date(t.completedDate).toLocaleDateString("th-TH")}</b></div>}
      </div>

      {t.comments && (
        <div className="mb-4">
          <div className="text-xs font-semibold mb-1.5" style={{ color: C.slate }}>ประวัติความคืบหน้า</div>
          <div className="p-2.5 text-xs whitespace-pre-line" style={{ background: C.paper, border: `1px solid ${C.line}`, color: C.ink, maxHeight: 140, overflowY: "auto" }}>{t.comments}</div>
        </div>
      )}

      {canAct && (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {t.status === "TODO" && <Btn small onClick={() => doPatch({ status: "IN_PROGRESS" })} disabled={saving} icon={Play}>เริ่มงาน</Btn>}
            {t.status !== "COMPLETED" && <Btn small variant="ghost" onClick={() => doPatch({ status: "COMPLETED" })} disabled={saving} icon={CheckCircle2}>ทำเครื่องหมายเสร็จ</Btn>}
            {t.status !== "WAITING" && t.status !== "COMPLETED" && <Btn small variant="ghost" onClick={() => doPatch({ status: "WAITING" })} disabled={saving}>รออะไหล่/ข้อมูล</Btn>}
            {manager && t.status !== "CANCELLED" && t.status !== "COMPLETED" && <Btn small variant="crimson" onClick={() => doPatch({ status: "CANCELLED" })} disabled={saving} icon={X}>ยกเลิกงาน</Btn>}
          </div>
          {manager && (
            <Field label="มอบหมาย / เปลี่ยนผู้รับผิดชอบ">
              <select defaultValue={t.assignee} onChange={(e) => doPatch({ assignee: e.target.value })} style={inputStyle}>
                <option value="">— ยังไม่มอบหมาย —</option>
                {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="เพิ่มความคิดเห็น / บันทึกความคืบหน้า">
            <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} style={inputStyle} />
          </Field>
          <div className="flex justify-end">
            <Btn onClick={submitComment} disabled={saving || !comment.trim()} icon={MessageSquare}>บันทึกความคิดเห็น</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ============================================================
   CALENDAR — combines My Tasks, ตารางสอน (schedule), org-wide
   activities, and preventive-maintenance reminders into one view.
   ============================================================ */
const DAY_TO_WEEKDAY = { "อาทิตย์": 0, "จันทร์": 1, "อังคาร": 2, "พุธ": 3, "พฤหัสบดี": 4, "ศุกร์": 5, "เสาร์": 6 };
const CAL_LAYERS = [
  { key: "tasks", label: "งานของฉัน (My Tasks)", color: C.crimson },
  { key: "org", label: "กิจกรรมฝ่ายกิจกรรม/องค์กร", color: "#B8860B" },
  { key: "pm", label: "นัดซ่อมบำรุงล่วงหน้า", color: "#C2660D" },
];

function combineDate(dateStr, timeStr) {
  const [y, m, d] = (dateStr || "").split("-").map(Number);
  if (!y) return null;
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (timeStr) {
    const [hh, mm] = timeStr.split(":").map(Number);
    dt.setHours(hh || 0, mm || 0);
  }
  return dt;
}

function buildCalendarEvents({ tasks, orgEvents, pmSchedule, mineOnly, userName }) {
  const events = [];
  const myTasks = mineOnly ? tasks.filter((t) => t.assignee === userName || t.createdBy === userName) : tasks;
  myTasks.forEach((t) => {
    if (!t.dueDate) return;
    const start = combineDate(t.dueDate, t.dueTime);
    if (!start) return;
    const end = t.dueTime ? new Date(start.getTime() + 60 * 60 * 1000) : start;
    events.push({ id: `T-${t.id}`, title: `📋 ${t.title}`, start, end, allDay: !t.dueTime, layer: "tasks", raw: t });
  });

  // ปฏิทินกลางไม่แสดงตารางห้อง/ตารางสอน — ดูได้ที่เมนู "ตารางสอน" แทน

  orgEvents.forEach((e) => {
    const start = combineDate(e.start);
    const end = combineDate(e.end) || start;
    if (!start) return;
    events.push({ id: `O-${e.id}`, title: `🎪 ${e.title}`, start, end, allDay: true, layer: "org", raw: e });
  });

  pmSchedule.forEach((p) => {
    const start = combineDate(p.nextDate);
    if (!start) return;
    events.push({ id: `P-${p.id}`, title: `🔧 นัดซ่อม: ${p.refName}`, start, end: start, allDay: true, layer: "pm", raw: p });
  });

  return events;
}

function CalendarView({ user, tasks, schedule, orgEvents, pmSchedule, setOrgEvents, setTab, logAction }) {
  const [visible, setVisible] = useState({ tasks: true, org: true, pm: true });
  const [view, setView] = useState("month");
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const mineOnly = user.role === "L1" || user.role === "L2";
  const manager = canManage(user.role);

  const allEvents = useMemo(
    () => buildCalendarEvents({ tasks, orgEvents, pmSchedule, mineOnly, userName: user.name }),
    [tasks, orgEvents, pmSchedule, mineOnly, user.name]
  );
  const events = allEvents.filter((e) => visible[e.layer]);

  const addEvent = async (form) => {
    const r = await postToSheetsAwait("addOrgEvent", form);
    setOrgEvents((prev) => [...prev, { id: r.id, ...form }]);
    logAction(`เพิ่มกิจกรรมองค์กร: ${form.title}`);
    setShowNew(false);
  };

  return (
    <div>
      <SectionHead eyebrow="CALENDAR" title="ปฏิทินอัจฉริยะ" sub="รวมงานส่วนตัว กิจกรรมองค์กร และนัดซ่อมบำรุงไว้ในที่เดียว (ตารางสอนดูที่เมนูตารางสอน)"
        right={manager && <Btn onClick={() => setShowNew(true)} icon={Plus}>เพิ่มกิจกรรมองค์กร</Btn>} />
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {CAL_LAYERS.map((l) => (
          <label key={l.key} className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: C.slate }}>
            <input type="checkbox" checked={visible[l.key]} onChange={() => setVisible((v) => ({ ...v, [l.key]: !v[l.key] }))} />
            <span className="w-2.5 h-2.5 inline-block" style={{ background: l.color }} /> {l.label}
          </label>
        ))}
      </div>
      <div className="p-3" style={{ background: C.white, border: `1px solid ${C.line}`, height: 640 }}>
        <BigCalendar
          localizer={calendarLocalizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          views={["month", "week", "day", "agenda"]}
          style={{ height: "100%", fontFamily: FONT }}
          onSelectEvent={(e) => setSelected(e)}
          eventPropGetter={(e) => ({ style: { background: CAL_LAYERS.find((l) => l.key === e.layer)?.color || C.navy, border: "none", fontSize: 12 } })}
          messages={{ month: "เดือน", week: "สัปดาห์", day: "วัน", agenda: "รายการ", today: "วันนี้", previous: "ก่อนหน้า", next: "ถัดไป", noEventsInRange: "ไม่มีรายการในช่วงนี้" }}
        />
      </div>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <div className="text-sm space-y-1.5" style={{ color: C.ink }}>
            <div>เวลา: {selected.allDay ? "ทั้งวัน" : `${selected.start.toLocaleString("th-TH")} – ${selected.end.toLocaleTimeString("th-TH")}`}</div>
            {selected.layer === "tasks" && (
              <>
                <div>ผู้รับผิดชอบ: {selected.raw.assignee || "-"}</div>
                <div>สถานที่: {selected.raw.location || "-"}</div>
                <button onClick={() => setTab("tasks")} className="text-xs underline mt-2" style={{ color: C.navy }}>ไปที่หน้างาน →</button>
              </>
            )}
            {selected.layer === "org" && (<><div>หน่วยงาน: {selected.raw.dept}</div><div>สถานที่: {selected.raw.loc || "-"}</div><div>{selected.raw.description}</div></>)}
            {selected.layer === "pm" && (<><div>รอบซ่อม: {selected.raw.cycle}</div><div>ผู้รับผิดชอบ: {selected.raw.owner || "-"}</div><button onClick={() => setTab("maintenance")} className="text-xs underline mt-2" style={{ color: C.navy }}>ไปที่หน้าซ่อมบำรุง →</button></>)}
          </div>
        </Modal>
      )}
      {showNew && (
        <Modal title="เพิ่มกิจกรรมองค์กร" onClose={() => setShowNew(false)}>
          <OrgEventForm onSubmit={addEvent} />
        </Modal>
      )}
    </div>
  );
}

function OrgEventForm({ onSubmit }) {
  const [form, setForm] = useState({ title: "", start: "", end: "", allDay: true, dept: "ฝ่ายกิจกรรม", owner: "", loc: "", description: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.title.trim() && form.start;
  return (
    <div>
      <Field label="ชื่องาน *"><input value={form.title} onChange={set("title")} style={inputStyle} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="วันที่เริ่ม *"><input type="date" value={form.start} onChange={set("start")} style={inputStyle} /></Field>
        <Field label="วันที่สิ้นสุด"><input type="date" value={form.end} onChange={set("end")} style={inputStyle} /></Field>
      </div>
      <Field label="หน่วยงานเจ้าของ"><input value={form.dept} onChange={set("dept")} style={inputStyle} /></Field>
      <Field label="ผู้รับผิดชอบ"><input value={form.owner} onChange={set("owner")} style={inputStyle} /></Field>
      <Field label="สถานที่"><input value={form.loc} onChange={set("loc")} style={inputStyle} /></Field>
      <Field label="รายละเอียด"><textarea rows={2} value={form.description} onChange={set("description")} style={inputStyle} /></Field>
      <div className="flex justify-end mt-2">
        <Btn onClick={() => onSubmit(form)} disabled={!valid}>บันทึก</Btn>
      </div>
    </div>
  );
}

/* ============================================================
   MAINTENANCE TRACKING — repair history log + preventive schedule
   ============================================================ */
function MaintenanceView({ user, items, repairs, setRepairs, pmSchedule, setPmSchedule, staffList, logAction }) {
  const manager = canEdit(user.role) || canManage(user.role);
  const [showRepair, setShowRepair] = useState(false);
  const [showPM, setShowPM] = useState(false);
  const [viewRepair, setViewRepair] = useState(null);   // ดูรายละเอียด/รายงานผล
  const [reportFor, setReportFor] = useState(null);     // บันทึกผลซ่อมย้อนหลัง

  const saveReport = async (id, report) => {
    if (!hasRepairReport(report)) return true;
    try {
      await postToSheetsAwait("updateRepairReport", { id, ...report });
      return true;
    } catch (e) {
      alert("บันทึกประวัติซ่อมแล้ว แต่บันทึกรายงานผลไม่สำเร็จ: " + (e.message || e) + "\n(ตรวจว่าได้ติดตั้ง Extras.gs ใน Apps Script แล้ว)");
      return false;
    }
  };
  const addRepair = async (form) => {
    const { report, ...base } = form;
    const r = await postToSheetsAwait("addRepair", base);
    const ok = await saveReport(r.id, report);
    setRepairs((prev) => [{ id: r.id, ...base, ...(ok ? report : {}) }, ...prev]);
    logAction(`บันทึกประวัติซ่อม: ${form.refName} (${form.cost.toLocaleString()} บาท)`);
    setShowRepair(false);
  };
  const updateReport = async (rep, report) => {
    const ok = await saveReport(rep.id, report);
    if (!ok) return;
    setRepairs((prev) => prev.map((x) => (x.id === rep.id ? { ...x, ...report } : x)));
    logAction(`บันทึกผลการซ่อม: ${rep.refName} — ${report.condition || report.status || ""}`);
    setReportFor(null); setViewRepair(null);
  };
  const addPM = async (form) => {
    const r = await postToSheetsAwait("addPM", form);
    setPmSchedule((prev) => [{ id: r.id, ...form }, ...prev]);
    logAction(`ตั้งนัดซ่อมล่วงหน้า: ${form.refName} วันที่ ${form.nextDate}`);
    setShowPM(false);
  };
  const totalCost = repairs.reduce((s, r) => s + r.cost, 0);

  return (
    <div>
      <SectionHead eyebrow="MAINTENANCE" title="ซ่อมบำรุง" sub={`ประวัติซ่อม ${repairs.length} ครั้ง · รวม ${totalCost.toLocaleString()} บาท`}
        right={manager && (
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setShowPM(true)} icon={CalendarClock}>ตั้งนัดซ่อมล่วงหน้า</Btn>
            <Btn onClick={() => setShowRepair(true)} icon={Plus}>บันทึกประวัติซ่อม</Btn>
          </div>
        )} />

      <div className="mb-4">
        <h3 className="text-sm font-bold mb-2" style={{ color: C.navy }}>แผนซ่อมล่วงหน้า (Preventive Maintenance)</h3>
        {pmSchedule.length === 0 ? (
          <div className="p-4 text-center text-sm mb-4" style={{ color: C.mute, border: `1px dashed ${C.line}`, background: C.white }}>ยังไม่มีนัดซ่อมล่วงหน้า</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {pmSchedule.map((p) => (
              <div key={p.id} className="p-3" style={{ background: C.white, border: `1px solid ${C.line}`, borderLeft: `3px solid #C2660D` }}>
                <div className="text-sm font-semibold" style={{ color: C.ink }}>{p.refName}</div>
                <div className="text-xs mt-1" style={{ color: C.slate }}>รอบ: {p.cycle || "-"} · นัดถัดไป: <b>{p.nextDate}</b></div>
                <div className="text-xs" style={{ color: C.mute }}>ผู้รับผิดชอบ: {p.owner || "-"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="text-sm font-bold mb-2" style={{ color: C.navy }}>ประวัติการซ่อม</h3>
      {repairs.length === 0 ? (
        <div className="p-8 text-center text-sm" style={{ color: C.mute, border: `1px dashed ${C.line}`, background: C.white }}>ยังไม่มีประวัติการซ่อมในระบบ</div>
      ) : (
        <div className="table-scroll" style={{ border: `1px solid ${C.line}`, background: C.white }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: C.navy, color: C.white }}>
                {["วันที่ซ่อม", "อุปกรณ์/สถานที่", "รายละเอียด", "ค่าใช้จ่าย", "ผู้รับผิดชอบ", "ร้าน/ช่าง", "ผลการซ่อม"].map((h) => <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {repairs.map((r) => (
                <tr key={r.id} onClick={() => setViewRepair(r)} className="cursor-pointer hover:bg-gray-50" style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-3 py-2 text-xs">{r.date}</td>
                  <td className="px-3 py-2 text-sm">{r.refName}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: C.slate }}>{r.description}</td>
                  <td className="px-3 py-2 text-xs font-mono">{r.cost.toLocaleString()} ฿</td>
                  <td className="px-3 py-2 text-xs">{r.owner}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: C.mute }}>{r.vendor || "-"}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.condition ? (
                      <Pill fg={conditionTone(r.condition).fg} bg={conditionTone(r.condition).bg}>{r.condition}</Pill>
                    ) : manager ? (
                      <button onClick={(e) => { e.stopPropagation(); setReportFor(r); }} className="underline" style={{ color: C.crimson }}>+ บันทึกผล</button>
                    ) : <span style={{ color: C.mute }}>-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRepair && (
        <Modal title="บันทึกประวัติซ่อม" onClose={() => setShowRepair(false)} wide>
          <RepairForm items={items} staffList={staffList} onSubmit={addRepair} />
        </Modal>
      )}
      {viewRepair && (
        <Modal title="รายละเอียดการซ่อม" onClose={() => setViewRepair(null)} wide>
          <RepairDetail r={viewRepair} />
          {manager && (
            <div className="flex justify-end mt-4">
              <Btn onClick={() => { setReportFor(viewRepair); setViewRepair(null); }} icon={Pencil}>{viewRepair.condition ? "แก้ไขรายงานผล" : "บันทึกผลการซ่อม"}</Btn>
            </div>
          )}
        </Modal>
      )}
      {reportFor && (
        <Modal title={`รายงานผลการซ่อม — ${reportFor.refName}`} onClose={() => setReportFor(null)} wide>
          <RepairReportFields initial={reportFor} onSubmit={(report) => updateReport(reportFor, report)} submitLabel="บันทึกผลการซ่อม" />
        </Modal>
      )}
      {showPM && (
        <Modal title="ตั้งนัดซ่อมล่วงหน้า" onClose={() => setShowPM(false)} wide>
          <PMForm items={items} staffList={staffList} onSubmit={addPM} />
        </Modal>
      )}
    </div>
  );
}

const TODAY_STR = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD ตามเวลาเครื่อง
const REPAIR_STATUSES = ["เสร็จสิ้น", "กำลังซ่อม", "รออะไหล่", "ซ่อมไม่ได้"];
const REPAIR_CONDITIONS = ["ใช้งานได้ปกติ", "ใช้งานได้บางส่วน", "ใช้งานไม่ได้ ต้องเปลี่ยนใหม่", "รอตรวจสอบซ้ำ"];
function conditionTone(c) {
  if (c === "ใช้งานได้ปกติ") return { fg: C.ok, bg: C.okBg };
  if (c === "ใช้งานได้บางส่วน" || c === "รอตรวจสอบซ้ำ") return { fg: C.warn, bg: C.warnBg };
  return { fg: C.bad, bg: C.badBg };
}
function hasRepairReport(r) {
  return !!(r && (r.condition || r.result || r.recommendation || r.warrantyUntil || r.reportUrl || r.status));
}

// ส่วนรายงานผลการซ่อม — ใช้ทั้งตอนบันทึกใหม่ และตอนบันทึกผลย้อนหลัง
function RepairReportFields({ initial = {}, onChange, onSubmit, submitLabel }) {
  const [rep, setRep] = useState({
    status: initial.status || "เสร็จสิ้น", condition: initial.condition || "", result: initial.result || "",
    recommendation: initial.recommendation || "", warrantyUntil: initial.warrantyUntil || "", reportUrl: initial.reportUrl || "",
  });
  const set = (k) => (e) => setRep((r) => { const n = { ...r, [k]: e.target.value }; onChange && onChange(n); return n; });
  const urlOk = !rep.reportUrl || /^https?:\/\//i.test(rep.reportUrl.trim());
  return (
    <div className="grid grid-cols-2 gap-x-4">
      <Field label="สถานะงานซ่อม">
        <select value={rep.status} onChange={set("status")} style={inputStyle}>{REPAIR_STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
      </Field>
      <Field label="สภาพหลังซ่อม">
        <select value={rep.condition} onChange={set("condition")} style={inputStyle}>
          <option value="">— ยังไม่ระบุ —</option>{REPAIR_CONDITIONS.map((x) => <option key={x}>{x}</option>)}
        </select>
      </Field>
      <div className="col-span-2">
        <Field label="ผลการซ่อม (ช่าง/หน่วยงานภายนอกแจ้งว่าอย่างไร)">
          <textarea rows={3} value={rep.result} onChange={set("result")} style={inputStyle} placeholder="เช่น เปลี่ยนมอเตอร์ใหม่ ทดสอบแล้วใช้งานได้ปกติ / พบว่าแผงวงจรเสีย ต้องสั่งอะไหล่" />
        </Field>
      </div>
      <div className="col-span-2">
        <Field label="คำแนะนำเพิ่มเติมจากช่าง">
          <textarea rows={2} value={rep.recommendation} onChange={set("recommendation")} style={inputStyle} placeholder="เช่น ควรทำความสะอาดทุก 3 เดือน / ไม่ควรใช้งานเกินวันละ 4 ชม. / ควรเปลี่ยนใหม่ภายใน 1 ปี" />
        </Field>
      </div>
      <Field label="รับประกันงานซ่อมถึง"><input type="date" value={rep.warrantyUntil} onChange={set("warrantyUntil")} style={inputStyle} /></Field>
      <Field label="ลิงก์ใบรายงาน/ใบเสร็จ (ถ้ามี)">
        <input value={rep.reportUrl} onChange={set("reportUrl")} style={{ ...inputStyle, borderColor: urlOk ? C.line : C.bad }} placeholder="https://drive.google.com/..." />
      </Field>
      {onSubmit && (
        <div className="col-span-2 flex justify-end mt-2"><Btn onClick={() => onSubmit(rep)} disabled={!urlOk}>{submitLabel || "บันทึก"}</Btn></div>
      )}
    </div>
  );
}

function RepairDetail({ r }) {
  const row = (label, value) => (
    <div className="py-2" style={{ borderBottom: `1px solid ${C.line}` }}>
      <div className="text-[11px] font-semibold" style={{ color: C.mute }}>{label}</div>
      <div className="text-sm whitespace-pre-line" style={{ color: C.ink }}>{value || "-"}</div>
    </div>
  );
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4">
        {row("อุปกรณ์/สถานที่", r.refName)}
        {row("วันที่ซ่อม", r.date)}
        {row("ร้าน/ช่าง", r.vendor)}
        {row("ค่าใช้จ่าย", `${(r.cost || 0).toLocaleString()} บาท`)}
        {row("ผู้รับผิดชอบ", r.owner)}
        {row("สถานะ", r.status)}
      </div>
      {row("รายละเอียด/อาการที่แจ้งซ่อม", r.description)}
      <div className="mt-4 p-3" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-bold" style={{ color: C.navy }}>รายงานผลการซ่อม</div>
          {r.condition && <Pill fg={conditionTone(r.condition).fg} bg={conditionTone(r.condition).bg}>{r.condition}</Pill>}
        </div>
        {row("ผลการซ่อม", r.result)}
        {row("คำแนะนำเพิ่มเติมจากช่าง", r.recommendation)}
        {row("รับประกันถึง", r.warrantyUntil)}
        {r.reportUrl && <a href={r.reportUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold inline-flex items-center gap-1 mt-2" style={{ color: C.navy }}>เปิดใบรายงาน/ใบเสร็จ <ExternalLink size={12} /></a>}
      </div>
    </div>
  );
}

function RepairForm({ items, staffList, onSubmit }) {
  const [form, setForm] = useState({ ref: "", refName: "", date: TODAY_STR(), description: "", cost: 0, owner: "", vendor: "", receiptUrl: "" });
  const [report, setReport] = useState({ status: "เสร็จสิ้น" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pickItem = (e) => { const it = items.find((i) => i.code === e.target.value); setForm((f) => ({ ...f, ref: it?.code || "", refName: it ? `${it.name} (${it.code})` : "" })); };
  const valid = form.refName.trim() && form.date;
  const submit = async () => {
    setBusy(true);
    try { await onSubmit({ ...form, status: report.status, receiptUrl: report.reportUrl || form.receiptUrl, report }); }
    catch (e) { alert(e.message || "บันทึกไม่สำเร็จ"); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="อุปกรณ์ (เลือกจากทะเบียน)">
          <select onChange={pickItem} style={inputStyle}><option value="">— เลือก —</option>{items.slice(0, 200).map((i) => <option key={i.id} value={i.code}>{i.code} — {i.name}</option>)}</select>
        </Field>
        <Field label="หรือพิมพ์ชื่ออุปกรณ์/สถานที่เอง *"><input value={form.refName} onChange={set("refName")} style={inputStyle} /></Field>
        <Field label="วันที่ซ่อม"><input type="date" value={form.date} onChange={set("date")} style={inputStyle} /></Field>
        <Field label="ค่าใช้จ่าย (บาท)"><input type="number" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: Number(e.target.value) }))} style={inputStyle} /></Field>
        <Field label="ผู้รับผิดชอบ">
          <select value={form.owner} onChange={set("owner")} style={inputStyle}><option value="">— เลือก —</option>{staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
        </Field>
        <Field label="ร้าน/ช่าง/หน่วยงานภายนอก"><input value={form.vendor} onChange={set("vendor")} style={inputStyle} /></Field>
        <div className="col-span-2"><Field label="รายละเอียด/อาการที่แจ้งซ่อม"><textarea rows={2} value={form.description} onChange={set("description")} style={inputStyle} /></Field></div>
      </div>
      <div className="mt-2 mb-2 pt-3 text-sm font-bold" style={{ color: C.navy, borderTop: `1px solid ${C.line}` }}>
        รายงานผลการซ่อมจากหน่วยงานภายนอก <span className="text-xs font-normal" style={{ color: C.mute }}>— กรอกทีหลังได้ ถ้ายังซ่อมไม่เสร็จ</span>
      </div>
      <RepairReportFields initial={report} onChange={setReport} />
      <div className="flex justify-end mt-2"><Btn onClick={submit} disabled={!valid || busy}>{busy ? "กำลังบันทึก..." : "บันทึก"}</Btn></div>
    </div>
  );
}

function PMForm({ items, staffList, onSubmit }) {
  const [form, setForm] = useState({ ref: "", refName: "", cycle: "ทุก 6 เดือน", nextDate: "", owner: "", note: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pickItem = (e) => { const it = items.find((i) => i.code === e.target.value); setForm((f) => ({ ...f, ref: it?.code || "", refName: it ? `${it.name} (${it.code})` : "" })); };
  const valid = form.refName.trim() && form.nextDate;
  return (
    <div className="grid grid-cols-2 gap-x-4">
      <Field label="อุปกรณ์ (เลือกจากทะเบียน)">
        <select onChange={pickItem} style={inputStyle}><option value="">— เลือก —</option>{items.slice(0, 200).map((i) => <option key={i.id} value={i.code}>{i.code} — {i.name}</option>)}</select>
      </Field>
      <Field label="หรือพิมพ์ชื่ออุปกรณ์/สถานที่เอง *"><input value={form.refName} onChange={set("refName")} style={inputStyle} /></Field>
      <Field label="รอบซ่อม"><input value={form.cycle} onChange={set("cycle")} style={inputStyle} placeholder="เช่น ทุก 6 เดือน" /></Field>
      <Field label="วันนัดถัดไป *"><input type="date" value={form.nextDate} onChange={set("nextDate")} style={inputStyle} /></Field>
      <Field label="ผู้รับผิดชอบ">
        <select value={form.owner} onChange={set("owner")} style={inputStyle}><option value="">— เลือก —</option>{staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
      </Field>
      <div className="col-span-2"><Field label="หมายเหตุ"><textarea rows={2} value={form.note} onChange={set("note")} style={inputStyle} /></Field></div>
      <div className="col-span-2 flex justify-end mt-2"><Btn onClick={() => onSubmit(form)} disabled={!valid}>บันทึกนัดหมาย — จะขึ้นบนปฏิทินกลางอัตโนมัติ</Btn></div>
    </div>
  );
}

/* ============================================================
   KNOWLEDGE BASE — documents/manuals/policies, files live in Drive
   ============================================================ */
const DOC_CATEGORIES = ["คู่มือการใช้งาน", "กฎระเบียบการยืมอุปกรณ์", "ขั้นตอนแจ้งซ่อม", "ขั้นตอนเบิกจ่าย", "อื่นๆ"];
const DOC_ICON_OPTIONS = [
  { key: "book", label: "คู่มือ", Icon: BookOpen },
  { key: "file", label: "เอกสาร", Icon: FileText },
  { key: "repair", label: "ซ่อมบำรุง", Icon: Wrench },
  { key: "policy", label: "ระเบียบ", Icon: ShieldCheck },
  { key: "sport", label: "กีฬา", Icon: Trophy },
  { key: "schedule", label: "ตาราง", Icon: CalendarDays },
];
function DocIcon({ name = "book", ...props }) {
  const Icon = DOC_ICON_OPTIONS.find((option) => option.key === name)?.Icon || BookOpen;
  return <Icon {...props} />;
}

function docToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(",")[1]);
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

function KnowledgeBase({ user, docs, setDocs, logAction }) {
  const manager = canManage(user.role);
  const [cat, setCat] = useState("ALL");
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = docs.filter((d) => (cat === "ALL" || d.category === cat) && d.title.toLowerCase().includes(q.toLowerCase()));

  const upload = async ({ title, category, file, url, icon }) => {
    if (!API_URL) { alert("ยังไม่ได้เชื่อมต่อ Google Sheets backend"); return; }
    let r;
    if (url) {
      // วางลิงก์ (Google Drive / Docs / เว็บไซต์) — ไม่ต้องอัปโหลดไฟล์
      r = await postToSheetsAwait("addDocLink", { title, category, url, uploadedBy: user.name });
      r = { ...r, url };
    } else {
      const base64 = await docToBase64(file);
      r = await postToSheetsAwait("uploadDoc", { title, category, filename: file.name, mimeType: file.type, base64, uploadedBy: user.name });
    }
    saveDocIcon(r.id, icon);
    setDocs((prev) => [{ id: r.id, title, category, url: r.url, uploadedBy: user.name, updatedDate: new Date().toLocaleDateString("sv-SE"), version: "1", icon }, ...prev]);
    logAction(`${url ? "เพิ่มลิงก์เอกสาร" : "อัปโหลดเอกสาร"}: ${title}`);
    setShowNew(false);
  };
  const del = async (d) => {
    await postToSheetsAwait("deleteDoc", { id: d.id });
    setDocs((prev) => prev.filter((x) => x.id !== d.id));
    logAction(`ลบเอกสาร: ${d.title}`);
    setConfirmDel(null);
  };

  return (
    <div>
      <SectionHead eyebrow="KNOWLEDGE BASE" title="คลังความรู้และแนวปฏิบัติ" sub="คู่มือ กฎระเบียบ ขั้นตอนการทำงานของศูนย์กีฬา"
        right={manager && <Btn onClick={() => setShowNew(true)} icon={Upload}>อัปโหลดเอกสาร</Btn>} />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: C.mute }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาเอกสาร..." style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ ...inputStyle, width: 220 }}>
          <option value="ALL">ทุกหมวด</option>
          {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-sm" style={{ color: C.mute, border: `1px dashed ${C.line}`, background: C.white }}>ยังไม่มีเอกสารในระบบ</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((d) => (
            <div key={d.id} className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
              <div className="flex items-start gap-3 mb-2">
                <BookOpen size={18} style={{ color: C.navy, marginTop: 2 }} />
                                <DocIcon name={d.icon} size={18} style={{ color: C.navy, marginTop: 2 }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate" style={{ color: C.ink }}>{d.title}</div>
                  <div className="text-xs" style={{ color: C.mute }}>{d.category} · v{d.version}</div>
                </div>
              </div>
              <div className="text-xs mb-3" style={{ color: C.slate }}>อัปโหลดโดย {d.uploadedBy} · {d.updatedDate}</div>
              <div className="flex items-center justify-between">
                <a href={d.url} target="_blank" rel="noreferrer" className="text-xs font-semibold flex items-center gap-1" style={{ color: C.navy }}>เปิดเอกสาร <ExternalLink size={12} /></a>
                {manager && <button onClick={() => setConfirmDel(d)}><X size={14} style={{ color: C.crimson }} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {showNew && (
        <Modal title="เพิ่มเอกสาร" onClose={() => setShowNew(false)}>
          <DocUploadForm onSubmit={upload} />
        </Modal>
      )}
      {confirmDel && (
        <Modal title="ยืนยันการลบ" onClose={() => setConfirmDel(null)}>
          <p className="text-sm mb-4" style={{ color: C.ink }}>ลบเอกสาร <b>{confirmDel.title}</b> ใช่หรือไม่?</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setConfirmDel(null)}>ยกเลิก</Btn>
            <Btn variant="crimson" onClick={() => del(confirmDel)} icon={X}>ยืนยันลบ</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DocUploadForm({ onSubmit }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(DOC_CATEGORIES[0]);
    const [icon, setIcon] = useState("book");
  const [mode, setMode] = useState("file"); // "file" = อัปโหลดไฟล์, "url" = วางลิงก์
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const urlOk = /^https?:\/\/\S+$/i.test(url.trim());
  const ready = title.trim() && (mode === "file" ? !!file : urlOk);
  const submit = async () => {
    setBusy(true);
    try { await onSubmit(mode === "file" ? { title, category, file, icon } : { title, category, url: url.trim(), icon }); }
    catch (e) { alert(e.message || "บันทึกไม่สำเร็จ"); }
    finally { setBusy(false); }
  };
  const tab = (key, label, Icon) => (
    <button type="button" onClick={() => setMode(key)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold"
      style={mode === key ? { background: C.navy, color: C.white } : { background: C.white, color: C.slate }}>
      <Icon size={13} /> {label}
    </button>
  );
  return (
    <div>
      <Field label="ชื่อเอกสาร *"><input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} /></Field>
      <Field label="หมวดหมู่">
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>{DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </Field>
      <Field label="ไอคอนเอกสาร">
        <div className="grid grid-cols-3 gap-2">
          {DOC_ICON_OPTIONS.map(({ key, label, Icon }) => (
            <button key={key} type="button" onClick={() => setIcon(key)} className="flex items-center justify-center gap-2 px-2 py-2 text-xs font-semibold"
              style={{ background: icon === key ? C.navy : C.white, color: icon === key ? C.white : C.slate, border: `1px solid ${icon === key ? C.navy : C.line}` }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="ที่มาของเอกสาร *">
        <div className="flex mb-2" style={{ border: `1px solid ${C.line}` }}>
          {tab("file", "อัปโหลดไฟล์", Upload)}
          {tab("url", "วางลิงก์ URL", ExternalLink)}
        </div>
        {mode === "file" ? (
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={inputStyle} />
        ) : (
          <>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/... หรือ https://docs.google.com/..."
              style={{ ...inputStyle, borderColor: url && !urlOk ? C.bad : C.line }} />
            <div className="text-[11px] mt-1" style={{ color: url && !urlOk ? C.bad : C.mute }}>
              {url && !urlOk ? "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://" : "ถ้าเป็นไฟล์ใน Google Drive ให้ตั้งค่าแชร์เป็น \"ทุกคนที่มีลิงก์\" ก่อน"}
            </div>
          </>
        )}
      </Field>
      <div className="flex justify-end mt-2">
        <Btn onClick={submit} disabled={!ready || busy}>{busy ? "กำลังบันทึก..." : mode === "file" ? "อัปโหลด" : "บันทึกลิงก์"}</Btn>
      </div>
    </div>
  );
}

/* ============================================================
   BUDGET — role-filtered on the SERVER (not just hidden in UI).
   L1/L2 only ever receive their own project(s); L3 manages
   everything; L4 sees everything read-only. See _budgetData in
   Code.gs — this is the one module that is NOT in the public
   doGet payload.
   ============================================================ */
function BudgetView({ user, staffList, logAction }) {
  const [data, setData] = useState(null);
  const [loadingB, setLoadingB] = useState(true);
  const [err, setErr] = useState("");
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [expenseFor, setExpenseFor] = useState(null);
  const [confirmDelBudget, setConfirmDelBudget] = useState(null);
  const [codeSearch, setCodeSearch] = useState("");
  const manager = canManage(user.role);
  const readOnly = user.role === "L4";

  const reload = useCallback(() => {
    setLoadingB(true);
    loadBudgetData(user.id).then((d) => { setData(d); setErr(""); }).catch((e) => setErr(e.message)).finally(() => setLoadingB(false));
  }, [user.id]);
  useEffect(() => { reload(); }, [reload]);

  if (loadingB) return <div className="p-8 text-center text-sm" style={{ color: C.mute }}>กำลังโหลดข้อมูลงบประมาณ...</div>;
  if (!API_URL) return <div className="p-8 text-center text-sm" style={{ color: C.mute, border: `1px dashed ${C.line}`, background: C.white }}>โมดูลงบประมาณต้องเชื่อมต่อ Google Sheets backend ก่อนใช้งาน</div>;
  if (err) return <div className="p-6 text-sm" style={{ color: C.crimson, background: C.badBg, border: `1px solid #E9B9C1` }}>{err}</div>;

  const spentFor = (budgetId) => data.expenses.filter((e) => e.budgetId === budgetId && e.approvalStatus !== "ปฏิเสธ").reduce((s, e) => s + e.amount, 0);
  const totalIncome = data.income.reduce((s, i) => s + i.amount, 0);
  const totalBudget = data.budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = data.budgets.reduce((s, b) => s + spentFor(b.id), 0);

  const submitBudget = async (form) => {
    const r = await postToSheetsAwait("addBudget", { teacherId: user.id, ...form });
    if (r.error) { alert(r.error); return; }
    logAction(`สร้างโครงการงบประมาณ: ${form.name}`);
    setShowNewBudget(false); reload();
  };
  const submitIncome = async (form) => {
    const r = await postToSheetsAwait("addIncome", { teacherId: user.id, ...form });
    if (r.error) { alert(r.error); return; }
    logAction(`บันทึกรายรับ: ${form.type} ${form.amount} บาท`);
    setShowIncome(false); reload();
  };
  const submitExpense = async (form) => {
    const r = await postToSheetsAwait("addExpense", { teacherId: user.id, budgetId: expenseFor.id, ...form });
    if (r.error) { alert(r.error); return; }
    logAction(`เบิกจ่าย: ${form.item} ${form.amount} บาท (${expenseFor.name})`);
    setExpenseFor(null); reload();
  };
  const approveExpense = async (e, status) => {
    const r = await postToSheetsAwait("updateExpenseStatus", { teacherId: user.id, id: e.id, status });
    if (r.error) { alert(r.error); return; }
    logAction(`${status} รายจ่าย: ${e.item}`);
    reload();
  };
  const deleteBudget = async (b) => {
    const r = await postToSheetsAwait("deleteBudget", { teacherId: user.id, id: b.id });
    if (r.error) { alert(r.error); return; }
    logAction(`ลบโครงการงบประมาณ: ${b.name}`);
    setConfirmDelBudget(null); reload();
  };

  return (
    <div>
      <SectionHead eyebrow="BUDGET" title={data.isManager ? "ภาพรวมงบประมาณศูนย์กีฬา" : "งบประมาณของฉัน"}
        sub={data.isManager ? "เห็นทุกโครงการ — เฉพาะ L3/L4 เท่านั้นที่เข้าถึงมุมมองนี้ได้ ข้อมูลกรองจากฝั่งเซิร์ฟเวอร์" : `เห็นเฉพาะโครงการที่คุณรับผิดชอบ (${data.budgets.length} โครงการ)`}
        right={manager && (
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setShowIncome(true)} icon={Plus}>บันทึกรายรับ</Btn>
            <Btn onClick={() => setShowNewBudget(true)} icon={Plus}>สร้างโครงการงบประมาณ</Btn>
          </div>
        )} />

      {data.isManager && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard label="รายรับรวม" value={`${totalIncome.toLocaleString()} ฿`} tone="ok" icon={DollarSign} />
          <StatCard label="งบที่จัดสรรรวม" value={`${totalBudget.toLocaleString()} ฿`} tone="navy" icon={ClipboardList} />
          <StatCard label="เบิกจ่ายไปแล้ว" value={`${totalSpent.toLocaleString()} ฿`} tone="crimson" icon={TrendingUp} />
        </div>
      )}

      {data.budgets.length > 0 && (
        <div className="mb-4">
          <Field label="ค้นหาด้วยเลขที่งบประมาณ">
            <input
              value={codeSearch}
              onChange={(e) => setCodeSearch(e.target.value)}
              placeholder="พิมพ์เลขที่งบประมาณ เช่น B2569-001"
              style={{ ...inputStyle, maxWidth: 320 }}
            />
          </Field>
          {codeSearch.trim() && (() => {
            const hit = data.budgets.find((b) => b.code && b.code.toLowerCase().includes(codeSearch.trim().toLowerCase()));
            return (
              <div className="text-xs mt-1" style={{ color: hit ? C.ok : C.mute }}>
                {hit ? `พบโครงการ: ${hit.name} (ผู้รับผิดชอบ: ${hit.owner})` : "ไม่พบโครงการที่มีเลขนี้"}
              </div>
            );
          })()}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        {data.budgets.length === 0 && <div className="col-span-2 p-6 text-center text-sm" style={{ color: C.mute, border: `1px dashed ${C.line}`, background: C.white }}>{data.isManager ? "ยังไม่มีโครงการงบประมาณในระบบ" : "คุณยังไม่ได้รับมอบหมายงบประมาณ/โครงการใด"}</div>}
        {data.budgets
          .filter((b) => !codeSearch.trim() || (b.code && b.code.toLowerCase().includes(codeSearch.trim().toLowerCase())))
          .map((b) => {
          const spent = spentFor(b.id);
          const remain = b.amount - spent;
          const pct = b.amount ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
          const myExpenses = data.expenses.filter((e) => e.budgetId === b.id);
          return (
            <div key={b.id} className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
              <div className="flex items-center justify-between mb-1">
                <div className="min-w-0">
                  <div className="text-sm font-bold" style={{ color: C.ink }}>{b.name}</div>
                  {b.code && <div className="text-xs font-mono" style={{ color: C.mute }}>เลขที่ {b.code}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Pill fg={remain >= 0 ? C.ok : C.bad} bg={remain >= 0 ? C.okBg : C.badBg}>{b.status}</Pill>
                  {manager && (
                    <button onClick={() => setConfirmDelBudget(b)} title="ลบโครงการ">
                      <X size={14} style={{ color: C.crimson }} />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs mb-2" style={{ color: C.mute }}>{b.dept} · ผู้รับผิดชอบ: {b.owner} · {b.startDate}–{b.endDate}</div>
              <div className="h-2 w-full mb-1" style={{ background: C.line }}>
                <div className="h-2" style={{ width: `${pct}%`, background: pct >= 90 ? C.crimson : C.navy }} />
              </div>
              <div className="flex items-center justify-between text-xs mb-3" style={{ color: C.slate }}>
                <span>ใช้ไป {spent.toLocaleString()} / {b.amount.toLocaleString()} ฿</span>
                <span style={{ color: remain >= 0 ? C.ok : C.crimson, fontWeight: 600 }}>คงเหลือ {remain.toLocaleString()} ฿</span>
              </div>
              {myExpenses.length > 0 && (
                <div className="space-y-1 mb-3 max-h-28 overflow-y-auto">
                  {myExpenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs px-2 py-1" style={{ background: C.paper }}>
                      <span className="truncate">{e.date} · {e.item}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono">{e.amount.toLocaleString()}฿</span>
                        {e.approvalStatus === "รออนุมัติ" && manager ? (
                          <div className="flex gap-1">
                            <button onClick={() => approveExpense(e, "อนุมัติ")}><CheckCircle2 size={13} style={{ color: C.ok }} /></button>
                            <button onClick={() => approveExpense(e, "ปฏิเสธ")}><X size={13} style={{ color: C.crimson }} /></button>
                          </div>
                        ) : (
                          <Pill fg={e.approvalStatus === "อนุมัติ" ? C.ok : e.approvalStatus === "ปฏิเสธ" ? C.crimson : C.warn} bg={C.paper}>{e.approvalStatus}</Pill>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!readOnly && (String(b.owner) === String(user.id) || manager) && (
                <Btn small variant="ghost" onClick={() => setExpenseFor(b)} icon={Plus}>บันทึกการเบิกจ่าย</Btn>
              )}
            </div>
          );
        })}
      </div>

      {data.isManager && data.income.length > 0 && (
        <div className="p-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: C.navy }}>รายรับ</h3>
          <table className="w-full text-sm">
            <thead><tr style={{ color: C.slate }}>{["วันที่", "ประเภท", "จำนวนเงิน", "ผู้รับเงิน", "หมายเหตุ"].map((h) => <th key={h} className="text-left px-2 py-2 text-xs font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {data.income.map((i) => (
                <tr key={i.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-2 py-2 text-xs">{i.date}</td><td className="px-2 py-2 text-sm">{i.type}</td>
                  <td className="px-2 py-2 text-xs font-mono" style={{ color: C.ok }}>{i.amount.toLocaleString()} ฿</td>
                  <td className="px-2 py-2 text-xs">{i.receivedBy}</td><td className="px-2 py-2 text-xs" style={{ color: C.mute }}>{i.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNewBudget && <Modal title="สร้างโครงการงบประมาณ" onClose={() => setShowNewBudget(false)} wide><BudgetForm staffList={staffList} onSubmit={submitBudget} /></Modal>}
      {showIncome && <Modal title="บันทึกรายรับ" onClose={() => setShowIncome(false)}><IncomeForm onSubmit={submitIncome} /></Modal>}
      {expenseFor && <Modal title={`บันทึกการเบิกจ่าย — ${expenseFor.name}`} onClose={() => setExpenseFor(null)}><ExpenseForm onSubmit={submitExpense} /></Modal>}
      {confirmDelBudget && (
        <Modal title="ยืนยันการลบโครงการ" onClose={() => setConfirmDelBudget(null)}>
          <div className="text-sm mb-4" style={{ color: C.ink }}>
            ต้องการลบโครงการ "<strong>{confirmDelBudget.name}</strong>" ใช่หรือไม่? รายการเบิกจ่ายทั้งหมดของโครงการนี้จะถูกลบไปด้วย และกู้คืนไม่ได้
          </div>
          <div className="flex gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setConfirmDelBudget(null)}>ยกเลิก</Btn>
            <Btn variant="crimson" onClick={() => deleteBudget(confirmDelBudget)}>ลบโครงการ</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BudgetForm({ staffList, onSubmit }) {
  const [form, setForm] = useState({ name: "", budgetCode: "", owner: "", dept: "ศูนย์กีฬา", amount: 0, startDate: "2026-09-17", endDate: "", approvedBy: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() && form.owner;
  return (
    <div className="grid grid-cols-2 gap-x-4">
      <div className="col-span-2"><Field label="ชื่อโครงการ *"><input value={form.name} onChange={set("name")} style={inputStyle} /></Field></div>
      <div className="col-span-2"><Field label="เลขที่งบประมาณ"><input value={form.budgetCode} onChange={set("budgetCode")} placeholder="เช่น B2569-001" style={inputStyle} /></Field></div>
      <Field label="มอบหมายให้ (ผู้รับผิดชอบ) *">
        <select value={form.owner} onChange={set("owner")} style={inputStyle}>
          <option value="">— เลือกบุคลากร —</option>
          {staffList.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
        </select>
      </Field>
      <Field label="หน่วยงาน"><input value={form.dept} onChange={set("dept")} style={inputStyle} /></Field>
      <Field label="งบที่ได้รับ (บาท)"><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} style={inputStyle} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="วันที่เริ่ม"><input type="date" value={form.startDate} onChange={set("startDate")} style={inputStyle} /></Field>
        <Field label="วันที่สิ้นสุด"><input type="date" value={form.endDate} onChange={set("endDate")} style={inputStyle} /></Field>
      </div>
      <div className="col-span-2 flex justify-end mt-2"><Btn onClick={() => onSubmit(form)} disabled={!valid}>สร้างโครงการ</Btn></div>
    </div>
  );
}

function IncomeForm({ onSubmit }) {
  const [form, setForm] = useState({ date: "2026-09-17", type: "ค่าเช่าสนาม", amount: 0, receivedBy: "", receiptRef: "", note: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div>
      <Field label="วันที่"><input type="date" value={form.date} onChange={set("date")} style={inputStyle} /></Field>
      <Field label="ประเภท">
        <select value={form.type} onChange={set("type")} style={inputStyle}>
          <option>ค่าเช่าสนาม</option><option>ค่าสมาชิก</option><option>อื่นๆ</option>
        </select>
      </Field>
      <Field label="จำนวนเงิน (บาท)"><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} style={inputStyle} /></Field>
      <Field label="ผู้รับเงิน"><input value={form.receivedBy} onChange={set("receivedBy")} style={inputStyle} /></Field>
      <Field label="หมายเหตุ"><textarea rows={2} value={form.note} onChange={set("note")} style={inputStyle} /></Field>
      <div className="flex justify-end mt-2"><Btn onClick={() => onSubmit(form)} disabled={!form.amount}>บันทึก</Btn></div>
    </div>
  );
}

function ExpenseForm({ onSubmit }) {
  const [form, setForm] = useState({ date: "2026-09-17", item: "", amount: 0, note: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.item.trim() && form.amount > 0;
  return (
    <div>
      <Field label="วันที่"><input type="date" value={form.date} onChange={set("date")} style={inputStyle} /></Field>
      <Field label="รายการ *"><input value={form.item} onChange={set("item")} style={inputStyle} /></Field>
      <Field label="จำนวนเงิน (บาท) *"><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} style={inputStyle} /></Field>
      <div className="flex justify-end mt-2"><Btn onClick={() => onSubmit(form)} disabled={!valid}>ส่งคำขอเบิกจ่าย</Btn></div>
    </div>
  );
}

/* ============================================================
   PROFILE — landing page after login. Change own photo, see own
   info, and quick-jump into the modules relevant to this user.
   ============================================================ */
function ProfilePage({ user, setUser, staffList, setStaffList, tasks, schedule, patchTask, setTab, logAction }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [selectedDay, setSelectedDay] = useState(null); // null = today
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const meta = ROLE_META[user.role];

  const myTasks = tasks.filter((t) => t.assignee === user.name || t.createdBy === user.name);
  const myOverdue = myTasks.filter((t) => taskBucket(t) === "overdue").length;
  const myToday = myTasks.filter((t) => taskBucket(t) === "today").length;
  const myPeriods = schedule.filter((s) => normTeacherName(s.teacher) === normTeacherName(user.name) && s.period !== "AS").length;
  const myCompleted = myTasks.filter((t) => t.status === "COMPLETED").length;
  const completionPct = myTasks.length ? Math.round((myCompleted / myTasks.length) * 100) : 0;

  // week strip — Mon..Sun of the current week, anchored on วันนี้จริง
  const todayDate = new Date();
  const monday = new Date(todayDate); monday.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayIso = isoOf(todayDate);
  const activeIso = selectedDay || todayIso;
  const dayLabel = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const tasksByDay = (iso) => myTasks.filter((t) => t.dueDate === iso);
  const dayTasks = tasksByDay(activeIso).sort((a, b) => (a.dueTime || "").localeCompare(b.dueTime || ""));

  const pick = () => fileRef.current?.click();
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(""); setUploading(true);
    try {
      const url = await uploadProfilePhoto(user.id, file);
      setUser((u) => ({ ...u, photoUrl: url }));
      setStaffList((prev) => prev.map((s) => (s.id === user.id ? { ...s, photoUrl: url } : s)));
      logAction("เปลี่ยนรูปโปรไฟล์");
    } catch (ex) {
      setErr(ex.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const toggleDone = (t) => {
    if (!patchTask) return;
    patchTask(t.id, { status: t.status === "COMPLETED" ? "TODO" : "COMPLETED" });
  };

  // personal info the user may edit about themselves — Level and Teacher ID are excluded
  // (permissions stay admin-controlled), and workload/task data is never editable here at all
  const saveInfo = (patch) => {
    setUser((u) => ({ ...u, ...patch }));
    setStaffList((prev) => prev.map((s) => (s.id === user.id ? { ...s, ...patch } : s)));
    postToSheets("updateStaff", { id: user.id, name: patch.name, dept: patch.dept, role: patch.title, phone: patch.phone });
    logAction("แก้ไขข้อมูลส่วนตัว");
    setShowEditInfo(false);
  };

  const links = [
    user.role !== "L0" && { key: "dashboard", label: "หน้าหลัก", icon: LayoutDashboard, desc: "ภาพรวมของคุณวันนี้" },
    user.role !== "L0" && { key: "tasks", label: "งานของฉัน", icon: ClipboardList, desc: `${myTasks.length} งานทั้งหมด${myOverdue ? ` · ${myOverdue} เกินกำหนด` : ""}` },
    user.role !== "L0" && { key: "calendar", label: "ปฏิทิน", icon: CalendarClock, desc: "งาน ตารางสอน และกิจกรรมทั้งหมด" },
    (user.role === "L1" || user.role === "L2" || user.role === "L3") && { key: "schedule", label: "ตารางสอนของฉัน", icon: CalendarDays, desc: `${myPeriods} คาบ/สัปดาห์` },
    { key: "borrow", label: "ยืม–คืนอุปกรณ์", icon: ArrowLeftRight, desc: "ยืมหรือคืนอุปกรณ์" },
    user.role !== "L0" && { key: "budget", label: user.role === "L3" || user.role === "L4" ? "งบประมาณ" : "งบของฉัน", icon: DollarSign, desc: "ดูโครงการและงบที่รับผิดชอบ" },
  ].filter(Boolean);

  return (
    <div>
      <SectionHead eyebrow="PROFILE" title="โปรไฟล์ของฉัน" sub="ข้อมูลส่วนตัวและทางลัดไปยังงานของคุณ" />
      {showPw && <ChangePasswordModal user={user} onClose={() => setShowPw(false)} />}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-5 flex flex-col items-center text-center" style={{ background: C.white, border: `1px solid ${C.line}` }}>
          <div className="relative mb-3">
            <button onClick={() => setShowEditInfo(true)} className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden" style={{ background: meta.tint, border: `3px solid ${C.line}` }} title="แก้ไขข้อมูลส่วนตัว">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="w-full h-full" style={{ objectFit: "cover" }} />
              ) : (
                <span className="text-2xl font-bold text-white">{user.name?.trim()?.[0] || "?"}</span>
              )}
            </button>
            <button onClick={() => setShowEditInfo(true)} disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: C.crimson, color: C.white, border: `2px solid ${C.white}` }} title="แก้ไขข้อมูลส่วนตัว">
              <Pencil size={13} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          </div>
          {uploading && <div className="text-xs mb-2" style={{ color: C.mute }}>กำลังอัปโหลด...</div>}
          {err && <div className="text-xs mb-2" style={{ color: C.crimson }}>{err}</div>}
          <div className="text-base font-bold" style={{ color: C.ink }}>{user.name}</div>
          <div className="text-xs mt-1" style={{ color: C.mute }}>{user.title || "-"}</div>
          <div className="mt-3"><Pill fg={meta.tint} bg="#F2F3F7">{meta.label}</Pill></div>
        </div>

        {/* circular completion gauge — echoes the "Efficiency" ring style, in our palette */}
        <div className="p-5 flex flex-col items-center justify-center text-center" style={{ background: C.navyDeep, border: `1px solid ${C.line}` }}>
          <CompletionRing pct={completionPct} />
          <div className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.55)" }}>อัตราความสำเร็จงาน</div>
          <div className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{myCompleted} / {myTasks.length} งาน</div>
        </div>
      </div>

      <div className="p-5 mb-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <h3 className="text-sm font-bold" style={{ color: C.navy }}>ข้อมูลของฉัน</h3>
          <div className="flex items-center gap-2">
            <LangToggle dark={false} />
            {API_URL && <Btn variant="ghost" small icon={KeyRound} onClick={() => setShowPw(true)}>เปลี่ยนรหัสผ่าน</Btn>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="text-xs" style={{ color: C.mute }}>Teacher ID</div><div className="font-mono font-medium" style={{ color: C.ink }}>{user.id}</div></div>
          <div><div className="text-xs" style={{ color: C.mute }}>หน่วยงาน</div><div className="font-medium" style={{ color: C.ink }}>{user.dept || "-"}</div></div>
          <div><div className="text-xs" style={{ color: C.mute }}>ตำแหน่ง/หน้าที่</div><div className="font-medium" style={{ color: C.ink }}>{user.title || "-"}</div></div>
          <div><div className="text-xs" style={{ color: C.mute }}>ระดับสิทธิ์</div><div className="font-medium" style={{ color: C.ink }}>{user.role} — {meta.label}</div></div>
        </div>
        {(myOverdue > 0 || myToday > 0) && (
          <div className="mt-4 p-3 flex items-center gap-2" style={{ background: C.badBg }}>
            <AlertTriangle size={14} style={{ color: C.crimson }} />
            <span className="text-xs" style={{ color: C.crimsonDeep }}>
              {myOverdue > 0 && `${myOverdue} งานเกินกำหนด `}{myToday > 0 && `· ${myToday} งานครบกำหนดวันนี้`}
            </span>
          </div>
        )}
      </div>

      {/* week strip + day's tasks — echoes the date-strip task-app reference, in our palette */}
      {user.role !== "L0" && (
        <div className="p-5 mb-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: C.navy }}>งานประจำสัปดาห์</h3>
            <span className="text-xs" style={{ color: C.mute }}>{new Date(activeIso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {weekDays.map((d) => {
              const iso = isoOf(d);
              const isToday = iso === todayIso;
              const isActive = iso === activeIso;
              const count = tasksByDay(iso).length;
              return (
                <button key={iso} onClick={() => setSelectedDay(iso === todayIso ? null : iso)}
                  className="flex flex-col items-center py-2"
                  style={{ background: isActive ? C.crimson : C.paper, border: `1px solid ${isActive ? C.crimson : C.line}` }}>
                  <span className="text-[10px]" style={{ color: isActive ? "rgba(255,255,255,0.75)" : C.mute }}>{dayLabel[d.getDay()]}</span>
                  <span className="text-sm font-bold mt-0.5" style={{ color: isActive ? C.white : isToday ? C.crimson : C.ink }}>{d.getDate()}</span>
                  {count > 0 && <span className="w-1 h-1 rounded-full mt-1" style={{ background: isActive ? C.white : C.crimson }} />}
                </button>
              );
            })}
          </div>

          {dayTasks.length === 0 ? (
            <div className="text-xs text-center py-6" style={{ color: C.mute }}>ไม่มีงานในวันนี้ 🎉</div>
          ) : (
            <div className="space-y-2">
              {dayTasks.map((t) => {
                const pm = PRIORITY_META[t.priority] || PRIORITY_META.NORMAL;
                const done = t.status === "COMPLETED";
                return (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2.5" style={{ background: done ? C.okBg : C.paper, borderLeft: `3px solid ${done ? C.ok : pm.fg}` }}>
                    <button onClick={() => toggleDone(t)}
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ border: `2px solid ${done ? C.ok : C.line}`, background: done ? C.ok : "transparent" }}>
                      {done && <CheckCircle2 size={12} color={C.white} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate" style={{ color: done ? C.mute : C.ink, textDecoration: done ? "line-through" : "none" }}>{t.title}</div>
                      {t.location && <div className="text-xs" style={{ color: C.mute }}>{t.location}</div>}
                    </div>
                    {t.dueTime && <span className="text-xs font-mono shrink-0" style={{ color: C.slate }}>{t.dueTime}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <h3 className="text-sm font-bold mb-3" style={{ color: C.navy }}>ทางลัด</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {links.map((l) => <QuickAction key={l.key} icon={l.icon} title={l.label} desc={l.desc} onClick={() => setTab(l.key)} />)}
      </div>

      {user.role !== "L0" && <PortfolioSection user={user} logAction={logAction} />}

      {showEditInfo && (
        <Modal title="แก้ไขข้อมูลส่วนตัว" onClose={() => setShowEditInfo(false)}>
          <EditProfileForm user={user} onChangePhoto={pick} uploading={uploading} onSave={saveInfo} onClose={() => setShowEditInfo(false)} />
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   แฟ้มผลงานของฉัน — การพัฒนาตนเอง / รางวัลของตนเอง / การพาไปแข่งขัน /
   รางวัลนักเรียนที่ดูแล  (เก็บในชีต "ผลงานบุคลากร" ผ่าน Extras.gs)
   ============================================================ */
const PORTFOLIO_TYPES = [
  { key: "dev", label: "การพัฒนาตนเอง", icon: BookOpen, color: "#2E8FCB", hint: "อบรม สัมมนา ศึกษาดูงาน หลักสูตรออนไลน์" },
  { key: "award", label: "รางวัลของตนเอง", icon: Trophy, color: "#B8791A", hint: "รางวัล เกียรติบัตร ผลงานดีเด่น" },
  { key: "competition", label: "การพาไปแข่งขัน", icon: Users, color: C.crimson, hint: "พานักเรียนไปแข่งขันกีฬา/กิจกรรม" },
  { key: "student", label: "รางวัลนักเรียนที่ดูแล", icon: Sparkles, color: "#37A868", hint: "รางวัลที่นักเรียนในความดูแลได้รับ" },
];
const PORTFOLIO_LEVELS = ["โรงเรียน", "เขต/อำเภอ", "จังหวัด", "ภาค", "ประเทศ", "นานาชาติ"];
const portfolioType = (k) => PORTFOLIO_TYPES.find((t) => t.key === k) || PORTFOLIO_TYPES[0];

function PortfolioSection({ user, logAction }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [filter, setFilter] = useState("ALL");
  const [adding, setAdding] = useState(null);   // type key
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    let alive = true;
    postToSheetsAwait("listPortfolio", { teacherId: user.id, owner: user.name })
      .then((r) => { if (alive) { setItems(r.items || []); setState("ready"); } })
      .catch(() => alive && setState("error"));
    return () => { alive = false; };
  }, [user.id, user.name]);

  const add = async (form) => {
    const payload = { ...form, teacherId: user.id, owner: user.name };
    const r = await postToSheetsAwait("addPortfolio", payload);
    setItems((prev) => [{ ...payload, id: r.id }, ...prev]);
    logAction(`เพิ่มผลงาน (${portfolioType(form.type).label}): ${form.title}`);
    setAdding(null);
  };
  const del = async (it) => {
    await postToSheetsAwait("deletePortfolio", { id: it.id, teacherId: user.id });
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    setConfirmDel(null);
  };

  const shown = items
    .filter((it) => filter === "ALL" || it.type === filter)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  return (
    <div className="p-5 mb-4" style={{ background: C.white, border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: C.navy }}><Trophy size={14} /> แฟ้มผลงานของฉัน</h3>
        <span className="text-xs" style={{ color: C.mute }}>{items.length} รายการ</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {PORTFOLIO_TYPES.map((t) => {
          const Icon = t.icon;
          const n = items.filter((it) => it.type === t.key).length;
          const active = filter === t.key;
          return (
            <div key={t.key} className="p-3 flex items-center gap-2.5 cursor-pointer" onClick={() => setFilter(active ? "ALL" : t.key)}
              style={{ background: active ? t.color : C.paper, border: `1px solid ${active ? t.color : C.line}`, borderLeft: `4px solid ${t.color}` }}>
              <Icon size={18} style={{ color: active ? C.white : t.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate" style={{ color: active ? C.white : C.ink }}>{t.label}</div>
                <div className="text-[11px]" style={{ color: active ? "rgba(255,255,255,0.8)" : C.mute }}>{n} รายการ</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setAdding(t.key); }} disabled={state === "error"}
                className="w-7 h-7 flex items-center justify-center shrink-0" title={`เพิ่ม${t.label}`}
                style={{ background: active ? C.white : t.color, color: active ? t.color : C.white, opacity: state === "error" ? 0.4 : 1 }}>
                <Plus size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {state === "loading" && <div className="text-xs text-center py-4" style={{ color: C.mute }}>กำลังโหลดผลงาน…</div>}
      {state === "error" && (
        <div className="text-xs p-3" style={{ background: C.warnBg, color: C.warn }}>
          ยังเชื่อมต่อแฟ้มผลงานไม่ได้ — ต้องอัปเดตไฟล์ Extras.gs ในโปรเจกต์ Apps Script ครุภัณฑ์และ Deploy เวอร์ชันใหม่ก่อน
        </div>
      )}
      {state === "ready" && shown.length === 0 && (
        <div className="text-xs text-center py-6" style={{ color: C.mute, border: `1px dashed ${C.line}` }}>
          {filter === "ALL" ? "ยังไม่มีผลงาน — กดปุ่ม + ที่หมวดด้านบนเพื่อเพิ่ม" : `ยังไม่มี${portfolioType(filter).label}`}
        </div>
      )}
      {state === "ready" && shown.length > 0 && (
        <div className="space-y-2">
          {shown.map((it) => {
            const t = portfolioType(it.type);
            return (
              <div key={it.id} className="px-3 py-2.5" style={{ background: C.paper, borderLeft: `3px solid ${t.color}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" style={{ color: C.ink }}>{it.title}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: C.mute }}>
                      <span style={{ color: t.color, fontWeight: 600 }}>{t.label}</span>
                      {it.date ? ` · ${it.date}` : ""}{it.organizer ? ` · ${it.organizer}` : ""}{it.level ? ` · ระดับ${it.level}` : ""}{it.hours ? ` · ${it.hours} ชม.` : ""}
                    </div>
                  </div>
                  <button onClick={() => setConfirmDel(it)} className="shrink-0"><X size={14} style={{ color: C.mute }} /></button>
                </div>
                {it.result && <div className="mt-1.5"><Pill fg={t.color} bg={C.white}>🏅 {it.result}</Pill></div>}
                {it.students && <div className="text-xs mt-1.5" style={{ color: C.slate }}>นักเรียน: {it.students}</div>}
                {it.detail && <div className="text-xs mt-1 whitespace-pre-line" style={{ color: C.slate }}>{it.detail}</div>}
                {it.evidenceUrl && <a href={it.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold inline-flex items-center gap-1 mt-1.5" style={{ color: C.navy }}>ดูหลักฐาน/เกียรติบัตร <ExternalLink size={11} /></a>}
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <Modal title={`เพิ่ม${portfolioType(adding).label}`} onClose={() => setAdding(null)} wide>
          <PortfolioForm type={adding} onSubmit={add} />
        </Modal>
      )}
      {confirmDel && (
        <Modal title="ยืนยันการลบ" onClose={() => setConfirmDel(null)}>
          <p className="text-sm mb-4" style={{ color: C.ink }}>ลบผลงาน <b>{confirmDel.title}</b> ใช่หรือไม่?</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setConfirmDel(null)}>ยกเลิก</Btn>
            <Btn variant="crimson" onClick={() => del(confirmDel)} icon={X}>ยืนยันลบ</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PortfolioForm({ type, onSubmit }) {
  const t = portfolioType(type);
  const [form, setForm] = useState({ type, date: new Date().toLocaleDateString("sv-SE"), title: "", organizer: "", level: "", result: "", students: "", hours: "", detail: "", evidenceUrl: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const urlOk = !form.evidenceUrl || /^https?:\/\//i.test(form.evidenceUrl.trim());
  const withStudents = type === "competition" || type === "student";
  const labels = {
    dev: { title: "ชื่อหลักสูตร/การอบรม *", organizer: "หน่วยงานที่จัด", result: "ผลที่ได้ (เช่น เกียรติบัตร)" },
    award: { title: "ชื่อรางวัล *", organizer: "หน่วยงานที่มอบ", result: "ผลรางวัล (เช่น ชนะเลิศ, ดีเด่น)" },
    competition: { title: "ชื่อรายการแข่งขัน *", organizer: "หน่วยงานผู้จัด", result: "ผลการแข่งขัน (เช่น รองชนะเลิศอันดับ 1)" },
    student: { title: "ชื่อรางวัล/รายการ *", organizer: "หน่วยงานที่มอบ/จัด", result: "รางวัลที่ได้ *" },
  }[type];
  const valid = form.title.trim() && urlOk && (type !== "student" || form.result.trim());
  const submit = async () => {
    setBusy(true);
    try { await onSubmit(form); } catch (e) { alert(e.message || "บันทึกไม่สำเร็จ"); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="text-xs mb-3" style={{ color: C.mute }}>{t.hint}</div>
      <div className="grid grid-cols-2 gap-x-4">
        <div className="col-span-2"><Field label={labels.title}><input value={form.title} onChange={set("title")} style={inputStyle} /></Field></div>
        <Field label="วันที่"><input type="date" value={form.date} onChange={set("date")} style={inputStyle} /></Field>
        {type === "dev" ? (
          <Field label="จำนวนชั่วโมง"><input type="number" min="0" value={form.hours} onChange={set("hours")} style={inputStyle} /></Field>
        ) : (
          <Field label="ระดับ">
            <select value={form.level} onChange={set("level")} style={inputStyle}><option value="">— เลือก —</option>{PORTFOLIO_LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
          </Field>
        )}
        <Field label={labels.organizer}><input value={form.organizer} onChange={set("organizer")} style={inputStyle} /></Field>
        <Field label={labels.result}><input value={form.result} onChange={set("result")} style={inputStyle} /></Field>
        {withStudents && (
          <div className="col-span-2">
            <Field label={type === "competition" ? "นักเรียนที่พาไป (ชื่อ/ชั้น/จำนวน)" : "นักเรียนที่ได้รับรางวัล (ชื่อ/ชั้น)"}>
              <textarea rows={2} value={form.students} onChange={set("students")} style={inputStyle} placeholder="เช่น ด.ช.สมชาย ใจดี ม.2/3, ด.ญ.สมหญิง รักเรียน ม.2/5" />
            </Field>
          </div>
        )}
        <div className="col-span-2"><Field label="รายละเอียดเพิ่มเติม"><textarea rows={2} value={form.detail} onChange={set("detail")} style={inputStyle} /></Field></div>
        <div className="col-span-2">
          <Field label="ลิงก์หลักฐาน/เกียรติบัตร/รูปภาพ (ถ้ามี)">
            <input value={form.evidenceUrl} onChange={set("evidenceUrl")} placeholder="https://drive.google.com/..." style={{ ...inputStyle, borderColor: urlOk ? C.line : C.bad }} />
          </Field>
        </div>
      </div>
      <div className="flex justify-end mt-2"><Btn onClick={submit} disabled={!valid || busy}>{busy ? "กำลังบันทึก..." : "บันทึก"}</Btn></div>
    </div>
  );
}

function EditProfileForm({ user, onChangePhoto, uploading, onSave, onClose }) {
  const [form, setForm] = useState({ name: user.name || "", dept: user.dept || "", title: user.title || "", phone: user.phone || "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim();
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: C.navy }}>
          {user.photoUrl ? <img src={user.photoUrl} alt="" className="w-full h-full" style={{ objectFit: "cover" }} /> : <span className="text-white font-bold">{user.name?.[0] || "?"}</span>}
        </div>
        <Btn small variant="ghost" onClick={onChangePhoto} disabled={uploading} icon={Upload}>{uploading ? "กำลังอัปโหลด..." : "เปลี่ยนรูปโปรไฟล์"}</Btn>
      </div>
      <Field label="ชื่อ-นามสกุล *"><input value={form.name} onChange={set("name")} style={inputStyle} /></Field>
      <Field label="หน่วยงาน"><input value={form.dept} onChange={set("dept")} style={inputStyle} /></Field>
      <Field label="ตำแหน่ง/หน้าที่"><input value={form.title} onChange={set("title")} style={inputStyle} /></Field>
      <Field label="เบอร์โทร"><input value={form.phone} onChange={set("phone")} style={inputStyle} /></Field>
      <div className="text-xs mb-4 p-2" style={{ background: C.paper, color: C.mute }}>
        Teacher ID และระดับสิทธิ์ (Level) แก้ไขเองไม่ได้ — ต้องให้ผู้ดูแลระบบ (L3) เป็นผู้เปลี่ยนให้เท่านั้น
      </div>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>ยกเลิก</Btn>
        <Btn onClick={() => onSave(form)} disabled={!valid}>บันทึก</Btn>
      </div>
    </div>
  );
}

function CompletionRing({ pct }) {
  const r = 34, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={C.accent} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 44 44)" />
      <text x="44" y="49" textAnchor="middle" fontSize="20" fontWeight="700" fill={C.white} fontFamily={FONT}>{pct}%</text>
    </svg>
  );
}
