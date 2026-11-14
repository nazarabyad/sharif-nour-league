const sb = supabase.createClient(window.SB_URL, window.SB_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function loadAll(){
  const q = (t,o)=> { let r = sb.from(t).select("*"); if(o) r = r.order(o); return r; };
  const [t,m,p,c,g] = await Promise.all([q("teams","id"), q("matches","week"), q("players","id"), q("cards","id"), q("goals","id")]);
  return {teams:t.data||[], matches:m.data||[], players:p.data||[], cards:c.data||[], goals:g.data||[]};
}
function standings(teams, matches){
  const r = {};
  teams.forEach(t => r[t.id] = {name:t.name, p:t.base_p, w:t.base_w, d:t.base_d, l:t.base_l, gf:t.base_gf, ga:t.base_ga});
  matches.filter(x => x.status==="finished" && x.home_goals!=null && x.away_goals!=null).forEach(x => {
    const h=r[x.home_id], a=r[x.away_id]; if(!h||!a) return;
    h.p++; a.p++; h.gf+=x.home_goals; h.ga+=x.away_goals; a.gf+=x.away_goals; a.ga+=x.home_goals;
    if(x.home_goals>x.away_goals){h.w++;a.l++} else if(x.home_goals<x.away_goals){a.w++;h.l++} else {h.d++;a.d++}
  });
  return Object.values(r).map(o => ({...o, gd:o.gf-o.ga, pts:o.w*3+o.d}))
    .sort((a,b)=> b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);
}
function tableHTML(st){
  return `<div class="wrap"><table><tr><th>#</th><th class="n">الفريق</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>له</th><th>عليه</th><th>فرق</th><th>نقاط</th></tr>` +
  st.map((o,i)=>`<tr class="${i===0?"first":""}"><td>${i+1}</td><td class="n">${esc(o.name)}</td><td>${o.p}</td><td>${o.w}</td><td>${o.d}</td><td>${o.l}</td><td>${o.gf}</td><td>${o.ga}</td><td>${o.gd}</td><td class="pts">${o.pts}</td></tr>`).join("")+`</table></div>`;
}
function matchHTML(x, names){
  const h=esc(names[x.home_id]), a=esc(names[x.away_id]);
  const mid = x.status==="finished" ? `${x.home_goals} - ${x.away_goals}` : x.status==="postponed" ? `<b class="post">مؤجلة</b>` : `<span class="when">${esc(x.match_time||"--:--")}</span>`;
  return `<div class="m"><span>${h}</span><span class="mid">${mid}</span><span>${a}</span><small>${esc(x.match_date||"")}</small></div>`;
}
function fixturesHTML(matches, names){
  const w = {}; matches.forEach(x => (w[x.week||0] ||= []).push(x));
  return Object.keys(w).sort((a,b)=>a-b).map(k=>`<h3>الأسبوع ${k}</h3>`+w[k].map(x=>matchHTML(x,names)).join("")).join("") || "<p class='empty'>لا توجد مباريات بعد.</p>";
}
function scorersList(D){
  const pm = {}; D.players.forEach(p=>pm[p.id]=p);
  const tot = {}; D.goals.forEach(g=>tot[g.player_id]=(tot[g.player_id]||0)+(g.goals||0));
  return Object.entries(tot).map(([id,n])=>({p:pm[id],n})).filter(o=>o.p).sort((a,b)=>b.n-a.n);
}
function suspList(D){
  const pm = {}; D.players.forEach(p=>pm[p.id]=p);
  const s = {};
  D.cards.forEach(c=>{ const o = s[c.player_id] ||= {y:0,r:0,rs:0};
    if(c.type==="yellow") o.y++; else {o.r++; o.rs += (c.susp||1);} });
  const L = window.YELLOW_LIMIT||3;
  return Object.entries(s).map(([id,o])=>({p:pm[id],...o,total:Math.floor(o.y/L)+o.rs,edge:(o.y%L)===L-1}))
    .filter(o=>o.p).sort((a,b)=>b.total-a.total||b.y-a.y);
}
function shareWA(text){ window.open("https://wa.me/?text="+encodeURIComponent(text)); }
const CSS = `
*{box-sizing:border-box}body{margin:0;font-family:Tahoma,Arial,sans-serif;background:#f3f5fb;color:#12224a}
header{background:#12224a;padding:14px 14px 0}
.top{display:flex;align-items:center;gap:12px}.top img{width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid #f2b705}
.top h1{margin:0;color:#f2b705;font-size:26px}
nav{display:flex;margin-top:12px;gap:4px}
nav button{flex:1;padding:12px 4px;border:0;background:none;color:#cfd6f0;font-size:16px;font-family:inherit;border-radius:14px 14px 0 0}
nav button.on{background:#f3f5fb;color:#12224a;font-weight:bold}
main{max-width:900px;margin:auto;padding:12px}section{display:none}section.on{display:block}
.card{background:#fff;border:1px solid #dde1ee;border-radius:16px;padding:14px;margin:12px 0}
.card h2{margin:0 0 10px;font-size:20px}.wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;text-align:center;font-size:15px}
th{padding:10px 4px;color:#12224a;border-bottom:2px solid #dde1ee}
td{padding:10px 4px;border-bottom:1px solid #e6e9f3}td.n,th.n{text-align:right}td.n{font-weight:bold}
tr.first td{background:#fff6d6}td.pts{font-weight:bold}
.m{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;background:#f8f9fd;margin:6px 0;padding:10px;border-radius:10px;text-align:center}
.m span:first-child{text-align:right}.m span:last-child{text-align:left}.mid{font-weight:bold;min-width:70px}
.m small{grid-column:1/-1;color:#667}.post{color:#c0392b}h3{margin:16px 0 4px;color:#12224a}
.empty{color:#667}.y{display:inline-block;width:14px;height:18px;background:#f2b705;border-radius:2px}.r{display:inline-block;width:14px;height:18px;background:#c4182b;border-radius:2px}
.warn{color:#c0392b;font-weight:bold}.ok{color:#1a7f37}
button.wa{background:#25d366;color:#fff;border:0;border-radius:10px;padding:11px 16px;font-family:inherit;font-size:16px;margin:6px 0}
input,select{padding:11px;margin:4px 0;border:1px solid #cfd5e6;border-radius:10px;font-family:inherit;font-size:16px;background:#fff;max-width:100%}
select{background:#efeff4}.row{display:flex;flex-wrap:wrap;gap:6px}.row>*{flex:1;min-width:100px}
button.b{background:#12224a;color:#fff;border:0;border-radius:10px;padding:11px 18px;font-family:inherit;font-size:16px;margin:4px 0}
button.d{background:#c4182b}button.s{padding:7px 10px;font-size:14px}
details summary{cursor:pointer;font-weight:bold;padding:6px 0}.li{display:flex;justify-content:space-between;gap:8px;align-items:center;border-bottom:1px solid #e6e9f3;padding:8px 0}
small.h{color:#667;display:block;margin-bottom:6px;line-height:1.7}
.tg{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}.tg input{padding:8px 2px;text-align:center;width:100%}
@media(min-width:700px){table{font-size:17px}}`;
document.head.insertAdjacentHTML("beforeend","<style>"+CSS+"</style><meta name='viewport' content='width=device-width,initial-scale=1'>");
function tabs(){
  document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("nav button,section").forEach(e=>e.classList.remove("on"));
    b.classList.add("on"); $("#"+b.dataset.t).classList.add("on");});
}
