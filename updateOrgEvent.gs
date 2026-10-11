// ── วางใน Code.gs ต่อจาก _deleteOrgEvent ──
function _updateOrgEvent(p) {
  const sh = _ensureSheetWithHeaders(SHEET_ORG_EVENTS, ORG_EVENT_HEADERS);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ID");
  const fields = {
    "ชื่องาน": p.title, "วันที่เริ่ม": p.start, "วันที่สิ้นสุด": p.end || p.start,
    "หน่วยงานเจ้าของ": p.dept, "ผู้รับผิดชอบ": p.owner, "สถานที่": p.loc, "รายละเอียด": p.description
  };
  for (let r = 1; r < data.length; r++) {
    if (data[r][idCol] === p.id) {
      Object.keys(fields).forEach(function (name) {
        const c = headers.indexOf(name);
        if (c > -1 && fields[name] !== undefined) sh.getRange(r + 1, c + 1).setValue(fields[name]);
      });
      return { updatedRow: r + 1 };
    }
  }
  throw new Error("ไม่พบกิจกรรม ID " + p.id);
}

// ── และเพิ่มบรรทัดนี้ใน doPost ใต้บรรทัด "deleteOrgEvent" ──
//     else if (action === "updateOrgEvent") result = _updateOrgEvent(body.payload);
