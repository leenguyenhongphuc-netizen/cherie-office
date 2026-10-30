/* Rà soát toàn luồng website Office trên khổ điện thoại. Chạy: node tools/audit-flow.js <url> <thư mục ảnh> [dòng]
   Chặn mọi lời gọi máy chủ (không ghi dữ liệu giả vào Sheet). In lỗi JS, phần tử tràn ngang, nút dưới 44px, CTA nằm dưới màn hình đầu. */
const {chromium}=require('playwright');
const [,,BASE='http://localhost:8765/',OUT='.',LINE='classic']=process.argv;
(async()=>{
  const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,acceptDownloads:true}),p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route(/script\.google\.com/,r=>r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,ma:'KQ-00001',xem:'abcd2345'})}));
  let n=0;const shot=async(name,full)=>{await p.waitForTimeout(500);const f=`${OUT}/${String(++n).padStart(2,'0')}-${name}.png`;await p.screenshot({path:f,fullPage:!!full});
    const r=await p.evaluate(()=>{const W=innerWidth,bad=[],small=[];document.querySelectorAll('body *').forEach(e=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return;const q=e.getBoundingClientRect();if(!q.width)return;if(q.right>W+1&&!e.closest('.rail,.chips,.chips2,#catNav,.hearts,.marq,[style*=overflow]'))bad.push(e.tagName+'.'+e.className);if(e.matches('a.pill,button')&&e.offsetParent&&q.height<40)small.push((e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,24)+':'+Math.round(q.height))});return {bad:[...new Set(bad)].slice(0,5),small:[...new Set(small)].slice(0,6),scrollW:document.documentElement.scrollWidth}});
    console.log(f,JSON.stringify(r))};
  await p.goto(BASE);await shot('trang-chu');await shot('trang-chu-full',1);
  await p.goto(BASE+'#nhom-'+LINE);await shot('trang-dong');
  const cta=await p.evaluate(()=>{const a=[...document.querySelectorAll('#v-nhom a.pill,#v-nhom button.pill')].filter(x=>x.offsetParent)[0];return a?Math.round(a.getBoundingClientRect().top):-1});console.log('CTA đầu tiên trang dòng ở y =',cta,cta>0&&cta<760?'(thấy ngay)':'(PHẢI KÉO MỚI THẤY)');
  await p.goto(BASE+'#chan-doan-'+LINE);await shot('trac-nghiem-mo-dau');
  for(let i=0;i<40;i++){
    if(await p.$('#qTen')){await shot('hoan-tat');await p.click('#qNext').catch(()=>{});await p.waitForTimeout(300);console.log('Bấm Xem kết quả khi trống -> trang:',await p.evaluate(()=>location.hash));
      if(!(await p.evaluate(()=>location.hash)).includes('ket-qua')){await p.fill('#qTen','Lan');await p.fill('#qZalo','0905123456');await p.check('#qOk');await shot('hoan-tat-da-dien');await p.click('#qNext')}break}
    await p.evaluate(()=>{const z=document.querySelector('#qz');z.querySelectorAll('[data-part]').forEach(w=>{if(!w.querySelector('[aria-pressed=true]')){const o=w.querySelector('.op');o&&o.click()}});const hs=[...z.querySelectorAll('[data-heart]')];if(hs.length&&!z.querySelector('[data-heart][aria-pressed=true]'))hs.slice(0,3).forEach(h=>h.click());const bd=z.querySelector('[data-b="Không có"]');if(bd&&bd.getAttribute('aria-pressed')!=='true')bd.click()});
    if(i<3||i%4===0)await shot('cau-'+i);
    await p.waitForTimeout(350);const nx=await p.$('#qNext:not([hidden]):not([disabled])');if(nx)await nx.click();await p.waitForTimeout(300);
    if((await p.evaluate(()=>location.hash)).includes('ket-qua'))break}
  await p.waitForTimeout(800);await shot('ket-qua');await shot('ket-qua-full',1);
  const g=await p.$('#res a[data-su=giu_tu]');if(g){await g.click();await p.waitForTimeout(500);await shot('dang-ky-1');
    for(let s=2;s<=4;s++){const nb=await p.$('#v-dang-ky button.pill:not([hidden]):not([disabled])');if(!nb)break;await nb.click();await p.waitForTimeout(400);await shot('dang-ky-'+s)}}
  console.log('Lỗi JS:',errs.length?errs:'không');await b.close()})();
