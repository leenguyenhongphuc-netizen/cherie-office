/* Thử 3 app Quầy, Sale online, Giao nhận trên khổ điện thoại, dữ liệu giả lập, chặn máy chủ thật.
   node tools/audit-apps.js <url gốc> <thư mục ảnh> */
const {chromium}=require('playwright');
const [,,BASE='http://localhost:8765/',OUT='.']=process.argv;
const today=new Date(),ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const T={
 Dong:[['TenDong','ThuTu','CachThue'],['Classic','1','Theo tuần'],['Lead','2','Theo tuần']],
 Goi:[['MaGoi','Dong','TenGoi','SoBo','CachDoi','ChuyenMoiTuan','GiaTuan','DonVi','TraTruocTuan','Coc','PhiPhatSinh','MoBan'],
  ['G-CL-10','Classic','Gói 10 bộ','10','','1','369000','/tuần','12','1000000','','Có'],['G-CL-5','Classic','Gói 5 bộ','5','','2','319000','/tuần','12','1000000','','Có'],
  ['G-NQ','Ngày quan trọng','Thuê 1 bộ','1','','0','199000','/bộ','0','500000','','Có']],
 KhuyenMai:[['MaKM','Ten','ApDung','Loai','GiaTri','ToiDa','DieuKien','TuNgay','DenNgay','Kenh','TrangThai'],['KM-001','Khách sáng lập','Gói tuần','pt','10','','','2026-01-01','2027-12-31','','Bật']],
 KhachHang:[['MaKH','Ten','Zalo','NoiLam','DiaChiGiao','Size','ChieuCao','Gu','DieuTranh','NgayDuSinh','NguonKhach','GhiChu','NgayTao'],['0905111222','Ngọc Anh','0905111222','Tòa Vĩnh Trung','','M','160','','','','Website','','2026-10-01']],
 DangKy:[['MaDK','MaKH','Dong','NgayBatDau','SoThang','GiaThang','TraTruoc','Coc','GiaoTai','VungGiao','PhiGiaoThang','TongChuyen','TrangThai','NgayHetHan','NgayTao','GhiChu','MaGoi','MaKM','GiamGia','TongThu','NgayGiaHan','LyDoHuy','NguonDon','NhanVien','SoTuan','GiaTuan','PhiGiaoTuan'],
  ['DK-0001','0905111222','Classic','2026-10-05','','','4118000','1000000','Văn phòng','Trung tâm','','24','Đang dùng',ymd(new Date(today.getTime()+8*864e5)),'2026-10-01','','G-CL-10','','310000','5118000','','','Online','Phúc','12','369000','0'],
  ['DK-0002','0905111222','Classic','2026-11-02','','','4118000','1000000','Văn phòng','Trung tâm','','24','Chờ xác nhận','2027-01-24','2026-10-30','','G-CL-10','','310000','5118000','','','Online','Phúc','12','369000','0']],
 TuDo:[['MaTD','MaDK','MaKH','TuanGiao','MaSP','NgayGiao','NgayLay','TrangThai','LanMacThu','GhiChu'],['TD-0001','DK-0001','0905111222','2026-10-26','OF-CL-001-M','','','Đã giao','3','']],
 GiaoNhan:[['MaChuyen','Ngay','Loai','MaKH','MaDK','DiaChi','SoBo','NguoiGiao','TrangThai','GhiChu','Khu','ThuTu','GioHen','MaDoGiao','MaDoNhan','AnhGiao','AnhNhan','HuHong','KyXacNhan','TreHen'],
  ['GN-0001',ymd(today),'Lấy tối T6','0905111222','DK-0001','Tòa Vĩnh Trung, 255 Hùng Vương','5','','Chưa đi','','Hải Châu','1','18:30','','','','','','','']],
 SanPham:[['MaSP','TenMau','Dong','Loai','Size','TrangThai','SoLanMac','HanMac','GiaVon'],['OF-CL-001-M','Veste Croisée','Classic','Vest','M','Ở tủ khách','3','40','x']],
 DangKyWeb:[['MaWeb','NgayTao','Loai','Dong','Ten','Zalo','NoiLam','DiaChi','GiaoTai','Size','ChieuCao','NgayDuSinh','KieuPhongCach','TamTinh','GhiChu','TraLoi','TrangThai','XuLy','MaKQ','BoTu','LinkTu'],
  ['WEB-0001',ymd(today)+' 09:00','Trắc nghiệm','Classic','Thu Hà','0935444555','','','','S','158','','Nàng Chỉn Chu','','','{\"anTuong\":\"Thanh lịch\",\"tc1\":\"thu\",\"tc2\":\"thu\",\"tc3\":\"giu\",\"nganh\":\"Nghề khác\",\"chuan\":\"Thoải mái\",\"diLai\":\"Xe máy\",\"doiSong\":[\"Ngồi máy lạnh cả ngày\"],\"body\":[\"Eo, bụng\"],\"bodyNote\":{\"Eo, bụng\":\"Muốn che bụng\"},\"size\":\"S\",\"cao\":\"1m55 – 1m62\",\"form\":\"Ôm sát\",\"vayQuan\":\"Quần\",\"mau\":\"Đen trắng\",\"tranh\":[\"Vải mỏng\"],\"kyVong\":\"Tìm ra đồ hợp với mình\",\"chiTieu\":\"500.000đ – 1.000.000đ\",\"tuDe\":[\"OF-CL-001\",\"OF-CL-013\"],\"tuDeU\":0.9,\"tim\":[\"OF-IV-191\",\"OF-CL-005\"]}','Mới','','KQ-00002','','https://office.cherie.io.vn/#tu-KQ-00002-abcd2345'],
  ['WEB-0002',ymd(today)+' 10:00','Đăng ký','Lead','Mai','0935666777','Tòa A','','Văn phòng','M','162','','Nàng Quyền Lực','','[Lead · Gói 5 bộ]','{}','Mới','','','','']],
 KetQuaWeb:[['MaKQ']],NhapTuLink:[['MaNhap','Link','TrangThai']]};
