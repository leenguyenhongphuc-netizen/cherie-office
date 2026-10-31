/* Chụp toàn trang ở khổ iPhone 430x932, chế độ tối và sáng, để soi khoảng trống, cân xứng, ảnh cắt. node tools/shot-dark.js <url> <thư mục> */
const {chromium}=require('playwright');
const [,,BASE='http://localhost:8765/',OUT='.']=process.argv;
const PAGES=[['home',''],['me','#nhom-me-bau-sau-sinh'],['lead','#nhom-lead'],['classic','#nhom-classic'],['aodai','#nhom-ao-dai'],['travel','#nhom-travel'],['nqt','#nhom-ngay-quan-trong'],['tudo','#tu-do'],['gia','#goi-va-gia']];
(async()=>{const b=await chromium.launch();
 for(const scheme of ['dark','light']){const p=await (await b.newContext({viewport:{width:430,height:932},colorScheme:scheme,deviceScaleFactor:1})).newPage();
  await p.route(/script\.google\.com/,r=>r.fulfill({contentType:'application/json',body:'{"ok":true}'}));
  for(const [n,h] of PAGES){await p.goto(BASE+h);await p.waitForTimeout(1800);
   await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}scrollTo(0,0)});await p.waitForTimeout(800);
   await p.screenshot({path:`${OUT}/${scheme}-${n}.png`,fullPage:true})}}
 await b.close()})();
