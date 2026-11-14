const sb = supabase.createClient(window.SB_URL, window.SB_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function loadAll(){
  const [t,m,s] = await Promise.all([
    sb.from("teams").select("*"),
    sb.from("matches").select("*").order("week").order("match_date"),
    sb.from("scorers").select("*").order("goals",{ascending:false})]);
  return {teams:t.data||[], matches:m.data||[], scorers:s.data||[]};
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
  return `<table><tr><th>م</th><th>الفريق</th><th>لعب</th><th>فاز</th><th>تعادل</th><th>خسر</th><th>له</th><th>عليه</th><th>الفارق</th><th>النقاط</th></tr>` +
  st.map((o,i)=>`<tr><td>${i+1}</td><td class="n">${esc(o.name)}</td><td>${o.p}</td><td>${o.w}</td><td>${o.d}</td><td>${o.l}</td><td>${o.gf}</td><td>${o.ga}</td><td>${o.gd>0?"+":""}${o.gd}</td><td class="pts">${o.pts}</td></tr>`).join("")+`</table>`;
}
function matchHTML(x, names){
  const h=esc(names[x.home_id]), a=esc(names[x.away_id]);
  let mid = x.status==="finished" ? `${x.home_goals} - ${x.away_goals}` : x.status==="postponed" ? `<b class="post">مؤجلة</b>` : `<span class="when">${esc(x.match_time||"")}</span>`;
  return `<div class="m"><span>${h}</span><span class="mid">${mid}</span><span>${a}</span><small>${esc(x.match_date||"")}</small></div>`;
}
function fixturesHTML(matches, names){
  const weeks = {}; matches.forEach(x => (weeks[x.week||0] ||= []).push(x));
  return Object.keys(weeks).sort((a,b)=>a-b).map(w=>`<h3>الأسبوع ${w}</h3>`+weeks[w].map(x=>matchHTML(x,names)).join("")).join("") || "<p>لا توجد مباريات بعد.</p>";
}
function shareWA(text){ window.open("https://wa.me/?text="+encodeURIComponent(text)); }
const CSS = `
*{box-sizing:border-box}body{margin:0;font-family:Tahoma,Arial,sans-serif;background:#f1f8f1;color:#12351a}
header{background:linear-gradient(#0d6b2a,#2e9e4b);color:#fff;text-align:center;padding:18px 10px}
header h1{margin:0;font-size:22px}header p{margin:4px 0 0;opacity:.9;font-size:14px}
nav{display:flex;position:sticky;top:0;background:#fff;box-shadow:0 1px 4px #0002}
nav button{flex:1;padding:12px 4px;border:0;background:none;font-size:15px;font-family:inherit}
nav button.on{color:#0d6b2a;border-bottom:3px solid #0d6b2a;font-weight:bold}
main{max-width:900px;margin:auto;padding:10px}section{display:none}section.on{display:block}
.wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;background:#fff;text-align:center;font-size:14px}
th{background:#0d6b2a;color:#fff;padding:8px 4px}td{padding:8px 4px;border-bottom:1px solid #dfe9df}
td.n{text-align:right;font-weight:bold}td.pts{background:#0d6b2a;color:#fff;font-weight:bold}
.m{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;background:#fff;margin:6px 0;padding:10px;border-radius:8px;text-align:center}
.m span:first-child{text-align:right}.m span:last-child{text-align:left}.mid{font-weight:bold;min-width:70px}
.m small{grid-column:1/-1;color:#668}.post{color:#c0392b}h3{color:#0d6b2a;margin:14px 0 4px}
button.wa{background:#25d366;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-family:inherit;font-size:15px;margin:8px 0}
input,select{padding:9px;margin:3px;border:1px solid #9bb;border-radius:6px;font-family:inherit;font-size:15px}
button.b{background:#0d6b2a;color:#fff;border:0;border-radius:6px;padding:9px 14px;font-family:inherit;font-size:15px}
button.d{background:#c0392b}.card{background:#fff;padding:10px;border-radius:8px;margin:8px 0}
@media(min-width:700px){table{font-size:16px}}`;
document.head.insertAdjacentHTML("beforeend","<style>"+CSS+"</style><meta name='viewport' content='width=device-width,initial-scale=1'>");
function tabs(){
  document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("nav button,section").forEach(e=>e.classList.remove("on"));
    b.classList.add("on"); $("#"+b.dataset.t).classList.add("on");});
}
