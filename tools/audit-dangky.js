/* Thử luồng giữ tủ → đăng ký → trang đã đăng ký, cả giao văn phòng và nhà riêng. Chặn máy chủ. */
const {chromium}=require('playwright');const [,,BASE='http://localhost:8765/',OUT='.']=process.argv;
(async()=>{const b=await chromium.launch(),p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));let sent=null;
 await p.route(/script\.google\.com/,async r=>{const q=JSON.parse(r.request().postData()||'{}');if(q.fn==='webDangKy')sent=q;await r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,ma:'WEB-0009',xem:'abcd2345'})})});
 let n=0;const shot=async(nm,full)=>{await p.waitForTimeout(600);await p.screenshot({path:`${OUT}/${String(++n).padStart(2,'0')}-${nm}.png`,fullPage:!!full})};
 for(const nha of [false,true]){
 await p.goto(BASE);await p.evaluate(()=>sessionStorage.setItem('of-result',JSON.stringify({line:'Classic',slug:'classic',type:'Thanh lịch',mode:'Ổn định',a:{size:'S',vayQuan:'Quần'},bo:'OF-CL-001+OF-CL-013;OF-CL-005+OF-CL-022',at:9,ten:'Lan',maKQ:'KQ-00001',xem:'abcd2345'})));
 await p.goto(BASE+'#ket-qua');await p.waitForTimeout(800);await p.click('#res a[data-su=giu_tu]');await p.waitForTimeout(500);
 await p.click('#next');await p.waitForTimeout(300);await p.click('#next');await p.waitForTimeout(300);
 if(nha){await p.check('input[name=ship][value="Nhà riêng"]');await p.check('input[name=khu][value="Mở rộng"]')}
 await shot(nha?'buoc3-nha':'buoc3-vp',1);
 await p.click('#next');await p.waitForTimeout(300);console.log('bấm Tiếp khi trống, lỗi hiện:',await p.isVisible('#e3'));
 await p.fill('#fName','Lan Anh');await p.fill('#fZalo','0905123456');
 if(nha){await p.fill('#fAddr','12 Lê Văn Hiến, Ngũ Hành Sơn');await p.click('[data-slot=gioNha][data-v="16:00 – 18:00"]')}else{await p.fill('#fWork','Công ty ABC');await p.fill('#fToa','Vĩnh Trung Plaza, 255 Hùng Vương');await p.fill('#fTang','Tầng 12');await p.click('[data-slot=gioVP][data-v="7:30 – 8:30"]')}
 await p.click('#next');await p.waitForTimeout(400);await shot(nha?'buoc4-nha':'buoc4-vp',1);
 await p.click('#next');await p.waitForTimeout(1200);console.log('trang sau gửi:',await p.evaluate(()=>location.hash),'| gửi lên:',sent&&[sent.giaoTai,sent.diaChi,sent.ghiChu].join(' | '));await shot(nha?'da-dang-ky-nha':'da-dang-ky-vp',1)}
 console.log('Lỗi JS:',errs.length?errs:'không');await b.close()})();
