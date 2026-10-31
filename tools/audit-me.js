/* Rà luồng trò chuyện dòng Mẹ bầu & Sau sinh tới trang kết quả, khổ điện thoại, chặn máy chủ.
   node tools/audit-me.js <url> <thư mục ảnh> [Đang mang bầu|Đã sinh, đang cho con bú] [chip dáng] */
const {chromium}=require('playwright');
const [,,BASE='http://localhost:8765/',OUT='.',GD='Đang mang bầu',DANG='Suông, che bụng']=process.argv;
(async()=>{const b=await chromium.launch(),p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(/script\.google\.com/,r=>r.fulfill({contentType:'application/json',body:'{"ok":true}'}));
 await p.goto(BASE+'#chan-doan-me');await p.waitForTimeout(1500);
 for(let i=0;i<30;i++){await p.waitForTimeout(1600);if((await p.evaluate(()=>location.hash))==='#ket-qua')break;
  if(await p.$('#chTen')){await p.fill('#chTen','Mẹ Thử');await p.fill('#chZalo','0905123456');await p.click('[data-send=contact]');continue}
  if(await p.$('#chDate')){const d=new Date(Date.now()+120*864e5).toISOString().slice(0,10);await p.fill('#chDate',d);await p.click('[data-send=date]');continue}
  const want=[GD,DANG];let hit=null;for(const w of want){hit=await p.$(`#repliesIn [data-c="${w}"]`);if(hit)break}
  if(!hit)hit=await p.$('#repliesIn [data-c]');if(!hit)continue;await hit.click();
  if(await p.$('#repliesIn [data-send=multi]')){await p.click('#repliesIn [data-send=multi]')}}
 await p.waitForTimeout(1500);await p.screenshot({path:OUT+'/me-ket-qua.png',fullPage:true});
 const b1=await p.evaluate(()=>JSON.parse(sessionStorage.getItem("of-result")).bo);const dt=await p.$("[data-doitu]");if(dt){await dt.click();await p.waitForTimeout(1200);const r2=await p.evaluate(()=>{const x=JSON.parse(sessionStorage.getItem("of-result"));return [x.bo,document.querySelectorAll(".caps .pc").length]});console.log("Đề xuất tủ khác:",r2[0]!==b1?"đổi tủ":"KHÔNG ĐỔI",r2[1],"thẻ")}
 const r=await p.evaluate(()=>{const x=JSON.parse(sessionStorage.getItem('of-result')||'{}');return {hash:location.hash,bo:x.bo,scrollW:document.documentElement.scrollWidth}});
 console.log(JSON.stringify(r,null,1));console.log('Lỗi JS:',errs.length?errs:'không');await b.close()})();
