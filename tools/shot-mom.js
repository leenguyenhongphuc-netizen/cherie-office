/* Chụp landing /mom ở khổ iPhone 430 (tối, sáng), 390 và máy tính; in lỗi JS, tràn ngang, nút nhỏ, vị trí nút chính. node tools/shot-mom.js <url> <thư mục> */
const {chromium}=require('playwright');const [,,BASE='http://localhost:8765/',OUT='.']=process.argv;
(async()=>{const b=await chromium.launch();
 for(const [sc,w,h] of [['dark',430,932],['light',430,932],['light',390,844],['light',1280,900]]){const p=await (await b.newContext({viewport:{width:w,height:h},colorScheme:sc})).newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
  await p.goto(BASE+'mom/?utm_source=facebook&utm_campaign=me-bau-t11');await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/${sc}-${w}-0.png`});
  await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,140))}});await p.waitForTimeout(700);
  await p.evaluate(()=>{scrollTo(0,0);document.querySelector('.sbar').style.display='none';document.querySelector('.hd').style.position='absolute'});await p.waitForTimeout(400);
  await p.screenshot({path:`${OUT}/${sc}-${w}.png`,fullPage:true});
  const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cta:Math.round(document.querySelector('.cover .cta .btn').getBoundingClientRect().bottom),chat:document.querySelector('.js-chat').getAttribute('href'),lb:document.querySelectorAll('#lb figure').length,small:[...document.querySelectorAll('a,button,summary')].filter(x=>x.offsetParent&&x.getBoundingClientRect().height<44&&!x.closest('.nums,.box,footer,.lb')).map(x=>x.textContent.trim().slice(0,24))}));
  console.log(sc,w,JSON.stringify(r),'JS:',e.length?e:'không')}
 await b.close()})();
