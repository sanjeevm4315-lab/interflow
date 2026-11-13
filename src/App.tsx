import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, ArrowDownUp, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays,
  Check, CheckCircle2, ChevronDown, CircleAlert, Clock3, Filter, LayoutDashboard,
  ListFilter, MoreHorizontal, Plus, Search, Sparkles, Target, Trash2, X, Pencil,
  Download, GraduationCap, Menu
} from 'lucide-react';

type Status = 'Applied' | 'Test' | 'Interview' | 'Offer' | 'Rejected';
type Application = {
  id: string; company: string; role: string; deadline: string; status: Status;
  location: string; type: string; notes: string; createdAt: string;
};

const STORAGE_KEY = 'internflow-applications-v1';
const statuses: Status[] = ['Applied', 'Test', 'Interview', 'Offer', 'Rejected'];
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const plusDays = (n: number) => {
  const d = new Date(); d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const seed: Application[] = [
  { id:'a1', company:'Google', role:'Software Engineering Intern', deadline:plusDays(2), status:'Interview', location:'Bengaluru, India', type:'Hybrid', notes:'Prepare DSA and project walkthrough.', createdAt:new Date().toISOString() },
  { id:'a2', company:'Microsoft', role:'Explore Intern', deadline:plusDays(5), status:'Test', location:'Remote', type:'Remote', notes:'Online assessment pending.', createdAt:new Date().toISOString() },
  { id:'a3', company:'Atlassian', role:'Frontend Engineering Intern', deadline:plusDays(9), status:'Applied', location:'Bengaluru, India', type:'Hybrid', notes:'Application submitted.', createdAt:new Date().toISOString() },
  { id:'a4', company:'Razorpay', role:'Product Engineering Intern', deadline:plusDays(-1), status:'Applied', location:'Bengaluru, India', type:'On-site', notes:'Follow up with recruiter.', createdAt:new Date().toISOString() },
  { id:'a5', company:'Adobe', role:'Computer Science Intern', deadline:plusDays(15), status:'Offer', location:'Noida, India', type:'Hybrid', notes:'Review offer details.', createdAt:new Date().toISOString() },
  { id:'a6', company:'Swiggy', role:'Backend Developer Intern', deadline:plusDays(21), status:'Rejected', location:'Bengaluru, India', type:'On-site', notes:'Keep going!', createdAt:new Date().toISOString() }
];

function loadApps(): Application[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* use starter data if storage is unavailable */ }
  return seed;
}
function dayDiff(date: string) {
  const [y,m,d] = date.split('-').map(Number);
  const target = new Date(y, m-1, d); target.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((target.getTime()-now.getTime())/86400000);
}
function isActive(a: Application) { return a.status !== 'Offer' && a.status !== 'Rejected'; }
function needsAction(a: Application) { return isActive(a) && dayDiff(a.deadline) <= 3; }
function dateLabel(date: string) {
  const diff = dayDiff(date);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 3) return `In ${diff} days`;
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
}
function initials(name: string) { return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function safeExport(apps: Application[]) {
  const header = ['Company','Role','Deadline','Status','Location','Work type','Notes'];
  const rows = apps.map(a=>[a.company,a.role,a.deadline,a.status,a.location,a.type,a.notes]);
  const csv = [header,...rows].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const link = document.createElement('a'); link.href=url; link.download='internflow-applications.csv'; link.click(); URL.revokeObjectURL(url);
}

const emptyForm = { company:'', role:'', deadline:plusDays(7), status:'Applied' as Status, location:'', type:'Remote', notes:'' };

export default function App() {
  const [apps,setApps] = useState<Application[]>(loadApps);
  const [filter,setFilter] = useState('All applications');
  const [search,setSearch] = useState('');
  const [modal,setModal] = useState(false);
  const [editing,setEditing] = useState<Application|null>(null);
  const [form,setForm] = useState(emptyForm);
  const [menu,setMenu] = useState<string|null>(null);
  const [toast,setToast] = useState('');
  const [mobileNav,setMobileNav] = useState(false);

  useEffect(()=>{ try { localStorage.setItem(STORAGE_KEY,JSON.stringify(apps)); } catch { setToast('Storage unavailable in this browser.'); } },[apps]);
  useEffect(()=>{ if(!toast) return; const t=window.setTimeout(()=>setToast(''),2600); return ()=>window.clearTimeout(t); },[toast]);

  const counts = useMemo(()=>({
    total:apps.length, active:apps.filter(isActive).length,
    applied:apps.filter(a=>a.status==='Applied').length,
    test:apps.filter(a=>a.status==='Test').length,
    interview:apps.filter(a=>a.status==='Interview').length,
    offer:apps.filter(a=>a.status==='Offer').length,
    rejected:apps.filter(a=>a.status==='Rejected').length,
    action:apps.filter(needsAction).length
  }),[apps]);

  const visible = useMemo(()=>{
    let result=[...apps];
    if(filter==='Needs action') result=result.filter(needsAction);
    else if(statuses.includes(filter as Status)) result=result.filter(a=>a.status===filter);
    if(search.trim()) {
      const q=search.toLowerCase();
      result=result.filter(a=>[a.company,a.role,a.location,a.status].some(v=>v.toLowerCase().includes(q)));
    }
    return result.sort((a,b)=>a.deadline.localeCompare(b.deadline));
  },[apps,filter,search]);

  const upcoming = useMemo(()=>apps.filter(a=>isActive(a)&&dayDiff(a.deadline)>=0).sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,4),[apps]);

  function openAdd() { setEditing(null); setForm({...emptyForm,deadline:plusDays(7)}); setModal(true); }
  function openEdit(a:Application) { setEditing(a); setForm({company:a.company,role:a.role,deadline:a.deadline,status:a.status,location:a.location,type:a.type,notes:a.notes}); setMenu(null); setModal(true); }
  function save(e:React.FormEvent) {
    e.preventDefault();
    if(!form.company.trim()||!form.role.trim()||!form.deadline) return;
    if(editing) {
      setApps(prev=>prev.map(a=>a.id===editing.id?{...a,...form,company:form.company.trim(),role:form.role.trim()}:a));
      setToast('Application updated successfully');
    } else {
      const item:Application={...form,id:crypto.randomUUID(),company:form.company.trim(),role:form.role.trim(),createdAt:new Date().toISOString()};
      setApps(prev=>[item,...prev]); setToast('Application added successfully');
    }
    setModal(false);
  }
  function remove(id:string) {
    setApps(prev=>prev.filter(a=>a.id!==id)); setMenu(null); setToast('Application deleted');
  }
  function updateStatus(id:string,status:Status) {
    setApps(prev=>prev.map(a=>a.id===id?{...a,status}:a)); setToast(`Status changed to ${status}`);
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'mobile-open':''}`}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={22}/></div><span>intern<span className="brand-accent">flow</span></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className={`nav-item ${filter==='All applications'?'active':''}`} onClick={()=>{setFilter('All applications');setMobileNav(false)}}><LayoutDashboard size={18}/> Overview</button>
      <button className={`nav-item ${filter==='Needs action'?'active':''}`} onClick={()=>{setFilter('Needs action');setMobileNav(false)}}><CircleAlert size={18}/> Needs action {counts.action>0&&<span className="nav-count">{counts.action}</span>}</button>
      <button className={`nav-item ${filter==='All applications'?'':' '}`} onClick={()=>{setFilter('All applications');setMobileNav(false)}}><BriefcaseBusiness size={18}/> Applications <span className="nav-count">{counts.total}</span></button>
      <div className="workspace-label status-label">BY STATUS</div>
      {statuses.map(s=><button key={s} className={`nav-item subnav ${filter===s?'active':''}`} onClick={()=>{setFilter(s);setMobileNav(false)}}><span className={`status-dot ${s.toLowerCase()}`}/>{s}<span className="nav-count">{apps.filter(a=>a.status===s).length}</span></button>)}
      <div className="sidebar-bottom">
        <div className="tip-card"><div className="tip-icon"><Sparkles size={16}/></div><strong>Stay on track</strong><p>Small steps today lead to big opportunities tomorrow.</p></div>
        <div className="profile"><div className="avatar">S</div><div><strong>Student workspace</strong><small>Personal tracker</small></div><MoreHorizontal size={18} className="muted"/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={()=>setMobileNav(!mobileNav)} aria-label="Toggle menu"><Menu size={20}/></button>
        <div className="breadcrumb">Workspace <span>/</span> <strong>{filter==='All applications'?'Overview':filter}</strong></div>
        <div className="top-actions"><span className="today-label"><CalendarDays size={15}/>{new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span><button className="icon-btn notification" title="Deadline alerts"><Bell size={18}/>{counts.action>0&&<i/>}</button><button className="add-btn" onClick={openAdd}><Plus size={17}/> Add application</button></div>
      </header>

      <div className="content">
        <section className="welcome-row">
          <div><div className="eyebrow"><span className="live-dot"/> YOUR CAREER, IN MOTION</div><h1>{filter==='All applications'?'Good things are in progress.':filter}</h1><p className="subtitle">Keep every opportunity organised. Your next step starts here.</p></div>
          <div className="welcome-actions"><button className="secondary-btn" onClick={()=>safeExport(apps)}><Download size={16}/> Export CSV</button><button className="primary-btn" onClick={openAdd}><Plus size={17}/> New application</button></div>
        </section>

        {counts.action>0&&<section className="alert-banner"><div className="alert-symbol"><CircleAlert size={19}/></div><div><strong>{counts.action} {counts.action===1?'application needs':'applications need'} your attention</strong><p>Deadlines are due within the next 3 days or already overdue. Take a look before they slip.</p></div><button onClick={()=>setFilter('Needs action')}>Review now <ArrowUpRight size={15}/></button></section>}

        <section className="stats-grid">
          <Stat icon={<BriefcaseBusiness size={18}/>} label="Total applications" value={counts.total} note={`${counts.active} active opportunities`} tone="blue"/>
          <Stat icon={<Activity size={18}/>} label="In progress" value={counts.active} note="Across all active stages" tone="purple"/>
          <Stat icon={<Target size={18}/>} label="Interviews" value={counts.interview} note="Your next big conversation" tone="orange"/>
          <Stat icon={<CheckCircle2 size={18}/>} label="Offers received" value={counts.offer} note="Wins worth celebrating" tone="green"/>
        </section>

        <section className="pipeline-card">
          <div className="section-heading"><div><h2>Application pipeline</h2><p>A snapshot of where every opportunity stands</p></div><span className="mini-total">{counts.total} TOTAL</span></div>
          <div className="pipeline">
            {statuses.map((s,i)=>{
              const count=apps.filter(a=>a.status===s).length;
              const pct=counts.total?count/counts.total*100:0;
              return <button className="pipeline-stage" key={s} onClick={()=>setFilter(s)}><div className="stage-top"><span className={`status-dot ${s.toLowerCase()}`}/><span>{s}</span><strong>{count}</strong></div><div className="progress-track"><div className={`progress-fill ${s.toLowerCase()}`} style={{width:`${pct}%`}}/></div></button>
            })}
          </div>
        </section>

        <div className="lower-grid">
          <section className="applications-panel">
            <div className="section-heading applications-heading"><div><h2>Applications</h2><p>Manage and track your opportunities</p></div><button className="text-btn" onClick={()=>{setFilter('All applications');setSearch('')}}>View all <ArrowUpRight size={14}/></button></div>
            <div className="toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or role..."/></div><button className={`filter-btn ${filter==='Needs action'?'filter-on':''}`} onClick={()=>setFilter(filter==='Needs action'?'All applications':'Needs action')}><Filter size={15}/> Needs action</button><button className="sort-btn" onClick={()=>setVisibleSortToast(setToast)}><ArrowDownUp size={15}/></button></div>
            <div className="table-wrap">
              <table><thead><tr><th>COMPANY & ROLE</th><th>STATUS</th><th>DEADLINE</th><th></th></tr></thead>
              <tbody>
                {visible.map(a=><tr key={a.id}>
                  <td><div className="company-cell"><div className={`company-logo logo-${a.company.length%5}`}>{initials(a.company)}</div><div className="company-info"><strong>{a.company}</strong><span>{a.role}</span></div></div></td>
                  <td><select className={`status-select ${a.status.toLowerCase()}`} value={a.status} onChange={e=>updateStatus(a.id,e.target.value as Status)} aria-label={`Status for ${a.company}`}>{statuses.map(s=><option key={s}>{s}</option>)}</select></td>
                  <td><div className={`deadline-cell ${needsAction(a)?'urgent':''}`}><span>{dateLabel(a.deadline)}</span>{needsAction(a)&&<span className="warning-pill"><CircleAlert size={11}/> Needs action</span>}</div></td>
                  <td className="row-menu-cell"><button className="icon-btn row-more" onClick={()=>setMenu(menu===a.id?null:a.id)} aria-label="Application actions"><MoreHorizontal size={18}/></button>{menu===a.id&&<div className="row-menu"><button onClick={()=>openEdit(a)}><Pencil size={14}/> Edit</button><button className="danger" onClick={()=>remove(a.id)}><Trash2 size={14}/> Delete</button></div>}</td>
                </tr>)}
                {visible.length===0&&<tr><td colSpan={4}><div className="empty-state"><div className="empty-icon"><Search size={22}/></div><strong>No applications found</strong><span>Try another search or add a new opportunity.</span><button className="text-btn" onClick={openAdd}>Add an application <Plus size={14}/></button></div></td></tr>}
              </tbody></table>
            </div>
            <div className="table-footer"><span>Showing <strong>{visible.length}</strong> of <strong>{apps.length}</strong> applications</span><span className="local-save"><Check size={13}/> Saved on this device</span></div>
          </section>

          <aside className="upcoming-panel">
            <div className="section-heading"><div><h2>Coming up</h2><p>Your next deadlines</p></div><div className="calendar-icon"><CalendarDays size={17}/></div></div>
            {upcoming.length? <div className="upcoming-list">{upcoming.map(a=><div className="upcoming-item" key={a.id}><div className="date-tile"><strong>{new Date(`${a.deadline}T00:00:00`).getDate()}</strong><span>{new Date(`${a.deadline}T00:00:00`).toLocaleDateString('en-IN',{month:'short'}).toUpperCase()}</span></div><div className="upcoming-info"><strong>{a.company}</strong><span>{a.role}</span><small className={needsAction(a)?'urgent-text':''}><Clock3 size={11}/>{dateLabel(a.deadline)}</small></div></div>)}</div>:<div className="upcoming-empty">No upcoming deadlines. You're all caught up.</div>}
            <div className="focus-card"><div className="focus-icon"><Sparkles size={16}/></div><div><strong>Focus tip</strong><p>Prioritise the closest deadline first. A timely follow-up can make all the difference.</p></div></div>
          </aside>
        </div>
        <footer className="footer"><span>© 2026 InternFlow</span><span>Built for students, powered by ambition <span className="heart">✦</span></span></footer>
      </div>
    </main>

    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="modal" onSubmit={save}>
      <div className="modal-head"><div><div className="eyebrow">OPPORTUNITY DETAILS</div><h2>{editing?'Edit application':'Add new application'}</h2><p>Keep the important details in one place.</p></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X size={19}/></button></div>
      <div className="form-grid">
        <label className="full">Company name <b>*</b><input autoFocus required value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="e.g. Google"/></label>
        <label className="full">Role / position <b>*</b><input required value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="e.g. Software Engineering Intern"/></label>
        <label>Deadline <b>*</b><input type="date" required value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></label>
        <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Status})}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="e.g. Bengaluru / Remote"/></label>
        <label>Work type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label>
        <label className="full">Notes<textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Assessment details, contact notes, next steps..."/></label>
      </div>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="primary-btn"><Check size={16}/>{editing?'Save changes':'Add application'}</button></div>
    </form></div>}
    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}

function setVisibleSortToast(setToast:(s:string)=>void) { setToast('Applications are sorted by nearest deadline first.'); }
function Stat({icon,label,value,note,tone}:{icon:React.ReactNode,label:string,value:number,note:string,tone:string}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div><div className="stat-spark"><span/><span/><span/><span/><span/><span/><span/></div></div>;
}
