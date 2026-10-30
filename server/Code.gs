/* CHÉRIE Office · máy chủ quản trị (Google Apps Script)
   Dán vào: Sheet "CHÉRIE Office · Quản lý" → Tiện ích mở rộng → Apps Script.
   Triển khai: Ứng dụng web · Thực thi với tư cách: Tôi · Người có quyền truy cập: Bất kỳ ai.
   Đăng nhập và phân quyền RIÊNG của Office (tab NhanSu, PhanQuyen), không dùng chung với cherie.io.vn. */

var SHEET_ID = "1_o3wqoBTCaTwD3WKa7QmPcK3pcrG7-ka1ae3FX8l0aM";
var DATA_TABS = ["NhapTuLink", "SanPham", "Anh", "Dong", "KhachHang", "DangKy", "TuDo", "GiaoNhan", "DangKyWeb"];
/* mục quyền đọc của từng tab */
var READ_SEC = { NhapTuLink: ["NhapHang"], Anh: ["NhapHang", "Kho"], SanPham: ["Kho", "NhapHang", "KhachGoi", "TongQuan"],
  Dong: null, KhachHang: ["KhachGoi", "GiaoNhan", "TongQuan"], DangKy: ["KhachGoi", "GiaoNhan", "TongQuan"],
  TuDo: ["KhachGoi", "Kho", "TongQuan"], GiaoNhan: ["GiaoNhan", "TongQuan"], DangKyWeb: ["KhachGoi", "TongQuan"] };
/* mục cần quyền Sửa để ghi từng tab (một trong các mục) */
var WRITE_SEC = { NhapTuLink: ["NhapHang"], Anh: ["NhapHang", "Kho"], SanPham: ["Kho", "NhapHang", "KhachGoi"],
  KhachHang: ["KhachGoi"], DangKy: ["KhachGoi"], TuDo: ["KhachGoi"], GiaoNhan: ["GiaoNhan", "KhachGoi"], DangKyWeb: ["KhachGoi"] };
var SECS = ["TongQuan", "NhapHang", "Kho", "KhachGoi", "GiaoNhan", "HoSoRieng"];
var TOKEN_DAYS = 30;

