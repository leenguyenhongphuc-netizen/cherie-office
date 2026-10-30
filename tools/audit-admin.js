/* Rà soát app Quản trị trên khổ điện thoại với dữ liệu giả lập, không gọi máy chủ thật. node tools/audit-admin.js <url gốc> <thư mục ảnh> */
const {chromium}=require('playwright');const fs=require('fs');
const [,,BASE='http://localhost:8765/',OUT='.']=process.argv;
const src=fs.readFileSync(__dirname+'/../office-data.js','utf8');const CAT=JSON.parse(src.slice(src.indexOf('=')+1,src.lastIndexOf(';')));
const ids=CAT.sp.filter(s=>s.loai==='Classic'&&s.nhom!=='Phụ kiện').map(s=>s.id);
const bo=[0,1,2,3,4,5,6,7,8,9].map(i=>ids[i]+'+'+ids[i+12]).join(';');
const T={
 Dong:[['TenDong','ThuTu','CachThue'],['Classic','1','Theo tuần'],['Lead','2','Theo tuần'],['Mẹ bầu & Sau sinh','3','Theo tuần']],
 Goi:[['MaGoi','Dong','TenGoi','SoBo','CachDoi','ChuyenMoiTuan','GiaTuan','DonVi'],['G-CL-10','Classic','Gói 10 bộ','10','','1','369000','/tuần'],['G-CL-5','Classic','Gói 5 bộ','5','','2','319000','/tuần']],
 ThamSo:[['Khoa','GiaTri'],['tyLeNhap','1'],['giat','1'],['giao','1'],['hanMac','1'],['lanTuan','1'],['mucTieu','1'],['giam','1']],
 GiaNhap:[['MaDM (nhập)','GiaNhap (nhập, đồng)','NgayCapNhat','GhiChu (nơi mua, đợt sale)','Ten (tự hiện)'],[ids[0],'100000','2026-10-30','Sale','x']],
 ChiPhi:[['MaCP','Ngay','GhiChuTuDo','Nhom','SoTien','DinhKy','PhanBoThang']],
 DangKyWeb:[['MaWeb','NgayTao','Loai','Dong','Ten','Zalo','NoiLam','DiaChi','GiaoTai','Size','ChieuCao','NgayDuSinh','KieuPhongCach','TamTinh','GhiChu','TraLoi','TrangThai','XuLy','MaKQ','BoTu','LinkTu'],
   ['WEB-0001','2026-10-30 19:00','Đăng ký','Classic','Lan','0905123456','Tòa A','12 Bạch Đằng','Văn phòng','M','160','','Nàng Chỉn Chu','5130000','','{}','Mới','','KQ-00001',bo,'https://office.cherie.io.vn/#tu-KQ-00001-abcd2345']],
 KetQuaWeb:[['MaKQ','BoTu'],['KQ-00001',bo]],
 SanPham:[['MaSP','TenMau','Dong','Loai','Size','TrangThai','SoLanMac','HanMac','GiaVon'],['OF-CL-001-M','Veste Croisée','Classic','Vest','M','Sẵn sàng','0','40','2098000']],
 NhapTuLink:[['MaNhap','Link','TrangThai','SoLuong'],['NH-0001','https://www.pantio.vn/products/x','Đã đăng','1']],
 KhachHang:[['MaKH','Ten']],DangKy:[['MaDK','MaKH','TrangThai']],TuDo:[['MaTD']],GiaoNhan:[['MaChuyen']]};
(async()=>{const b=await chromium.launch(),p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(/script\.google\.com/,async r=>{const q=JSON.parse(r.request().postData()||'{}');let o={ok:true};if(q.fn==='me')o={me:{ten:'Phúc',vaiTro:'Admin',quyen:{}}};if(q.fn==='load')o={me:{ten:'Phúc',vaiTro:'Admin',quyen:{}},tabs:T};if(q.fn==='staff')o={staff:[]};console.log('API',q.fn,q.tab||'',q.ma||'');await r.fulfill({contentType:'application/json',body:JSON.stringify(o)})});
 await p.goto(BASE+'admin/');await p.evaluate(()=>{localStorage.setItem('of-admin-token','t');localStorage.setItem('of-admin-me',JSON.stringify({ten:'Phúc',vaiTro:'Admin',quyen:{}}))});await p.reload();
 let n=0;const shot=async(nm,full)=>{await p.waitForTimeout(900);await p.screenshot({path:`${OUT}/${String(++n).padStart(2,'0')}-${nm}.png`,fullPage:!!full})};
 await p.goto(BASE+'admin/#tong-quan');await p.waitForTimeout(1500);await shot('tong-quan',1);
 await p.goto(BASE+'admin/#kho');await shot('kho-dang-co');
 await p.click('[data-kseg=dm]');await shot('danh-muc');await p.click('[data-dmh="IVY moda"]').catch(()=>p.click('[data-dmh]:nth-child(3)'));await shot('danh-muc-ivy');
 await p.click('[data-dmh="Tất cả"]');await p.click('[data-dm]');await shot('chi-tiet-mau',1);
 await p.fill('#gnGia','399000');await p.click('#fGN button[type=submit]');await p.waitForTimeout(800);
 await p.goto(BASE+'admin/#kho');await p.waitForTimeout(500);await p.click('[data-kseg=mua]');await shot('can-mua');
 await p.goto(BASE+'admin/#khach');await p.waitForTimeout(500);await p.click('[data-ks=web]');await p.click('[data-web]');await shot('khach-web',1);
 console.log('Lỗi JS:',errs.length?errs:'không');await b.close()})();
