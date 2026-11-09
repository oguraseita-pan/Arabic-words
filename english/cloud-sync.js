
/* LEXIS English Studio optional cloud sync.
   Same Firebase sign-in as Lisān; separate document /users/{uid}/apps/english-vocabulary.
   Learning stays local when signed out or offline. */
(function(){
'use strict';
const cfg={
 apiKey:"AIzaSyDagk5I4iwtpgxRKhn5d00upRuCt3c3Kio",
 authDomain:"arabic-words-9b6ac.firebaseapp.com",
 projectId:"arabic-words-9b6ac",
 storageBucket:"arabic-words-9b6ac.firebasestorage.app",
 messagingSenderId:"614930473739",
 appId:"1:614930473739:web:71e3a5d787d86b4aeff80e"
};
const state={phase:'loading',message:'Checking sign-in...',user:null,auth:null,db:null,ref:null,active:false,dirty:false,flushTimer:null,busy:false,unsub:null,email:'',lastRemote:null};
const el=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
function stable(x){if(Array.isArray(x))return x.map(stable);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));return x}
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const relevant=['progress','quizProgress','customWords','activity'];
const empty=()=>({version:1,progress:{},quizProgress:{},customWords:{},activity:{},prefs:{},studyConditions:{},quizConditions:{}});
function latestMap(a,b){const out={...obj(a)};for(const [id,record] of Object.entries(obj(b))){const prev=out[id];if(!prev||Number(record?.updatedAt||0)>Number(prev?.updatedAt||0))out[id]=clone(record);else if(Number(record?.updatedAt||0)===Number(prev?.updatedAt||0)&&!equal(record,prev))out[id]=clone(record)}return out}
function merge(remote,local){const out=empty();for(const field of relevant)out[field]=latestMap(remote?.[field],local?.[field]);const pa=obj(remote?.prefs),pb=obj(local?.prefs);out.prefs=Number(pb.prefsUpdatedAt||0)>Number(pa.prefsUpdatedAt||0)||(!Object.keys(pa).length&&Object.keys(pb).length)?clone(pb):clone(pa);for(const field of ['studyConditions','quizConditions']){const aa=obj(remote?.[field]),bb=obj(local?.[field]);out[field]=Number(bb.updatedAt||0)>Number(aa.updatedAt||0)||(!Object.keys(aa).length&&Object.keys(bb).length)?clone(bb):clone(aa)}return out}
function payload(){const d=window.LEXIS_APP?.getData?.()||{};const out=empty();for(const key of [...relevant,'prefs','studyConditions','quizConditions'])out[key]=clone(d[key]||{});return out}
function status(phase,message){if(state.phase===phase&&state.message===message)return;state.phase=phase;state.message=message;render()}
function render(){const b=el('syncStatusBrief'),s=el('syncStatus'),f=el('syncLogin'),u=el('syncAuthed'),a=el('syncUser');if(s)s.textContent=state.message;if(b)b.textContent=state.phase==='connected'?'Connected':state.phase==='saving'?'Syncing...':state.phase==='signed-out'?'Signed out':state.phase==='error'?'Sync error':'Checking...';if(f)f.hidden=!!state.user;if(u)u.hidden=!state.user;if(a)a.textContent=state.email||'';const banner=el('homeSyncAlert');if(banner){banner.hidden=!(state.phase==='signed-out'||(state.phase==='error'&&!state.active));const t=el('syncAlertTitle'),d=el('syncAlertDescription');if(t)t.textContent=state.phase==='error'?'Cloud sync error':state.phase==='signed-out'?'Not signed in to cloud sync':'Cloud sync is checking';if(d)d.textContent=state.phase==='error'?state.message:'Learning stays on this device. Sign in under Settings to synchronize with other devices.'}}
function script(url){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(Error('Could not load Firebase SDK'));document.head.appendChild(s)})}
async function init(){try{const base='https://www.gstatic.com/firebasejs/12.19.0/';for(const file of ['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js'])await script(base+file);const app=firebase.initializeApp(cfg,'lexis-english');state.auth=app.auth();state.db=app.firestore();state.auth.onAuthStateChanged(user=>onAuth(user).catch(err=>status('error',String(err.message||err))))}catch(e){status('error','Cannot reach cloud sync. Offline learning still works. '+e.message)}}
async function onAuth(user){if(state.unsub){state.unsub();state.unsub=null}state.user=user;state.active=false;state.ref=null;state.email=user?.email||'';if(!user){status('signed-out','Signed out. Progress is stored locally.');return}status('loading','Connecting to your English cloud data...');const ref=state.db.doc('users/'+user.uid+'/apps/english-vocabulary');state.ref=ref;try{const snap=await ref.get({source:'server'});if(!state.user||state.user.uid!==user.uid)return;const remote=snap.exists?snap.data():null;const merged=merge(remote,payload());state.lastRemote=remote;window.LEXIS_APP.setData(merged);if(!snap.exists||!equal(merged,merge(remote,remote))){await state.db.runTransaction(async tx=>{const now=await tx.get(ref);const next=merge(now.exists?now.data():null,payload());tx.set(ref,{...next,schema:1,updatedAt:firebase.firestore.FieldValue.serverTimestamp()})})}state.active=true;state.dirty=false;status('connected','Cloud sync active. English progress is separate from Arabic.');state.unsub=ref.onSnapshot(s=>{if(!state.active||!s.exists||state.user?.uid!==user.uid)return;const remote=s.data(),local=payload(),next=merge(remote,local);if(!equal(next,local))window.LEXIS_APP.setData(next);state.lastRemote=remote;if(!equal(next,merge(remote,remote))){state.dirty=true;schedule()}},e=>status('error','Cloud connection was interrupted: '+e.message))}catch(e){status('error','Sign-in succeeded, but sync could not start: '+e.message)}}
function schedule(){if(!state.active)return;clearTimeout(state.flushTimer);state.flushTimer=setTimeout(()=>flush().catch(()=>{}),900)}
function onSave(){state.dirty=true;if(state.active)schedule()}
async function flush(){if(!state.active||state.busy||!state.dirty||!state.ref)return;if(!navigator.onLine){status('error','Offline. Changes are safe on this device.');return}state.busy=true;state.dirty=false;status('saving','Saving English progress...');try{const newData=await state.db.runTransaction(async tx=>{const s=await tx.get(state.ref),next=merge(s.exists?s.data():null,payload());tx.set(state.ref,{...next,schema:1,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});return next});const merged=merge(newData,payload());if(!equal(payload(),merged))window.LEXIS_APP.setData(merged);status('connected','All changes synchronized.');if(state.dirty)schedule()}catch(e){state.dirty=true;status('error','Cloud sync delayed. Local changes are safe. '+e.message)}finally{state.busy=false}}
async function signIn(email,password){if(!state.auth){status('error','Firebase is not ready. Check your connection.');return}try{status('loading','Signing in...');await state.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);await state.auth.signInWithEmailAndPassword(email.trim(),password)}catch(e){status('error','Sign-in failed: '+e.message)}}
async function signOut(){if(state.dirty&&state.active)await flush();if(state.unsub){state.unsub();state.unsub=null}state.active=false;await state.auth?.signOut();status('signed-out','Signed out. Learning stays local.')}
function syncNow(){if(!state.active){status('signed-out','Sign in first to enable cloud sync.');return}state.dirty=true;return flush()}
window.LEXIS_SYNC={onSave,signIn,signOut,syncNow,render,inspect:()=>({active:state.active,phase:state.phase})};
window.addEventListener('online',()=>{if(state.active&&state.dirty)schedule();else if(state.user&&!state.active)onAuth(state.user).catch(()=>{})});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.active&&state.dirty)schedule()});
init();
})();