(async()=>{const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage();const errs=[],calls=[];p.on('pageerror',e=>errs.push(e.message));
 await ctx.grantPermissions(['clipboard-read','clipboard-write']);
 await p.route(/script\.google\.com/,async r=>{const q=JSON.parse(r.request().postData()||'{}');let o={ok:true};const M={ten:'Phúc',vaiTro:'Admin',quyen:{}};
   if(q.fn==='me')o={me:M};if(q.fn==='load')o={me:M,tabs:T};if(q.fn==='staff')o={staff:[]};
   if(q.fn==='append'||q.fn==='set')calls.push(q.fn+' '+q.tab+' '+JSON.stringify(q.rows||q.obj).slice(0,220));await r.fulfill({contentType:'application/json',body:JSON.stringify(o)})});
 await p.route(/zalo\.me|google\.com\/maps/,r=>r.fulfill({body:'ok'}));
 await p.goto(BASE+'admin/');await p.evaluate(()=>{localStorage.setItem('of-admin-token','t');localStorage.setItem('of-admin-me',JSON.stringify({ten:'Phúc',vaiTro:'Admin',quyen:{}}))});
 let n=0;const shot=async(nm,full)=>{await p.waitForTimeout(800);await p.screenshot({path:`${OUT}/${String(++n).padStart(2,'0')}-${nm}.png`,fullPage:!!full})};
 const overflow=async(nm)=>{const r=await p.evaluate(()=>({w:document.documentElement.scrollWidth,small:[...document.querySelectorAll('button,a.btn')].filter(e=>e.offsetParent&&e.getBoundingClientRect().height<40&&!e.closest('.tabs')).map(e=>e.textContent.trim().slice(0,20)).slice(0,5)}));console.log(nm,JSON.stringify(r))};
 /* QUẦY */
 await p.goto(BASE+'quay/');await p.waitForTimeout(2000);await shot('quay');await overflow('quay');
 await p.fill('#qzIn','0905 999 888');await p.click('#fQZ button[type=submit]');await shot('quay-khach-moi');
 await p.fill('#qTen','Bảo Trân');await p.click('#fQNew button[type=submit]');await p.waitForTimeout(1200);await shot('quay-don',1);
 await p.selectOption('#wKM','KM-001');await p.waitForTimeout(300);await shot('quay-don-km',1);
 await p.click('#fW button[type=submit]');await p.waitForTimeout(1000);
 await p.fill('#qzIn','0905111222');await p.click('#fQZ button[type=submit]');await shot('quay-khach-cu',1);
 await p.click('[data-dk="DK-0002"]');await shot('quay-don-cho',1);await p.click('[data-act=thuCK]');await p.waitForTimeout(1200);
 /* SALE */
 await p.goto(BASE+'sale/');await p.waitForTimeout(2000);await shot('sale');await overflow('sale');
 await p.click('[data-web="WEB-0001"]');await shot('sale-lead',1);await p.click('[data-act=tuChoi]');await p.click('#fTuChoi button[type=submit]');await p.waitForTimeout(1000);
 await p.click('[data-web="WEB-0002"]');await p.click('[data-act=chotWeb]');await p.waitForTimeout(1500);await shot('sale-chot',1);
 await p.keyboard.press('Escape');await p.goto(BASE+'admin/?app=sale#cham-soc');await p.waitForTimeout(1500);await shot('cham-soc');
 /* GIAO */
 await p.goto(BASE+'giao/');await p.waitForTimeout(2000);await shot('tuyen');await overflow('tuyen');
 await p.click('[data-stop="GN-0001"]');await shot('diem-dung',1);await p.check('input[name=ma]');await p.click('#fStop button[type=submit]');await p.waitForTimeout(1500);
 console.log('Ghi dữ liệu:\n'+calls.join('\n'));console.log('Lỗi JS:',errs.length?errs:'không');await b.close()})();