function doGet() { return out({ ok: true, app: "CHÉRIE Office" }); }
function doPost(e) {
  var r;
  try { r = handle(JSON.parse((e && e.postData && e.postData.contents) || "{}")); }
  catch (err) { r = { err: String(err && err.message || err), code: (err && err.code) || "error" }; }
  return out(r);
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fail(msg, code) { var e = new Error(msg); e.code = code || "error"; throw e; }
function ss() { return SpreadsheetApp.openById(SHEET_ID); }
function props() { return PropertiesService.getScriptProperties(); }

function handle(q) {
  switch (q.fn) {
    case "webDangKy": return webDangKy(q);
    case "staff": return { staff: staffList() };
    case "login": return login(q.nv, q.pin);
    case "logout": props().deleteProperty("tk_" + q.token); return { ok: true };
    case "me": return { me: auth(q.token) };
    case "load": var me = auth(q.token); return { me: me, tabs: load(me, q.tabs) };
    case "set": return setRow(auth(q.token), q);
    case "append": return appendRows(auth(q.token), q.tab, q.rows);
  }
  fail("Không rõ yêu cầu", "bad_request");
}

/* ---------- nhân sự & đăng nhập ---------- */
function nsSheet() {
  var sh = ss().getSheetByName("NhanSu");
  if (!sh) fail("Thiếu tab NhanSu", "setup");
  return sh;
}
function nsRows() {
  var v = nsSheet().getDataRange().getDisplayValues(), h = v[0], out = [];
  for (var i = 1; i < v.length; i++) {
    var o = { _r: i + 1 }; h.forEach(function (k, j) { o[k] = v[i][j]; });
    if (o.MaNV && o.Ten) out.push(o);
  }
  return out;
}
function staffList() {
  return nsRows().filter(function (n) { return n.Nghi !== "Có"; }).map(function (n) { return { id: n.MaNV, ten: n.Ten }; });
}
function salt() {
  var s = props().getProperty("SALT");
  if (!s) { s = Utilities.getUuid(); props().setProperty("SALT", s); }
  return s;
}
function hashPin(pin) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt() + "|" + pin);
  return d.map(function (b) { return ("0" + (b & 255).toString(16)).slice(-2); }).join("");
}
function login(nv, pin) {
  pin = String(pin || "").trim();
  if (!/^\d{4,8}$/.test(pin)) fail("Mã PIN gồm 4–8 chữ số", "bad_pin");
  var cache = CacheService.getScriptCache(), key = "fail_" + nv, n = +(cache.get(key) || 0);
  if (n >= 5) fail("Sai quá 5 lần. Đợi 15 phút rồi thử lại.", "locked");
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var u = nsRows().filter(function (x) { return x.MaNV === nv && x.Nghi !== "Có"; })[0];
    if (!u) fail("Không tìm thấy nhân sự", "bad_pin");
    var stored = String(u.PIN || "").trim(), ok = false;
    if (/^[0-9a-f]{64}$/.test(stored)) ok = stored === hashPin(pin);
    else if (stored) {
      ok = stored === pin;
      if (ok) { /* lần đầu: thay PIN gõ tay bằng bản đã mã hoá */
        var h = nsSheet().getRange(1, 1, 1, nsSheet().getLastColumn()).getValues()[0];
        nsSheet().getRange(u._r, h.indexOf("PIN") + 1).setNumberFormat("@").setValue(hashPin(pin));
      }
    }
    if (!ok) { cache.put(key, String(n + 1), 900); fail("Sai mã PIN", "bad_pin"); }
    cache.remove(key);
    var t = Utilities.getUuid() + Utilities.getUuid().slice(0, 8);
    props().setProperty("tk_" + t, JSON.stringify({ nv: nv, exp: Date.now() + TOKEN_DAYS * 864e5 }));
    return { token: t, me: meOf(u) };
  } finally { lock.releaseLock(); }
}
function quyenCua(vaiTro) {
  var q = {};
  if (vaiTro === "Admin") { SECS.forEach(function (s) { q[s] = "Sửa"; }); return q; }
  var sh = ss().getSheetByName("PhanQuyen");
  SECS.forEach(function (s) { q[s] = "Không"; });
  if (!sh) return q;
  var v = sh.getDataRange().getDisplayValues(), h = v[0];
  for (var i = 1; i < v.length; i++) if (v[i][0] === vaiTro) SECS.forEach(function (s) { var j = h.indexOf(s); if (j >= 0 && v[i][j]) q[s] = v[i][j]; });
  return q;
}
function meOf(u) { return { id: u.MaNV, ten: u.Ten, vaiTro: u.VaiTro, quyen: quyenCua(u.VaiTro) }; }
function auth(token) {
  if (!token) fail("Chưa đăng nhập", "revoked");
  var raw = props().getProperty("tk_" + token);
  if (!raw) fail("Phiên đăng nhập đã hết", "revoked");
  var t = JSON.parse(raw);
  if (t.exp < Date.now()) { props().deleteProperty("tk_" + token); fail("Phiên đăng nhập đã hết", "revoked"); }
  var u = nsRows().filter(function (x) { return x.MaNV === t.nv && x.Nghi !== "Có"; })[0];
  if (!u) { props().deleteProperty("tk_" + token); fail("Tài khoản đã bị tắt", "revoked"); }
  return meOf(u);
}
function canAny(me, secs, lv) {
  if (me.vaiTro === "Admin") return true;
  if (secs === null) return true;
  return (secs || []).some(function (s) { var q = me.quyen[s] || "Không"; return lv === "Sửa" ? q === "Sửa" : q !== "Không"; });
}

