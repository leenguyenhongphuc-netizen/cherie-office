/* CHÉRIE Office · Insight (CMI): đọc dữ liệu hành vi từ Sheet Office qua máy chủ Apps Script, chỉ người có quyền "Insight" xem */
(function(){
"use strict";
var API=window.OFFICE_API||"";
var TK="of-admin-token",ME="of-admin-me";
var token="",me=null;try{token=localStorage.getItem(TK)||"";me=JSON.parse(localStorage.getItem(ME)||"null")}catch(e){}
var TABS=["KetQuaWeb","SuKienWeb","DangKyWeb","DangKy","KhachHang","InsightAI"];
var S={data:{},loaded:false,loading:false,err:null,view:"tong-quan",ky:"30",dong:"Tất cả",q:""};
var SP={};try{(window.OFFICE_DATA&&window.OFFICE_DATA.sp||[]).forEach(function(s){SP[s.id]=s});var A={};(window.OFFICE_DATA.anh||[]).forEach(function(a){if(!A[a.sp])A[a.sp]=a.th||a.src});Object.keys(A).forEach(function(k){if(SP[k])SP[k]._img=A[k]})}catch(e){}

function $(s,r){return (r||document).querySelector(s)}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function pct(a,b){return b?Math.round(a*1000/b)/10:0}
function fmt(n){return Number(n||0).toLocaleString("vi-VN")}
var tt;function toast(m,ms){var t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(tt);if(ms!==0)tt=setTimeout(function(){t.hidden=true},ms||2600)}
function saveAuth(t,m){token=t||"";me=m||null;try{if(token){localStorage.setItem(TK,token);localStorage.setItem(ME,JSON.stringify(me))}else{localStorage.removeItem(TK);localStorage.removeItem(ME)}}catch(e){}}
function api(fn,args){return fetch(API,{method:"POST",redirect:"follow",body:JSON.stringify(Object.assign({fn:fn,token:token},args||{}))}).then(function(r){return r.json()}).then(function(r){if(r&&r.err){var e=new Error(r.err);e.code=r.code;if(e.code==="revoked"){saveAuth("",null)}throw e}return r})}
function can(sec){if(!me)return false;if(me.vaiTro==="Admin")return true;return ((me.quyen||{})[sec]||"Không")!=="Không"}
function parseTab(values){values=values||[];var h=(values[0]||[]).map(function(x){return String(x).trim()});var out=[];
  for(var i=1;i<values.length;i++){var v=values[i]||[];if(!v.some(function(c){return String(c).trim()!==""}))continue;var o={_r:i+1};h.forEach(function(k,j){if(k)o[k]=v[j]==null?"":String(v[j])});out.push(o)}return out}
function load(){S.loading=true;S.err=null;render();
  return api("load",{tabs:TABS}).then(function(r){Object.keys(r.tabs||{}).forEach(function(t){S.data[t]=parseTab(r.tabs[t])});if(r.me){me=r.me;saveAuth(token,me)}S.loaded=true;S.loading=false;S.at=new Date();render()},function(e){S.loading=false;S.err=e;render()})}

/* ---------- lọc theo kỳ và dòng ---------- */
function ts(s){var m=String(s||"").match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);return m?new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0)).getTime():0}
function bounds(off){var d=S.ky==="all"?0:+S.ky,now=Date.now(),day=864e5;if(!d)return off?null:[0,now+day];return [now-d*day*(off+1),now-d*day*off]}
function inK(t,b){return b&&t>=b[0]&&t<b[1]}
function KQ(off){var b=bounds(off||0);return (S.data.KetQuaWeb||[]).filter(function(r){return inK(ts(r.NgayTao),b)&&(S.dong==="Tất cả"||r.Dong===S.dong)})}
function SK(off){var b=bounds(off||0);return (S.data.SuKienWeb||[]).filter(function(r){return inK(ts(r.Luc),b)})}
function uniq(a){var o={};a.forEach(function(x){if(x)o[x]=1});return Object.keys(o).length}
function count(list,get){var o={};list.forEach(function(r){var v=get(r);(Array.isArray(v)?v:[v]).forEach(function(k){k=String(k||"").trim();if(k)o[k]=(o[k]||0)+1})});return Object.keys(o).map(function(k){return {k:k,n:o[k]}}).sort(function(a,b){return b.n-a.n})}

