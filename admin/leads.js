(() => {
  const labels = {all:"All active",new:"New",contacted:"Contacted",waiting:"Waiting",quoted:"Quote sent",won:"Won",lost:"Lost"};
  let leads=[];
  const esc=(v)=>String(v??"").replace(/[&<>'"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const date=(v)=>v?new Date(`${v}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Not set";
  const money=(v)=>v===undefined||v===null||v===""?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(v));
  const phoneHref=(v)=>`tel:${String(v||"").replace(/[^\d+]/g,"")}`;
  const emailHref=(v)=>`mailto:${encodeURIComponent(String(v||""))}`;
  const createJobNumber=()=>`IT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

  function jobDraft(lead){
    return {
      job_number:createJobNumber(), client:lead.name||"", company:lead.company||"", product:lead.product||lead.service||"",
      quantity:lead.quantity||"", technique:lead.service||"", status:"approved", priority:"normal",
      due_date:lead.needed_by||"", contact:lead.phone||lead.email||"", notes:lead.notes||"",
      total:lead.estimated_value||"", balance_due:lead.estimated_value||"", created_date:new Date().toISOString().slice(0,10),
      source_lead_number:lead.lead_number||""
    };
  }
  function convertLead(index){
    const lead=leads[index]; if(!lead) return;
    localStorage.setItem("imaginable_pending_job",JSON.stringify(jobDraft(lead)));
    window.location.href="jobs.html?draft=1";
  }
  function render(filter="all"){
    document.querySelectorAll(".filter").forEach((b)=>b.classList.toggle("active",b.dataset.filter===filter));
    const active=leads.filter((lead)=>lead.visible!==false&&!lead.converted_to_job&&!['lost'].includes(lead.status));
    const list=filter==="all"?active:active.filter((lead)=>lead.status===filter);
    const root=document.getElementById("leads");
    if(!list.length){root.innerHTML='<div class="empty">No leads in this stage.</div>';return;}
    root.innerHTML=list.sort((a,b)=>String(a.next_follow_up||a.requested_date||"9999").localeCompare(String(b.next_follow_up||b.requested_date||"9999"))).map((lead)=>{
      const index=leads.indexOf(lead);
      const contactButton=lead.phone?`<a class="button secondary" href="${phoneHref(lead.phone)}">Call customer</a>`:lead.email?`<a class="button secondary" href="${emailHref(lead.email)}">Email customer</a>`:"";
      return `<article class="card"><div class="card-head"><div><span class="leadno">${esc(lead.lead_number||"Lead")}</span><h3>${esc(lead.name||"Unnamed lead")}</h3><span class="company">${esc(lead.company||lead.product||lead.service||"")}</span></div><span class="badge">${esc(labels[lead.status]||lead.status||"New")}</span></div><div class="meta"><div><span>Service</span><strong>${esc(lead.service||"—")}</strong></div><div><span>Product</span><strong>${esc(lead.product||"—")}</strong></div><div><span>Quantity</span><strong>${esc(lead.quantity||"—")}</strong></div><div><span>Source</span><strong>${esc(lead.source||"—")}</strong></div><div><span>Follow-up</span><strong>${date(lead.next_follow_up)}</strong></div><div><span>Estimated value</span><strong>${money(lead.estimated_value)}</strong></div></div>${lead.notes?`<p class="notes">${esc(lead.notes)}</p>`:""}<div class="actions">${contactButton}<button class="button" type="button" data-convert="${index}">Convert to Job</button><a class="button secondary" href="https://app.pagescms.org" rel="noopener">Manage lead</a></div></article>`;
    }).join("");
    root.querySelectorAll("[data-convert]").forEach((button)=>button.addEventListener("click",()=>convertLead(Number(button.dataset.convert))));
  }
  async function load(){
    try{const response=await fetch("../data/leads.json",{cache:"no-store"});if(!response.ok)throw new Error("Could not load leads");leads=(await response.json()).leads||[];const statuses=["all",...new Set(leads.filter((lead)=>lead.visible!==false&&!lead.converted_to_job&&!['lost'].includes(lead.status)).map((lead)=>lead.status).filter(Boolean))];document.getElementById("filters").innerHTML=statuses.map((status)=>`<button class="filter${status==="all"?" active":""}" data-filter="${esc(status)}">${esc(labels[status]||status)}</button>`).join("");document.getElementById("filters").addEventListener("click",(event)=>{const button=event.target.closest("button[data-filter]");if(button)render(button.dataset.filter);});render();}catch(error){document.getElementById("leads").innerHTML='<div class="empty">Could not load Lead Inbox data.</div>';console.error(error);}}
  load();
})();