/* ---------- dữ liệu ---------- */
function load(me, only) {
  var book = ss(), res = {};
  DATA_TABS.forEach(function (t) {
    if (only && only.indexOf(t) < 0) return;
    if (!canAny(me, READ_SEC[t], "Xem")) return;
    var sh = book.getSheetByName(t); if (!sh) return;
    res[t] = sh.getDataRange().getDisplayValues();
  });
  return res;
}
function cell(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" && /^0\d+$/.test(v)) return "'" + v; /* giữ số 0 đầu của số điện thoại */
  if (typeof v === "string" && /^[=+\-@]/.test(v)) return "'" + v; /* chặn công thức */
  return v;
}
function guardWrite(me, tab) {
  if (DATA_TABS.indexOf(tab) < 0 || tab === "Dong") fail("Không được ghi tab này", "forbidden");
  if (!canAny(me, WRITE_SEC[tab], "Sửa")) fail("Vai trò " + me.vaiTro + " chưa được quyền Sửa phần này", "forbidden");
}
function setRow(me, q) {
  guardWrite(me, q.tab);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = ss().getSheetByName(q.tab), h = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
    var row = +q.row, kc = h.indexOf(q.keyCol);
    if (row < 2 || kc < 0) fail("Dòng không hợp lệ", "bad_request");
    var cur = sh.getRange(row, kc + 1).getDisplayValue();
    if (String(cur) !== String(q.keyVal)) fail("Dòng " + q.keyVal + " đã đổi vị trí. Bấm Tải lại rồi làm lại.", "row_moved");
    Object.keys(q.obj || {}).forEach(function (k) {
      var j = h.indexOf(k); if (j < 0 || k === q.keyCol) return;
      sh.getRange(row, j + 1).setValue(cell(q.obj[k]));
    });
    return { ok: true };
  } finally { lock.releaseLock(); }
}
function appendRows(me, tab, rows) {
  guardWrite(me, tab);
  if (!rows || !rows.length) return { ok: true, n: 0 };
  if (rows.length > 200) fail("Quá nhiều dòng một lần", "bad_request");
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = ss().getSheetByName(tab), h = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
    var vals = rows.map(function (o) { return h.map(function (k) { return cell(o[k]); }); });
    sh.getRange(sh.getLastRow() + 1, 1, vals.length, h.length).setValues(vals);
    return { ok: true, n: vals.length };
  } finally { lock.releaseLock(); }
}

/* Chạy tay trong trình chỉnh sửa nếu muốn đăng xuất mọi người */
function dangXuatTatCa() {
  var p = props(), all = p.getProperties();
  Object.keys(all).forEach(function (k) { if (k.indexOf("tk_") === 0) p.deleteProperty(k); });
}

/* ---------- đăng ký và trắc nghiệm từ website (công khai, không cần đăng nhập) ---------- */
var WEB_HEAD = ["MaWeb", "NgayTao", "Loai", "Dong", "Ten", "Zalo", "NoiLam", "DiaChi", "GiaoTai", "Size", "ChieuCao", "NgayDuSinh", "KieuPhongCach", "TamTinh", "GhiChu", "TraLoi", "TrangThai", "XuLy"];
function txt(v, n) { v = v == null ? "" : String(v).replace(/[\u0000-\u001f]/g, " ").trim(); return v.slice(0, n || 200); }
function webDangKy(q) {
  var zalo = txt(q.zalo, 15).replace(/\s/g, "");
  if (!/^0\d{9}$/.test(zalo)) fail("Số Zalo chưa đúng", "bad_request");
  var loai = ["Đăng ký", "Trắc nghiệm", "Trò chuyện mẹ"].indexOf(q.loai) > -1 ? q.loai : "Đăng ký";
  var cache = CacheService.getScriptCache(), k1 = "web_" + zalo, n1 = +(cache.get(k1) || 0), n0 = +(cache.get("web_all") || 0);
  if (n1 >= 6) fail("Số Zalo này đã gửi nhiều lần. Tụi mình sẽ nhắn sớm.", "rate");
  if (n0 >= 300) fail("Hệ thống đang bận, nhắn Zalo 0377 159 189 giúp tụi mình.", "rate");
  cache.put(k1, String(n1 + 1), 21600); cache.put("web_all", String(n0 + 1), 3600);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var book = ss(), sh = book.getSheetByName("DangKyWeb");
    if (!sh) { sh = book.insertSheet("DangKyWeb"); sh.getRange(1, 1, 1, WEB_HEAD.length).setValues([WEB_HEAD]).setFontWeight("bold"); sh.setFrozenRows(1); }
    var last = sh.getLastRow(), mx = 0;
    if (last > 1) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { var m = String(r[0]).match(/(\d+)/); if (m && +m[1] > mx) mx = +m[1]; });
    var ma = "WEB-" + ("000" + (mx + 1)).slice(-4);
    var now = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd HH:mm");
    var tl = ""; try { tl = JSON.stringify(q.traLoi || {}).slice(0, 4000); } catch (e) {}
    var row = [ma, now, loai, txt(q.dong, 40), txt(q.ten, 80), "'" + zalo, txt(q.noiLam, 120), txt(q.diaChi, 200), txt(q.giaoTai, 20), txt(q.size, 10), txt(q.chieuCao, 20), txt(q.duSinh, 20), txt(q.kieu, 60), +q.tamTinh || "", txt(q.ghiChu, 500), tl, "Mới", ""];
    row = row.map(function (v) { return typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v; });
    sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    return { ok: true, ma: ma };
  } finally { lock.releaseLock(); }
}