/* ---------- mảnh giao diện ---------- */
function kpi(l,v,h,hero){return '<div class="kpi'+(hero?" hero":"")+'"><div class="l">'+esc(l)+'</div><div class="v num">'+v+'</div>'+(h?'<div class="h">'+h+'</div>':"")+'</div>'}
function delta(a,b){if(S.ky==="all"||b==null)return "";if(!b)return a?"Kỳ trước: 0":"";var d=Math.round((a-b)*100/b);return (d>=0?"Tăng ":"Giảm ")+Math.abs(d)+"% so với kỳ trước"}
function bars(list,total,opt){opt=opt||{};if(!list.length)return '<p class="small muted">Chưa có dữ liệu trong kỳ này.</p>';var mx=Math.max.apply(null,list.map(function(x){return x.n}))||1;
  return '<div class="bars">'+list.slice(0,opt.top||12).map(function(x){var p=total?pct(x.n,total):null;return '<div class="bar" title="'+esc(x.k)+": "+fmt(x.n)+(p!=null?" ("+p+"%)":"")+'"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(x.k)+'</span><span class="t"><i style="width:'+(x.n*100/mx)+'%"></i></span><span class="n">'+(opt.pctOnly&&p!=null?p+"%":fmt(x.n))+'</span></div>'}).join("")+'</div>'}
function empty(t,d){return '<div class="banner info"><div><b>'+esc(t)+'</b>'+esc(d)+'</div></div>'}
function panel(title,body,sub){return '<h2>'+esc(title)+'</h2>'+(sub?'<p class="small muted" style="margin:-4px 0 8px">'+esc(sub)+'</p>':"")+'<div class="panel">'+body+'</div>'}

/* ---------- 1. Tổng quan ---------- */
function vTong(){
  var k=KQ(0),k1=S.ky==="all"?null:KQ(1),s=SK(0),s1=S.ky==="all"?null:SK(1);
  var vis=uniq(s.map(function(r){return r.MaKhachWeb}).concat(k.map(function(r){return r.MaKhachWeb}))),vis1=s1?uniq(s1.map(function(r){return r.MaKhachWeb})):null;
  var zalo=k.filter(function(r){return r.DongY==="Có"}).length,ngai=k.filter(function(r){return r.NgaiGia==="Có"}).length,giu=k.filter(function(r){return r.BamGiuTu==="Có"}).length,dk=k.filter(function(r){return r.DaDangKy}).length;
  var h='<div class="kpis">'+kpi("Người ghé website",fmt(vis),delta(vis,vis1),true)+
    kpi("Làm xong trắc nghiệm",fmt(k.length),delta(k.length,k1&&k1.length))+kpi("Để lại Zalo",fmt(zalo),pct(zalo,k.length)+"% người làm xong")+
    kpi("Bấm Giá hơi cao",fmt(ngai),pct(ngai,k.length)+"% người xem kết quả")+kpi("Bấm Giữ tủ này",fmt(giu),pct(giu,k.length)+"% người xem kết quả")+
    kpi("Gửi đăng ký",fmt(dk),pct(dk,k.length)+"% người làm xong")+kpi("Thời gian làm trung vị",medianSec(k)+" giây","Trắc nghiệm và trò chuyện mẹ")+'</div>';
  h+=vViec();
  /* lượt làm xong theo ngày, 14 ngày gần nhất */
  var days=[],now=new Date();for(var i=13;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);days.push(d)}
  var all=(S.data.KetQuaWeb||[]).filter(function(r){return S.dong==="Tất cả"||r.Dong===S.dong});
  var cnt=days.map(function(d){var a=d.getTime(),b=a+864e5;return all.filter(function(r){var t=ts(r.NgayTao);return t>=a&&t<b}).length});var mx=Math.max.apply(null,cnt.concat([1]));
  h+=panel("Làm xong trắc nghiệm theo ngày",'<div class="cols" role="img" aria-label="Số người làm xong trắc nghiệm mỗi ngày, 14 ngày gần nhất">'+cnt.map(function(c,i){var d=days[i];return '<div class="col" title="'+d.getDate()+'/'+(d.getMonth()+1)+': '+c+' người"><span class="cv">'+(c||"")+'</span><i style="height:'+(c?Math.max(4,c*100/mx):0)+'%"></i><span class="cd">'+d.getDate()+'</span></div>'}).join("")+'</div>',"14 ngày gần nhất (số dưới cột là ngày), không theo bộ lọc kỳ");
  return h}
function medianSec(k){var a=k.map(function(r){return +r.GiayLam||0}).filter(Boolean).sort(function(x,y){return x-y});return a.length?a[Math.floor(a.length/2)]:0}
function vViec(){
  var rows=(S.data.InsightAI||[]).filter(function(r){return (r.TrangThai||"Chờ duyệt")==="Chờ duyệt"});
  if(!S.data.InsightAI||!rows.length)return panel("Việc nên làm",'<p class="small muted">AI chưa có đề xuất mới. Skill Insight bắt đầu chạy khi đủ 2 tuần số liệu; mỗi đề xuất hiện ở đây để bạn Duyệt hoặc Bỏ qua, không có gì tự gửi cho khách.</p>');
  return panel("Việc nên làm",'<div class="list">'+rows.slice(0,8).map(function(r){return '<div class="item noimg" style="display:block"><div class="t1">'+esc(r.TieuDe)+'</div><div class="t2">'+esc(r.NoiDung)+'</div>'+(r.CanCu?'<div class="small muted" style="margin-top:4px">Căn cứ: '+esc(r.CanCu)+(r.DoTinCay?" · Độ tin cậy "+esc(r.DoTinCay):"")+'</div>':"")+'<div class="btnrow" style="margin-top:8px"><button class="btn ok" type="button" data-duyet="'+r._r+'" data-ma="'+esc(r.MaThe)+'">Duyệt</button><button class="btn ghost" type="button" data-bo="'+r._r+'" data-ma="'+esc(r.MaThe)+'">Bỏ qua</button></div></div>'}).join("")+'</div>',rows.length+" đề xuất chờ bạn xem")}

/* ---------- 2. Phễu và điểm rơi ---------- */
function vPheu(){
  var s=SK(0),k=KQ(0);
  var line=function(r){var p=String(r.GiaTri).split("|");return p[0]};
  var lineOk=function(r){if(S.dong==="Tất cả")return true;var sl=line(r);return sl===slugOf(S.dong)};
  var fin=k.map(function(r){return r.MaKhachWeb});var vStart=uniq(s.filter(function(r){return r.SuKien==="buoc"&&lineOk(r)}).map(function(r){return r.MaKhachWeb}).concat(fin));
  var vMid=uniq(s.filter(function(r){if(r.SuKien!=="buoc"||!lineOk(r))return false;var q=String(r.GiaTri).split("|")[1]||"";return /^Q([4-9]|\d\d)/.test(q)||(/^me$/.test(line(r))&&/size|nganh|diLai|lienHe/.test(r.GiaTri))}).map(function(r){return r.MaKhachWeb}).concat(fin));
  var stages=[{k:"Bắt đầu trắc nghiệm hoặc trò chuyện",n:vStart},{k:"Đi được quá nửa",n:vMid},{k:"Làm xong, xem kết quả",n:uniq(k.map(function(r){return r.MaKhachWeb}))},{k:"Để lại Zalo",n:uniq(k.filter(function(r){return r.DongY==="Có"}).map(function(r){return r.MaKhachWeb}))},{k:"Bấm Giữ tủ này",n:uniq(k.filter(function(r){return r.BamGiuTu==="Có"}).map(function(r){return r.MaKhachWeb}))},{k:"Gửi đăng ký",n:uniq(k.filter(function(r){return r.DaDangKy}).map(function(r){return r.MaKhachWeb}))}];
  for(var z=1;z<stages.length;z++)stages[z].n=Math.min(stages[z].n,stages[z-1].n);var first=stages[0].n||1;
  var h=panel("Phễu",'<div class="funnel">'+stages.map(function(x,i){var p=pct(x.n,first),prev=i?stages[i-1].n:0;return '<div class="fs" title="'+esc(x.k)+': '+x.n+' người"><div class="fl"><span>'+esc(x.k)+'</span><span class="mono">'+fmt(x.n)+' · '+p+'%</span></div><div class="ft"><i style="width:'+Math.max(p,x.n?2:0)+'%"></i></div>'+(i&&prev?'<div class="small muted">Giữ lại '+pct(x.n,prev)+'% từ bước trước</div>':"")+'</div>'}).join("")+'</div>',"Số người (theo mã ẩn danh), so với bước đầu");
  /* điểm rơi: bỏ ngang ở bước nào; thời gian trung bình mỗi bước */
  var drop=count(s.filter(function(r){return r.SuKien==="bo_ngang"&&lineOk(r)}),function(r){var p=String(r.GiaTri).split("|");return stepName(p)});
  h+=panel("Rời trang ở bước nào",bars(drop,0),"Khách đóng trang hoặc rời đi khi đang ở bước này");
  var tm={};s.filter(function(r){return r.SuKien==="xong_buoc"&&lineOk(r)}).forEach(function(r){var p=String(r.GiaTri).split("|"),sec=parseInt(p[p.length-1],10)||0,k=stepName(p);(tm[k]=tm[k]||[]).push(sec)});
  var slow=Object.keys(tm).map(function(k){var a=tm[k].sort(function(x,y){return x-y});return {k:k,n:a[Math.floor(a.length/2)]}}).sort(function(a,b){return b.n-a.n});
  h+=panel("Bước làm lâu nhất (giây, trung vị)",bars(slow,0),"Bước lâu thường là câu khó hiểu hoặc phải nghĩ nhiều");
  return h}
function slugOf(k){var m={"Mẹ bầu & Sau sinh":"me","Lead":"lead","Áo dài":"ao-dai","Travel":"travel","Ngày quan trọng":"ngay-quan-trong","Classic":"classic"};return m[k]||k}
var SLUG_TEN={me:"Mẹ",classic:"Classic",lead:"Lead","ao-dai":"Áo dài",travel:"Travel","ngay-quan-trong":"Ngày quan trọng"};
function stepName(p){if(p[0]==="me")return "Mẹ · "+(p[1]||"");var q=/^Q(\d+)$/.exec(p[1]||"");return (SLUG_TEN[p[0]]||p[0]||"")+" · "+(q?(+q[1]===0?"Mở đầu":"Câu "+q[1]):(p[1]||""))}

/* ---------- 3. Chân dung ---------- */
function vChan(){
  var k=KQ(0);if(!k.length)return empty("Chưa có ai làm xong trong kỳ này","Đổi kỳ sang Tất cả hoặc chờ thêm dữ liệu.");
  var n=k.length,h="";
  h+=panel("Dòng quan tâm",bars(count(k,function(r){return r.Dong}),n));
  h+=panel("Kiểu phong cách",bars(count(k,function(r){return r.KieuPhongCach}),n));
  h+=panel("Size",bars(count(k,function(r){return r.Size}),n),"Dùng để chia size khi mua hàng");
  h+=panel("Đi làm hay mặc",bars(count(k,function(r){return r.VayQuan}),n));
  h+=panel("Màu thích",bars(count(k,function(r){return r.MauThich}),n));
  h+=panel("Điều muốn tránh",bars(count(k,function(r){return String(r.Tranh).split(",")}),n));
  h+=panel("Giai đoạn (dòng Mẹ)",bars(count(k,function(r){return r.GiaiDoan}),n));
  h+=panel("Nguồn truy cập",bars(count(k,function(r){return [r.Nguon,r.ChienDich].filter(Boolean).join(" · ")||"Không rõ"}),n));
  h+=panel("Thiết bị",bars(count(k,function(r){return r.ThietBi}),n));
  return h}

/* ---------- 4. Giá và độ nhạy ---------- */
function vGia(){
  var k=KQ(0),s=SK(0);if(!k.length)return empty("Chưa có kết quả trong kỳ này","Đổi kỳ sang Tất cả hoặc chờ thêm dữ liệu.");
  var rate=function(get){var g={};k.forEach(function(r){var key=get(r)||"Không rõ";g[key]=g[key]||{n:0,c:0};g[key].n++;if(r.NgaiGia==="Có")g[key].c++});return Object.keys(g).map(function(x){return {k:x+" ("+g[x].n+")",n:pct(g[x].c,g[x].n)}}).sort(function(a,b){return b.n-a.n})};
  var ngai=k.filter(function(r){return r.NgaiGia==="Có"});
  var h='<div class="kpis">'+kpi("Tỷ lệ bấm Giá hơi cao",pct(ngai.length,k.length)+"%",ngai.length+" / "+k.length+" người xem kết quả",true)+
    kpi("Ngại giá nhưng vẫn đăng ký",fmt(ngai.filter(function(r){return r.DaDangKy}).length),"Giá chưa phải rào cản cuối")+kpi("Ngại giá, chưa để Zalo",fmt(ngai.filter(function(r){return r.DongY!=="Có"}).length),"Khó liên hệ lại")+'</div>';
  h+=panel("Tỷ lệ ngại giá theo dòng (%)",barsPct(rate(function(r){return r.Dong})),"Trong ngoặc là số người xem kết quả");
  h+=panel("Tỷ lệ ngại giá theo nguồn (%)",barsPct(rate(function(r){return r.Nguon})));
  h+=panel("Gói thay thế khách bấm sau khi ngại giá",bars(count(s.filter(function(r){return r.SuKien==="chon_goi_thay"}),function(r){return r.GiaTri}),0));
  return h}
function barsPct(list){return bars(list.map(function(x){return {k:x.k,n:x.n}}),0).replace(/<span class="n">([\d.,]+)<\/span>/g,'<span class="n">$1%</span>')}

/* ---------- 5. Sản phẩm ---------- */
function vSan(){
  var k=KQ(0),s=SK(0),st={};
  var add=function(id,f){if(!id)return;st[id]=st[id]||{tim:0,de:0,xem:0};st[id][f]++};
  k.forEach(function(r){String(r.TimMa).split(",").forEach(function(x){add(x.trim(),"tim")});String(r.TuDeXuat).split(",").forEach(function(x){add(x.trim(),"de")})});
  s.filter(function(r){return r.SuKien==="xem_mon"}).forEach(function(r){add(r.GiaTri,"xem")});
  var list=Object.keys(st).map(function(id){var x=st[id];x.id=id;x.diem=x.tim*3+x.xem+x.de*0.5;return x}).sort(function(a,b){return b.diem-a.diem});
  if(!list.length)return empty("Chưa có lượt thả tim hay xem món","Số liệu hiện ra khi khách làm trắc nghiệm và xem tủ đồ.");
  var row=function(x){var p=SP[x.id]||{};return '<div class="item"><div class="thumb">'+(p._img?'<img src="'+esc(p._img)+'" alt="" loading="lazy">':"")+'</div><div style="min-width:0"><div class="t1">'+esc(p.ten||x.id)+'</div><div class="t2">'+esc([p.brand,p.loai,x.id].filter(Boolean).join(" · "))+'</div><div class="small" style="margin-top:2px"><span class="mono">'+x.tim+'</span> tim · <span class="mono">'+x.xem+'</span> lượt xem · <span class="mono">'+x.de+'</span> lần đề xuất</div></div></div>'};
  var h=panel("Món được thích nhiều nhất",'<div class="list">'+list.slice(0,15).map(row).join("")+'</div>',"Điểm = tim × 3 + lượt xem + lần đề xuất × 0,5");
  var mua=list.filter(function(x){return x.tim>=2&&x.de===0}).slice(0,10);
  h+=panel("Nên cân nhắc mua thêm",mua.length?'<div class="list">'+mua.map(row).join("")+'</div>':'<p class="small muted">Chưa có món nào được thả tim từ 2 lần trở lên mà chưa từng vào tủ đề xuất.</p>',"Được thả tim nhiều nhưng chưa vào tủ đề xuất: có thể vì đắt hoặc chưa có trong kho");
  return h}

/* ---------- 6. Hồ sơ khách ---------- */
function vKhach(){
  var all=S.data.KetQuaWeb||[],ev=S.data.SuKienWeb||[],g={};
  all.forEach(function(r){var v=r.MaKhachWeb;if(!v)return;var x=g[v]=g[v]||{vid:v,kq:[],zalo:"",ten:""};x.kq.push(r);if(r.Zalo){x.zalo=r.Zalo.replace(/^'/,"");x.ten=r.Ten||x.ten}});
  var list=Object.keys(g).map(function(v){var x=g[v];x.last=Math.max.apply(null,x.kq.map(function(r){return ts(r.NgayTao)}));return x}).sort(function(a,b){return b.last-a.last});
  var q=S.q.trim().toLowerCase();if(q)list=list.filter(function(x){return (x.zalo+" "+x.ten+" "+x.vid).toLowerCase().indexOf(q)>-1});
  var h='<div class="f" style="margin-top:12px"><label for="qKh">Tìm theo Zalo, tên hoặc mã</label><input id="qKh" type="search" value="'+esc(S.q)+'" placeholder="0905…" autocomplete="off"></div>';
  if(!list.length)return h+empty("Chưa có hồ sơ","Hồ sơ hiện ra khi có người làm xong trắc nghiệm.");
  h+='<div class="list" style="margin-top:12px">'+list.slice(0,60).map(function(x){var r=x.kq[x.kq.length-1];var tags=[r.Dong,r.KieuPhongCach,r.Size].filter(Boolean).join(" · ");var flag=[x.kq.some(function(k){return k.NgaiGia==="Có"})?"Ngại giá":"",x.kq.some(function(k){return k.BamGiuTu==="Có"})?"Giữ tủ":"",x.kq.some(function(k){return k.DaDangKy})?"Đã đăng ký":""].filter(Boolean).join(" · ");
    return '<button type="button" class="item noimg" data-kh="'+esc(x.vid)+'" style="display:block;width:100%;text-align:left"><div class="t1">'+esc(x.ten||"Khách ẩn danh")+(x.zalo?' <span class="mono small">'+esc(x.zalo)+'</span>':"")+'</div><div class="t2">'+esc(tags)+'</div><div class="small muted">'+x.kq.length+' lần làm · '+esc(r.NgayTao.slice(0,16))+(flag?" · "+esc(flag):"")+'</div></button>'}).join("")+'</div>';
  return h}
function khachSheet(vid){
  var kq=(S.data.KetQuaWeb||[]).filter(function(r){return r.MaKhachWeb===vid}),ev=(S.data.SuKienWeb||[]).filter(function(r){return r.MaKhachWeb===vid}).sort(function(a,b){return ts(b.Luc)-ts(a.Luc)});
  var z=(kq.filter(function(r){return r.Zalo}).pop()||{}),zalo=String(z.Zalo||"").replace(/^'/,"");
  var dk=zalo?(S.data.DangKyWeb||[]).filter(function(r){return String(r.Zalo).replace(/^'/,"")===zalo}):[];
  var h='<h3>'+esc(z.Ten||"Khách ẩn danh")+'</h3><div class="small muted mono">'+esc(vid)+(zalo?" · Zalo "+esc(zalo):"")+'</div>';
  h+='<h2>Các lần làm</h2><div class="list">'+kq.map(function(r){var tim=String(r.TimMa).split(",").filter(Boolean).map(function(id){return (SP[id.trim()]||{}).ten||id}).slice(0,4).join(", ");
    return '<div class="item noimg" style="display:block"><div class="t1">'+esc(r.Dong)+' · '+esc(r.KieuPhongCach)+'</div><div class="t2">'+esc([r.Size&&"Size "+r.Size,r.VayQuan,r.MauThich,r.Tranh&&"Tránh "+r.Tranh].filter(Boolean).join(" · "))+'</div>'+(tim?'<div class="small">Thả tim: '+esc(tim)+'</div>':"")+'<div class="small muted">'+esc(r.NgayTao)+' · '+esc(r.Nguon||"")+' · '+esc(r.ThietBi||"")+(r.NgaiGia==="Có"?" · Ngại giá":"")+(r.BamGiuTu==="Có"?" · Giữ tủ":"")+(r.DaDangKy?" · Đăng ký "+esc(r.DaDangKy):"")+'</div></div>'}).join("")+'</div>';
  if(dk.length)h+='<h2>Đăng ký</h2><div class="list">'+dk.map(function(r){return '<div class="item noimg" style="display:block"><div class="t1">'+esc(r.MaWeb)+' · '+esc(r.Dong)+'</div><div class="small muted">'+esc(r.NgayTao)+' · '+esc(r.TrangThai)+'</div></div>'}).join("")+'</div>';
  var NAME={xem_trang:"Xem trang",xem_mon:"Xem món",buoc:"Vào bước",xong_buoc:"Xong bước",bo_ngang:"Rời trang ở",bam_zalo:"Bấm Zalo",chon_goi_thay:"Chọn gói thay thế",ngai_gia:"Bấm Giá hơi cao",giu_tu:"Bấm Giữ tủ",dang_ky:"Gửi đăng ký",loc_tu_do:"Lọc tủ đồ",xem_them:"Xem thêm món"};
  h+='<h2>Hành vi gần nhất</h2><div class="list">'+ev.slice(0,40).map(function(r){var v=r.SuKien==="xem_mon"?((SP[r.GiaTri]||{}).ten||r.GiaTri):/^(buoc|xong_buoc|bo_ngang)$/.test(r.SuKien)?(function(p){var t=stepName(p),sec=/^\d+s$/.test(p[p.length-1])?" · "+p[p.length-1].replace("s"," giây"):"";return t+sec})(String(r.GiaTri).split("|")):r.GiaTri;return '<div class="item noimg" style="display:block;padding:8px 12px"><div class="small"><b>'+esc(NAME[r.SuKien]||r.SuKien)+'</b> '+esc(v)+'</div><div class="small muted mono">'+esc(r.Luc)+'</div></div>'}).join("")+'</div>';
  openSheet(h)}
function openSheet(html){$("#sheetRoot").innerHTML='<div class="scrim" data-close="1"></div><div class="sheet" role="dialog" aria-modal="true"><div class="in"><div class="grab"></div><button class="close" type="button" data-close="1" aria-label="Đóng">×</button>'+html+'</div></div>'}
function closeSheet(){$("#sheetRoot").innerHTML=""}

/* ---------- khung ---------- */
var VIEWS=[["tong-quan","Tổng quan",vTong],["pheu","Phễu",vPheu],["chan-dung","Chân dung",vChan],["gia","Giá",vGia],["san-pham","Sản phẩm",vSan],["khach","Khách",vKhach]];
var DONG=["Tất cả","Mẹ bầu & Sau sinh","Lead","Áo dài","Travel","Ngày quan trọng","Classic"];
var staff=null,staffErr=null;
function vLogin(){var h='<div class="eyebrow">CHÉRIE Insight</div><h1>Đăng nhập</h1><p class="sub">Dùng tên và mã PIN của hệ quản trị Office. Hiện chỉ chủ tiệm xem được mục này.</p>';
  if(staffErr)return h+'<div class="banner bad"><div><b>Không tải được danh sách</b>'+esc(staffErr.message||"")+'<div class="act"><button class="btn" type="button" data-act="staff">Thử lại</button></div></div></div>';
  if(!staff)return h+'<div class="list">'+'<div class="skel"></div>'.repeat(3)+'</div>';
  return h+'<form class="form panel" id="fLogin"><div class="f"><label for="lgN">Bạn là</label><select id="lgN">'+staff.map(function(n){return '<option value="'+esc(n.id)+'">'+esc(n.ten)+'</option>'}).join("")+'</select></div><div class="f"><label for="lgP">Mã PIN</label><input id="lgP" type="password" inputmode="numeric" autocomplete="current-password" required></div><p class="small" id="lgE" role="alert" style="color:var(--bad)"></p><button class="btn full" type="submit">Vào Insight</button></form>'}
function render(){
  var m=$("#main"),sync=$("#sync");$("#logout").hidden=!token;$("#reload").hidden=!token;
  if(!token||!me){m.innerHTML=vLogin();sync.textContent="";if(!staff&&!staffErr)api("staff").then(function(r){staff=r.staff||[];render()},function(e){staffErr=e;render()});return}
  if(!can("Insight")){m.innerHTML='<div class="banner warn"><div><b>Bạn chưa có quyền xem Insight</b>Hiện mục này chỉ dành cho chủ tiệm.</div></div>';return}
  sync.innerHTML=esc(me.ten||"")+(S.at?"<br>Cập nhật "+("0"+S.at.getHours()).slice(-2)+":"+("0"+S.at.getMinutes()).slice(-2):"");
  var h='<nav class="chips" aria-label="Màn hình">'+VIEWS.map(function(v){return '<button type="button" class="chip" data-view="'+v[0]+'" aria-pressed="'+(S.view===v[0])+'">'+v[1]+'</button>'}).join("")+'</nav>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div class="seg" role="group" aria-label="Kỳ">'+[["7","7 ngày"],["30","30 ngày"],["all","Tất cả"]].map(function(x){return '<button type="button" data-ky="'+x[0]+'" aria-pressed="'+(S.ky===x[0])+'">'+x[1]+'</button>'}).join("")+'</div>'+
    (S.view==="khach"?"":'<label class="small" style="margin-top:12px">Dòng <select id="selDong" style="border:1px solid var(--line);border-radius:999px;padding:6px 10px;background:var(--surface)">'+DONG.map(function(d){return '<option'+(d===S.dong?" selected":"")+'>'+esc(d)+'</option>'}).join("")+'</select></label>')+'</div>';
  if(S.err)h+='<div class="banner bad" style="margin-top:12px"><div><b>Chưa tải được dữ liệu</b>'+esc(S.err.message||"")+'<div class="act"><button class="btn" type="button" data-act="retry">Thử lại</button></div></div></div>';
  if(!S.loaded)h+='<div class="list" style="margin-top:12px">'+'<div class="skel"></div>'.repeat(4)+'</div>';
  else{var v=VIEWS.filter(function(x){return x[0]===S.view})[0];h+=v[2]()}
  m.innerHTML=h}
document.addEventListener("click",function(e){var t=e.target;
  var b=t.closest("[data-view]");if(b){S.view=b.dataset.view;render();window.scrollTo(0,0);return}
  b=t.closest("[data-ky]");if(b){S.ky=b.dataset.ky;render();return}
  b=t.closest("[data-kh]");if(b){khachSheet(b.dataset.kh);return}
  if(t.closest("[data-close]")){closeSheet();return}
  b=t.closest("[data-act]");if(b){if(b.dataset.act==="staff"){staffErr=null;staff=null;render()}else load();return}
  b=t.closest("[data-duyet],[data-bo]");if(b){var ok=!!b.dataset.duyet,row=+(b.dataset.duyet||b.dataset.bo);b.disabled=true;
    api("set",{tab:"InsightAI",row:row,keyCol:"MaThe",keyVal:b.dataset.ma,obj:{TrangThai:ok?"Đã duyệt":"Bỏ qua",NguoiDuyet:me.ten,LucDuyet:new Date().toISOString().slice(0,16).replace("T"," ")}})
      .then(function(){toast(ok?"Đã duyệt":"Đã bỏ qua");return load()},function(x){b.disabled=false;toast(x.message||"Chưa lưu được",5000)});return}
});
document.addEventListener("change",function(e){if(e.target.id==="selDong"){S.dong=e.target.value;render()}});
document.addEventListener("input",function(e){if(e.target.id==="qKh"){S.q=e.target.value;var pos=e.target.selectionStart;render();var el=$("#qKh");if(el){el.focus();try{el.setSelectionRange(pos,pos)}catch(x){}}}});
document.addEventListener("submit",function(e){if(e.target.id!=="fLogin")return;e.preventDefault();var er=$("#lgE");er.textContent="Đang kiểm tra…";
  api("login",{nv:$("#lgN").value,pin:$("#lgP").value}).then(function(r){saveAuth(r.token,r.me);load()},function(x){er.textContent=x.message||"Sai mã PIN"})});
$("#reload").addEventListener("click",function(){if(token)load()});
$("#logout").addEventListener("click",function(){var t=token;saveAuth("",null);S.data={};S.loaded=false;staff=null;if(t)api("logout",{token:t}).catch(function(){});render()});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeSheet()});
if(token&&me)load();else render();
})();
