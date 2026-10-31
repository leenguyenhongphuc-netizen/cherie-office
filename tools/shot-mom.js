/* Chụp landing /mom: bìa, từng chương (vuốt ngang), cuối trang, ở 430 tối/sáng, 390 và máy tính. In lỗi JS, tràn ngang, nút nhỏ, chiều cao trang. node tools/shot-mom.js <url> <thư mục> */
const {chromium}=require('playwright');const [,,BASE='http://localhost:8765/',OUT='.']=process.argv;
(async()=>{const b=await chromium.launch();
 for(const [sc,w,h] of [['dark',430,932],['light',430,932],['light',390,844],['light',1280,900]]){const p=await (await b.newContext({viewport:{width:w,height:h},colorScheme:sc,hasTouch:w<800})).newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
  await p.goto(BASE+'mom/?utm_source=facebook&utm_campaign=me-bau-t11');await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/${sc}-${w}-0.png`});
  const hs=[];
  for(let i=0;i<7;i++){await p.evaluate(i=>document.querySelectorAll('#tabs button')[i].click(),i);await p.waitForTimeout(900);
    await p.evaluate(()=>scrollTo(0,document.getElementById('doc').getBoundingClientRect().top+scrollY-document.getElementById('hd').offsetHeight));await p.waitForTimeout(500);
    hs.push(await p.evaluate(()=>document.getElementById('deck').offsetHeight));
    await p.screenshot({path:`${OUT}/${sc}-${w}-c${i+1}.png`})}
  await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(500);await p.screenshot({path:`${OUT}/${sc}-${w}-end.png`});
  const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,page:document.body.scrollHeight,cta:Math.round(document.querySelector('.cover .cta .btn').getBoundingClientRect().bottom),chat:document.querySelector('.js-chat').getAttribute('href'),thumbs:document.querySelectorAll('#lk .th button').length,ct:document.getElementById('ct').textContent,small:[...document.querySelectorAll('a,button,summary')].filter(x=>x.offsetParent&&x.getBoundingClientRect().height<44&&!x.closest('.nums,.box,footer')).map(x=>x.textContent.trim().slice(0,24))}));
  console.log(sc,w,JSON.stringify(r),'chương:',hs.join(','),'JS:',e.length?e:'không')}
 await b.close()})();
