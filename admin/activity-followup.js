(() => {
  const DATA = [
    {type:'Lead', url:'../data/leads.json', page:'leads.html', keys:['leads','items','data']},
    {type:'Job', url:'../data/jobs.json', page:'jobs.html', keys:['jobs','items','data']}
  ];
  const getArray=(obj,keys)=>{if(Array.isArray(obj))return obj;for(const k of keys)if(Array.isArray(obj?.[k]))return obj[k];for(const v of Object.values(obj||{}))if(Array.isArray(v))return v;return[]};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const pick=(o,keys)=>keys.map(k=>o?.[k]).find(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
  const dateValue=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?null:d};
  const today=new Date();today.setHours(0,0,0,0);
  const host=document.querySelector('[data-v72-dashboard]')||document.querySelector('main')||document.body;
  const grid=document.createElement('div');grid.className='v72-grid';
  grid.innerHTML=`<section class="v72-panel"><h2>Needs Attention</h2><div class="v72-sub">Follow-ups and jobs that may need action.</div><div class="v72-list" data-v72-attention><div class="v72-empty">Loading…</div></div></section><section class="v72-panel"><h2>Recent Activity</h2><div class="v72-sub">Recent leads and jobs available in the system.</div><div class="v72-list" data-v72-recent><div class="v72-empty">Loading…</div></div></section>`;
  host.appendChild(grid);
  const attention=grid.querySelector('[data-v72-attention]'),recent=grid.querySelector('[data-v72-recent]');
  Promise.all(DATA.map(async ds=>{try{const r=await fetch(`${ds.url}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)return[];return getArray(await r.json(),ds.keys).map((item,i)=>({type:ds.type,page:ds.page,item,i}));}catch{return[]}})).then(parts=>{
    const records=parts.flat(),attentionItems=[],recentItems=[];
    records.forEach(r=>{
      const o=r.item,name=pick(o,['name','customer','client','company','title'])||`${r.type} #${r.i+1}`,status=pick(o,['status','stage','state'])||'Active';
      const follow=pick(o,['follow_up_date','followup_date','followUpDate','next_follow_up','nextFollowUp']),due=pick(o,['needed_by','due_date','dueDate','deadline','delivery_date','deliveryDate']),created=pick(o,['created_at','createdAt','date','submitted_at','submittedAt']);
      const f=dateValue(follow),d=dateValue(due),c=dateValue(created);
      if(f){f.setHours(0,0,0,0);if(f<=today)attentionItems.push({r,name,label:`Follow-up ${f<today?'overdue':'due today'}`})}
      if(d){d.setHours(0,0,0,0);const days=Math.ceil((d-today)/86400000);if(days>=0&&days<=3)attentionItems.push({r,name,label:`Due ${days===0?'today':`in ${days} day${days===1?'':'s'}`}`})}
      recentItems.push({r,name,status,sort:c?c.getTime():0});
    });
    const itemHtml=x=>`<div class="v72-item"><span class="v72-dot"></span><div><strong>${esc(x.name)}</strong><small>${esc(x.label||x.status)}</small></div><a href="${x.r.page}">Open →</a></div>`;
    attentionItems.sort((a,b)=>a.name.localeCompare(b.name));recentItems.sort((a,b)=>b.sort-a.sort);
    attention.innerHTML=attentionItems.length?attentionItems.slice(0,8).map(itemHtml).join(''):'<div class="v72-empty">Nothing urgent right now.</div>';
    recent.innerHTML=recentItems.length?recentItems.slice(0,8).map(itemHtml).join(''):'<div class="v72-empty">No recent records found.</div>';
  });
})();
