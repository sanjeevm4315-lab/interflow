import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, ArrowDownUp, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays,
  CalendarPlus, Check, CheckCircle2, CircleAlert, Clock3, Download, GraduationCap,
  Filter, History, LayoutDashboard, ListChecks, Menu, MoreHorizontal, Pencil, Plus,
  RotateCcw, Search, Sparkles, Target, Trash2, X
} from 'lucide-react';

type Status = 'Applied' | 'Test' | 'Interview' | 'Offer' | 'Rejected';
type ChecklistItem = { id: string; label: string; done: boolean };
type ActivityItem = { id: string; message: string; createdAt: string };
type Application = {
  id: string; company: string; role: string; deadline: string; status: Status;
  location: string; type: string; nextAction: string; createdAt: string;
  checklist: ChecklistItem[]; activity: ActivityItem[];
};

const STORAGE_KEY = 'internflow-applications-v1';
const statuses: Status[] = ['Applied', 'Test', 'Interview', 'Offer', 'Rejected'];
const checklistTemplates: Record<Status, string[]> = {
  Applied: ['Tailor resume for this role', 'Research the team', 'Set a follow-up reminder'],
  Test: ['Review assessment instructions', 'Complete the assessment', 'Run a final quality check'],
  Interview: ['Research the interviewers', 'Prepare project stories', 'Write questions to ask'],
  Offer: ['Compare role and benefits', 'Note the decision date', 'Prepare follow-up questions'],
  Rejected: ['Save any feedback', 'Record one learning', 'Move on to the next opportunity']
};
function checklistFor(status: Status, existing: ChecklistItem[] = []): ChecklistItem[] {
  const checklist = [...existing];
  checklistTemplates[status].forEach((label, index) => {
    if(!checklist.some(item=>item.label===label)) {
      checklist.push({id:`${status.toLowerCase()}-${index}`,label,done:false});
    }
  });
  return checklist;
}
function createActivity(message: string): ActivityItem {
  return { id: crypto.randomUUID(), message, createdAt: new Date().toISOString() };
}
function addActivity(items: ActivityItem[], message: string): ActivityItem[] {
  return [createActivity(message), ...items].slice(0, 40);
}
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const plusDays = (n: number) => {
  const d = new Date(); d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const seedBase: Array<Omit<Application, 'checklist' | 'activity'>> = [
  { id:'a1', company:'Northstar Labs', role:'Software Engineering Intern', deadline:plusDays(2), status:'Interview', location:'Bengaluru, India', type:'Hybrid', nextAction:'Prepare two project stories for the interview.', createdAt:new Date().toISOString() },
  { id:'a2', company:'Pinecone Systems', role:'Product Engineering Intern', deadline:plusDays(5), status:'Test', location:'Remote', type:'Remote', nextAction:'Finish the take-home assessment.', createdAt:new Date().toISOString() },
  { id:'a3', company:'Brightside Studio', role:'Frontend Engineering Intern', deadline:plusDays(9), status:'Applied', location:'Bengaluru, India', type:'Hybrid', nextAction:'Follow up with the campus recruiter.', createdAt:new Date().toISOString() },
  { id:'a4', company:'Orbit Analytics', role:'Data Engineering Intern', deadline:plusDays(-1), status:'Applied', location:'Bengaluru, India', type:'On-site', nextAction:'Send a brief status follow-up.', createdAt:new Date().toISOString() },
  { id:'a5', company:'Lumen Works', role:'Computer Science Intern', deadline:plusDays(15), status:'Offer', location:'Noida, India', type:'Hybrid', nextAction:'Compare the offer details and respond.', createdAt:new Date().toISOString() },
  { id:'a6', company:'Juniper Cloud', role:'Backend Developer Intern', deadline:plusDays(21), status:'Rejected', location:'Bengaluru, India', type:'On-site', nextAction:'Save role notes for future applications.', createdAt:new Date().toISOString() }
];
const seed: Application[] = seedBase.map(application => ({
  ...application,
  checklist: checklistFor(application.status),
  activity: [{ id:`sample-${application.id}`, message:'Sample application added', createdAt:application.createdAt }]
}));

function loadApps(): Application[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Array<Partial<Application> & { notes?: string }>;
      return saved.map(application => {
        const status = statuses.includes(application.status as Status) ? application.status as Status : 'Applied';
        const { notes, ...stored } = application;
        return {
          ...stored,
          status,
          nextAction:application.nextAction || notes || '',
          checklist:Array.isArray(application.checklist) ? application.checklist : checklistFor(status),
          activity:Array.isArray(application.activity) ? application.activity : [createActivity('Application imported')]
        } as Application;
      });
    }
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
function escapeCalendarText(value: string) {
  return value.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
}
function foldCalendarLine(value: string) {
  const encoder = new TextEncoder();
  const folded: string[] = [];
  let line = '';
  let byteLength = 0;
  for(const character of value) {
    const characterBytes = encoder.encode(character).length;
    if(byteLength+characterBytes>75) {
      folded.push(line);
      line = ` ${character}`;
      byteLength = 1+characterBytes;
    } else {
      line += character;
      byteLength += characterBytes;
    }
  }
  folded.push(line);
  return folded;
}
function nextCalendarDate(date: string) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate()+1);
  return `${next.getFullYear()}${String(next.getMonth()+1).padStart(2,'0')}${String(next.getDate()).padStart(2,'0')}`;
}
function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content],{type}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function safeExport(apps: Application[]) {
  const header = ['Company','Role','Deadline','Status','Location','Work type','Next action'];
  const rows = apps.map(a=>[a.company,a.role,a.deadline,a.status,a.location,a.type,a.nextAction]);
  const csv = [header,...rows].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadFile('internflow-applications.csv',csv,'text/csv;charset=utf-8;');
}
function safeExportCalendar(apps: Application[]) {
  const active = apps.filter(isActive);
  const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const events = active.map(application => [
    'BEGIN:VEVENT',
    `UID:${application.id}@internflow.example`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${application.deadline.replace(/-/g,'')}`,
    `DTEND;VALUE=DATE:${nextCalendarDate(application.deadline)}`,
    `SUMMARY:${escapeCalendarText(`${application.company} - ${application.role} deadline`)}`,
    `DESCRIPTION:${escapeCalendarText(`${application.status}. Next action: ${application.nextAction || 'No next action set'}`)}`,
    'END:VEVENT'
  ]);
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//InternFlow//Applications//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',...events.flat(),'END:VCALENDAR'];
  const calendar = `${lines.flatMap(foldCalendarLine).join('\r\n')}\r\n`;
  downloadFile('internflow-deadlines.ics',calendar,'text/calendar;charset=utf-8;');
  return active.length;
}

const emptyForm = { company:'', role:'', deadline:plusDays(3), status:'Applied' as Status, location:'', type:'Remote', nextAction:'' };
const deadlinePresets = [{days:1,label:'Tomorrow'},{days:3,label:'In 3 days'},{days:7,label:'In a week'}];

export default function App() {
  const [apps,setApps] = useState<Application[]>(loadApps);
  const [introVisible,setIntroVisible] = useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [filter,setFilter] = useState('All applications');
  const [search,setSearch] = useState('');
  const [sortOrder,setSortOrder] = useState<'asc'|'desc'>('asc');
  const [modal,setModal] = useState(false);
  const [editing,setEditing] = useState<Application|null>(null);
  const [form,setForm] = useState(emptyForm);
  const [menu,setMenu] = useState<string|null>(null);
  const [detailsId,setDetailsId] = useState<string|null>(null);
  const [taskDraft,setTaskDraft] = useState('');
  const [resetConfirm,setResetConfirm] = useState(false);
  const [toast,setToast] = useState('');
  const [mobileNav,setMobileNav] = useState(false);

  useEffect(()=>{ try { localStorage.setItem(STORAGE_KEY,JSON.stringify(apps)); } catch { setToast('Storage unavailable in this browser.'); } },[apps]);
  useEffect(()=>{
    if(!introVisible) return;
    const timer=window.setTimeout(()=>setIntroVisible(false),1450);
    return ()=>window.clearTimeout(timer);
  },[introVisible]);
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
      result=result.filter(a=>[a.company,a.role,a.location,a.status,a.nextAction].some(v=>v.toLowerCase().includes(q)));
    }
    return result.sort((a,b)=>a.deadline.localeCompare(b.deadline)*(sortOrder==='asc'?1:-1));
  },[apps,filter,search,sortOrder]);

  const upcoming = useMemo(()=>apps.filter(a=>isActive(a)&&dayDiff(a.deadline)>=0).sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,4),[apps]);
  const selectedDetails = detailsId ? apps.find(application=>application.id===detailsId) : undefined;
  const completedDetailTasks = selectedDetails?.checklist.filter(item=>item.done).length ?? 0;
  const detailProgress = selectedDetails?.checklist.length ? completedDetailTasks/selectedDetails.checklist.length*100 : 0;

  function openAdd() { setEditing(null); setForm({...emptyForm,deadline:plusDays(3)}); setModal(true); }
  function openEdit(a:Application) { setEditing(a); setForm({company:a.company,role:a.role,deadline:a.deadline,status:a.status,location:a.location,type:a.type,nextAction:a.nextAction}); setMenu(null); setModal(true); }
  function save(e:React.FormEvent) {
    e.preventDefault();
    if(!form.company.trim()||!form.role.trim()||!form.deadline) return;
    if(editing) {
      setApps(prev=>prev.map(application=>{
        if(application.id!==editing.id) return application;
        const messages:string[]=[];
        if(application.status!==form.status) messages.push(`Status changed from ${application.status} to ${form.status}`);
        if(application.nextAction!==form.nextAction) messages.push('Next-action memo updated');
        if(application.company!==form.company.trim()||application.role!==form.role.trim()||application.deadline!==form.deadline) messages.push('Application details updated');
        return {
          ...application,
          ...form,
          company:form.company.trim(),
          role:form.role.trim(),
          checklist:application.status===form.status?application.checklist:checklistFor(form.status,application.checklist),
          activity:messages.reduce((items,message)=>addActivity(items,message),application.activity)
        };
      }));
      setToast('Application updated successfully');
    } else {
      const item:Application={...form,id:crypto.randomUUID(),company:form.company.trim(),role:form.role.trim(),createdAt:new Date().toISOString(),checklist:checklistFor(form.status),activity:[createActivity('Application created')]};
      setApps(prev=>[item,...prev]); setToast('Application added successfully');
    }
    setModal(false);
  }
  function remove(id:string) {
    setApps(prev=>prev.filter(a=>a.id!==id));
    if(detailsId===id) setDetailsId(null);
    setMenu(null); setToast('Application deleted');
  }
  function updateStatus(id:string,status:Status) {
    setApps(prev=>prev.map(application=>{
      if(application.id!==id||application.status===status) return application;
      return {
        ...application,
        status,
        checklist:checklistFor(status,application.checklist),
        activity:addActivity(application.activity,`Status changed from ${application.status} to ${status}`)
      };
    }));
    setToast(`Status changed to ${status}`);
  }
  function toggleChecklistItem(applicationId:string,itemId:string) {
    const application = apps.find(item=>item.id===applicationId);
    const target = application?.checklist.find(item=>item.id===itemId);
    if(!target) return;
    const completed = !target.done;
    setApps(prev=>prev.map(application=>{
      if(application.id!==applicationId) return application;
      return {
        ...application,
        checklist:application.checklist.map(item=>item.id===itemId?{...item,done:completed}:item),
        activity:addActivity(application.activity,`${completed?'Completed':'Reopened'}: ${target.label}`)
      };
    }));
    setToast(completed?'Checklist item completed':'Checklist item reopened');
  }
  function addChecklistItem(e:React.FormEvent) {
    e.preventDefault();
    const label = taskDraft.trim();
    if(!selectedDetails||!label) return;
    if(selectedDetails.checklist.some(item=>item.label.toLowerCase()===label.toLowerCase())) {
      setToast('That task is already on the checklist');
      return;
    }
    setApps(prev=>prev.map(application=>application.id===selectedDetails.id?{
      ...application,
      checklist:[...application.checklist,{id:crypto.randomUUID(),label,done:false}],
      activity:addActivity(application.activity,`Added checklist task: ${label}`)
    }:application));
    setTaskDraft('');
    setToast('Checklist task added');
  }
  function resetDemoData() {
    setResetConfirm(true);
  }
  function confirmDemoReset() {
    setApps(seed.map(application=>({...application,checklist:checklistFor(application.status),activity:[createActivity('Sample data restored')]})));
    setFilter('All applications');
    setSearch('');
    setDetailsId(null);
    setMenu(null);
    setMobileNav(false);
    setResetConfirm(false);
    setToast('Sample data restored');
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
        <div className="tip-card"><div className="tip-icon"><Sparkles size={16}/></div><strong>Stay on track</strong><p>Small steps today lead to big opportunities tomorrow.</p><button className="reset-demo-btn" onClick={resetDemoData}><RotateCcw size={13}/> Reset sample data</button></div>
        <div className="profile"><div className="avatar">S</div><div><strong>Student workspace</strong><small>Personal tracker</small></div><MoreHorizontal size={18} className="muted"/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={()=>setMobileNav(!mobileNav)} aria-label="Toggle menu"><Menu size={20}/></button>
        <div className="breadcrumb">Workspace <span>/</span> <strong>{filter==='All applications'?'Overview':filter}</strong></div>
        <div className="top-actions"><span className="today-label"><CalendarDays size={15}/>{new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span><button className="icon-btn notification" onClick={()=>counts.action?setFilter('Needs action'):setToast('No applications need action right now')} aria-label="Show deadlines needing action" title="Show deadlines needing action"><Bell size={18}/>{counts.action>0&&<i/>}</button><button className="add-btn" onClick={openAdd}><Plus size={17}/> Add application</button></div>
      </header>

      <div className="content">
        <section className="welcome-row">
          <div><div className="eyebrow"><span className="live-dot"/> YOUR CAREER, IN MOTION</div><h1>{filter==='All applications'?'Good things are in progress.':filter}</h1><p className="subtitle">Keep every opportunity organised. Your next step starts here.</p></div>
          <div className="welcome-actions"><button className="secondary-btn" onClick={()=>{safeExport(apps);setToast('CSV export started')}}><Download size={16}/> Export CSV</button><button className="secondary-btn" onClick={()=>{const count=safeExportCalendar(apps);setToast(`Exported ${count} active deadlines`)}}><CalendarPlus size={16}/> Export calendar</button><button className="primary-btn" onClick={openAdd}><Plus size={17}/> New application</button></div>
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
            <div className="toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or next action..."/></div><button className={`filter-btn ${filter==='Needs action'?'filter-on':''}`} onClick={()=>setFilter(filter==='Needs action'?'All applications':'Needs action')}><Filter size={15}/> Needs action</button><button className="sort-btn" onClick={()=>{const next=sortOrder==='asc'?'desc':'asc';setSortOrder(next);setToast(next==='asc'?'Earliest deadlines first':'Latest deadlines first')}} aria-label={sortOrder==='asc'?'Sort latest deadline first':'Sort earliest deadline first'} title={sortOrder==='asc'?'Earliest first':'Latest first'}><ArrowDownUp size={15}/></button></div>
            <div className="table-wrap">
              <table><thead><tr><th>COMPANY & ROLE</th><th>STATUS</th><th>DEADLINE</th><th></th></tr></thead>
              <tbody>
                {visible.map(a=><tr key={a.id}>
                  <td><div className="company-cell"><div className={`company-logo logo-${a.company.length%5}`}>{initials(a.company)}</div><div className="company-info"><strong>{a.company}</strong><span>{a.role}</span><button className="next-action-link" onClick={()=>openEdit(a)} aria-label={`${a.nextAction?'Edit':'Add'} next action for ${a.company}`}><Sparkles size={11}/><span>{a.nextAction||'Add next action'}</span></button></div></div></td>
                  <td><select className={`status-select ${a.status.toLowerCase()}`} value={a.status} onChange={e=>updateStatus(a.id,e.target.value as Status)} aria-label={`Status for ${a.company}`}>{statuses.map(s=><option key={s}>{s}</option>)}</select></td>
                  <td><div className={`deadline-cell ${needsAction(a)?'urgent':''}`}><span>{dateLabel(a.deadline)}</span>{needsAction(a)&&<span className="warning-pill"><CircleAlert size={11}/> Needs action</span>}</div></td>
                  <td className="row-menu-cell"><button className="icon-btn row-more" onClick={()=>setMenu(menu===a.id?null:a.id)} aria-label="Application actions"><MoreHorizontal size={18}/></button>{menu===a.id&&<div className="row-menu"><button onClick={()=>{setDetailsId(a.id);setTaskDraft('');setMenu(null)}}><ListChecks size={14}/> Checklist & history</button><button onClick={()=>openEdit(a)}><Pencil size={14}/> Edit</button><button className="danger" onClick={()=>remove(a.id)}><Trash2 size={14}/> Delete</button></div>}</td>
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

    {introVisible&&<div className="intro-splash" aria-hidden="true"><div className="intro-lockup"><div className="intro-mark"><GraduationCap size={30}/></div><div className="intro-wordmark">intern<span>flow</span><div className="intro-progress"><i/></div></div></div></div>}
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="modal" onSubmit={save}>
      <div className="modal-head"><div><div className="eyebrow">OPPORTUNITY DETAILS</div><h2>{editing?'Edit application':'Add new application'}</h2><p>Keep the important details in one place.</p></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X size={19}/></button></div>
      <div className="form-grid">
        <label className="full"><span>Company name <b>*</b></span><input autoFocus required value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="e.g. Northstar Labs"/></label>
        <label className="full"><span>Role / position <b>*</b></span><input required value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="e.g. Software Engineering Intern"/></label>
        <label><span>Deadline <b>*</b></span><input type="date" required value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></label>
        <div className="deadline-presets full" role="group" aria-label="Quick deadline presets"><span>QUICK SET</span>{deadlinePresets.map(preset=><button type="button" key={preset.days} className={form.deadline===plusDays(preset.days)?'selected':''} aria-pressed={form.deadline===plusDays(preset.days)} onClick={()=>setForm({...form,deadline:plusDays(preset.days)})}>{preset.label}</button>)}</div>
        <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as Status})}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="e.g. Bengaluru / Remote"/></label>
        <label>Work type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label>
        <label className="full">Next action memo<textarea rows={3} maxLength={180} value={form.nextAction} onChange={e=>setForm({...form,nextAction:e.target.value})} placeholder="The next concrete step for this application..."/><small className="form-hint">A short reminder to make your next move easier.</small></label>
      </div>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="primary-btn"><Check size={16}/>{editing?'Save changes':'Add application'}</button></div>
    </form></div>}
    {selectedDetails&&<div className="modal-backdrop details-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDetailsId(null)}}><section className="modal details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title">
      <div className="modal-head"><div><div className="eyebrow">APPLICATION WORKSPACE</div><h2 id="details-title">{selectedDetails.company}</h2><p>{selectedDetails.role}</p></div><button type="button" className="icon-btn" onClick={()=>setDetailsId(null)} aria-label="Close application workspace"><X size={19}/></button></div>
      <div className="detail-summary"><span className={`status-dot ${selectedDetails.status.toLowerCase()}`}/><strong>{selectedDetails.status}</strong><span className="detail-deadline"><Clock3 size={13}/>{dateLabel(selectedDetails.deadline)}</span><p>{selectedDetails.nextAction||'No next action set'}</p></div>
      <div className="details-grid">
        <section className="detail-section checklist-section">
          <div className="detail-section-heading"><div><h3><ListChecks size={16}/> Preparation checklist</h3><p>Small steps, one application at a time</p></div><span className="checklist-count">{completedDetailTasks}/{selectedDetails.checklist.length}</span></div>
          <div className="checklist-progress"><div><span style={{width:`${detailProgress}%`}}/></div></div>
          <form className="task-compose" onSubmit={addChecklistItem}><input aria-label="New checklist task" value={taskDraft} onChange={e=>setTaskDraft(e.target.value)} placeholder="Add a task..."/><button type="submit" aria-label="Add checklist task" title="Add checklist task"><Plus size={16}/></button></form>
          <div className="checklist-items">{selectedDetails.checklist.map(item=><label className={`checklist-item ${item.done?'done':''}`} key={item.id}><input type="checkbox" checked={item.done} onChange={()=>toggleChecklistItem(selectedDetails.id,item.id)}/><span>{item.label}</span></label>)}</div>
        </section>
        <section className="detail-section activity-section">
          <div className="detail-section-heading"><div><h3><History size={16}/> Activity</h3><p>A running record of this application</p></div><span className="checklist-count">{selectedDetails.activity.length}</span></div>
          <div className="activity-feed">{selectedDetails.activity.map(item=><div className="activity-item" key={item.id}><span className="activity-marker"/><div><strong>{item.message}</strong><time>{new Date(item.createdAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time></div></div>)}</div>
        </section>
      </div>
      <div className="modal-actions details-actions"><button type="button" className="secondary-btn" onClick={()=>setDetailsId(null)}>Close</button><button type="button" className="primary-btn" onClick={()=>{openEdit(selectedDetails);setDetailsId(null)}}><Pencil size={15}/> Edit application</button></div>
    </section></div>}
    {resetConfirm&&<div className="modal-backdrop reset-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setResetConfirm(false)}}><section className="modal reset-modal" role="alertdialog" aria-modal="true" aria-labelledby="reset-title"><div className="reset-mark"><RotateCcw size={19}/></div><h2 id="reset-title">Restore sample data?</h2><p>This replaces your saved applications with the fictional starter set. You can't undo this reset.</p><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setResetConfirm(false)}>Keep my data</button><button type="button" className="primary-btn" onClick={confirmDemoReset}><RotateCcw size={15}/> Restore samples</button></div></section></div>}
    {toast&&<div className="toast" role="status"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}

function Stat({icon,label,value,note,tone}:{icon:React.ReactNode,label:string,value:number,note:string,tone:string}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div><div className="stat-spark"><span/><span/><span/><span/><span/><span/><span/></div></div>;
}
