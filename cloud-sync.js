/* LISĀN 2.12 — optional Firebase Auth + Firestore multi-device synchronization.
   Local data always remains usable. No cloud writes happen until user explicitly
   chooses a first-time migration on this device. */
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
const AUTH_LINK="lisan_cloud_link_uid_v1";
const BACKUP_PREFIX="lisan_cloud_before_replace_";
const PENDING_PREFIX="lisan_cloud_pending_v1_";
const BASELINE_PREFIX="lisan_cloud_server_baseline_v1_";
const UNTRACKED_PREFIX="lisan_cloud_untracked_v1_";
const sections=["progress","quizProgress","activity","quizActivity","quizOrderOffsets"];
const fields=["prefs","quizzes","verbPairsV280"];
const state={
 loaded:false,loading:null,auth:null,db:null,user:null,uid:null,
 ref:null,unsub:null,phase:"signed-out",active:false,
 linkedUid:localStorage.getItem(AUTH_LINK)||"",
 lastSaved:null,pending:{},flushing:false,flushTimer:null,
 status:"Not connected. Your learning data stays on this device.",
 email:"",lastRemote:null,lastError:"",initializing:false
};
function clone(v){return JSON.parse(JSON.stringify(v))}
function obj(v){return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}
function snapshotOf(d){
 const value={};
 for(const key of sections)value[key]=clone(obj(d[key]));
 value.prefs=clone(obj(d.prefs));
 value.quizzes=clone(Array.isArray(d.quizzes)?d.quizzes:[]);
 value.verbPairsV280=!!d.verbPairsV280;
 return value;
}
function eq(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function changes(prev,next){
 const patch={};
 for(const section of sections){
  const left=obj(prev[section]),right=obj(next[section]),keys=new Set([...Object.keys(left),...Object.keys(right)]);
  for(const key of keys){
   if(!eq(left[key],right[key])){
    if(!patch[section])patch[section]={};
    patch[section][key]=Object.hasOwn(right,key)?clone(right[key]):null;
   }
  }
 }
 for(const key of fields){
  if(!eq(prev[key],next[key]))patch[key]=clone(next[key]);
 }
 return patch;
}
function mergePatch(dst,src){
 for(const [key,value] of Object.entries(src||{})){
  if(sections.includes(key)){
   dst[key]=obj(dst[key]);
   for(const [id,v] of Object.entries(value||{}))dst[key][id]=v===null?null:clone(v);
  }else if(fields.includes(key))dst[key]=clone(value);
 }
 return dst;
}
function applyPatch(remote,patch){
 const out=snapshotOf(remote);
 for(const section of sections){
  for(const [id,value] of Object.entries(obj(patch[section]))){
   if(value===null)delete out[section][id];
   else out[section][id]=clone(value);
  }
 }
 for(const key of fields)if(Object.hasOwn(patch,key))out[key]=clone(patch[key]);
 return out;
}
function hasPending(p){return Object.keys(p||{}).some(k=>sections.includes(k)?Object.keys(p[k]||{}).length>0:true)}
function backupLocal(reason){
 try{
  const key=BACKUP_PREFIX+Date.now();
  localStorage.setItem(key,JSON.stringify({app:"Lisān",version:2,reason,backedUpAt:new Date().toISOString(),...data}));
  const entries=Object.keys(localStorage).filter(k=>k.startsWith(BACKUP_PREFIX)).sort();
  while(entries.length>4)localStorage.removeItem(entries.shift());
  return true;
 }catch(e){return false}
}
function keepPending(){
 if(!state.linkedUid)return;
 try{localStorage.setItem(PENDING_PREFIX+state.linkedUid,JSON.stringify(state.pending))}catch(e){}
}
function readPending(uid){
 try{return obj(JSON.parse(localStorage.getItem(PENDING_PREFIX+uid)||"{}"))}catch(e){return {}}
}
function recordLocalSave(){
 const current=snapshotOf(data);
 if(state.linkedUid){
  const patch=changes(state.lastSaved||current,current);
  if(hasPending(patch)){
   mergePatch(state.pending,patch);
   keepPending();
   if(state.active)scheduleFlush();
   draw();
  }
 }
 state.lastSaved=current;
}
function setPhase(phase,message){
 state.phase=phase;
 if(message)state.status=message;
 draw();
}
function translate(message){
 if(data.prefs.lang!=="jp")return message;
 const t={
 "Not connected. Your learning data stays on this device.":"未接続です。学習データは現在の端末に保存されています。",
 "Loading Firebase…":"Firebaseを読み込んでいます…",
 "Checking cloud data…":"クラウドのデータを確認しています…",
 "Connected. Changes sync automatically.":"接続済み。変更は自動同期されます。",
 "Saving changes to cloud…":"クラウドへ保存しています…",
 "All changes saved.":"すべての変更を同期しました。",
 "Cloud is empty. Choose which device provides your first backup.":"クラウドは空です。最初に履歴をアップロードする端末を選んでください。",
 "Cloud already contains progress. Choose how to begin on this device.":"クラウドに学習履歴があります。この端末での開始方法を選んでください。",
 "Sign in to connect your iPhone, iPad and PC.":"ログインしてiPhone・iPad・PCを同期します。",
 "Waiting for connection. Local data is safe.":"通信待ちです。端末内の学習データは安全に保存されています。"
 };
 return t[message]||message;
}
const el=id=>document.getElementById(id);

function renderHomeSyncBanner(){
 const banner=el("homeSyncAlert"),title=el("homeSyncAlertTitle"),message=el("homeSyncAlertMessage"),button=el("homeSyncAlertButton");
 if(!banner||!title||!message||!button)return;
 const ja=data.prefs.lang==="jp";
 // Login can be restored asynchronously from browser storage; don't call a
 // previously linked device "logged out" until Firebase has checked it.
 if(state.active&&["connected","saving"].includes(state.phase)){
  banner.hidden=true;
  return;
 }
 banner.hidden=false;
 let severity="warning",head="",detail="",action="";
 const busy=["loading","checking","uploading"].includes(state.phase)
  ||(state.linkedUid&&!state.loaded&&state.phase==="signed-out");
 if(busy){
  severity="checking";
  head=ja?"ログイン・同期状態を確認中":"Checking sign-in and cloud sync";
  detail=ja?"端末内の学習データは保持されています。接続を確認しています。":"Your study data remains on this device while the connection is checked.";
  action=ja?"同期設定":"Sync settings";
 }else if(state.phase==="offline"){
  severity="error";
  head=ja?"クラウド同期が停止しています":"Cloud sync paused";
  detail=ja?"端末内には保存されています。通信状態を確認し、設定画面から再接続してください。":"Changes are saved on this device. Check your connection and reconnect in settings.";
  action=ja?"再接続":"Reconnect";
 }else if(state.phase==="error"){
  severity="error";
  head=ja?"クラウド同期にエラーがあります":"Cloud sync error";
  detail=ja?"学習データは端末内に保存されています。設定でエラーの詳細を確認してください。":"Your study data remains on this device. Check details in settings.";
  action=ja?"エラー確認":"See error";
 }else if(state.phase==="choose-cloud"||state.phase==="choose-upload"){
  head=ja?"クラウド同期の初期設定が未完了です":"Cloud sync setup is incomplete";
  detail=ja?"学習履歴の移行方法を設定画面で選んでください。完了するまでは端末間で同期されません。":"Choose a data migration method in settings. Devices will not sync until setup is complete.";
  action=ja?"設定を完了":"Finish setup";
 }else if(!state.user||!state.active){
  head=ja?"クラウド同期にログインしていません":"Not signed in to cloud sync";
  detail=ja?"この端末の学習履歴は他の端末に同期されません。設定画面からログインしてください。":"Your study progress on this device will not sync to other devices until you sign in.";
  action=ja?"ログイン":"Sign in";
 }else{
  severity="checking";
  head=ja?"クラウド同期の状態を確認中":"Checking cloud sync";
  detail=ja?"端末内の記録は保存されています。":"Your study records are stored on this device.";
  action=ja?"同期設定":"Sync settings";
 }
 banner.dataset.severity=severity;
 title.textContent=head;
 message.textContent=detail;
 button.textContent=action;
}
function draw(){
 const status=el("cloudSyncStatus"),intro=el("cloudSyncIntro"),auth=el("cloudAuthForm"),choice=el("cloudSyncChoice"),connected=el("cloudSyncConnected");
 if(!status)return;
 status.textContent=translate(state.status);
 status.dataset.state=state.phase;
 if(intro)intro.textContent=state.user?"Signed in: "+state.user.email:"Project: arabic-words-9b6ac";
 if(auth)auth.hidden=!!state.user;
 if(choice)choice.hidden=!["choose-upload","choose-cloud"].includes(state.phase);
 if(connected)connected.hidden=!state.active;
 const upload=el("cloudUpload"),download=el("cloudDownload");
 if(upload)upload.hidden=state.phase!=="choose-upload";
 if(download)download.hidden=state.phase!=="choose-cloud";
 const logout=el("cloudSignOut");
 if(logout)logout.hidden=!state.user;
 const pending=el("cloudSyncPending");
 if(pending)pending.textContent=state.active?(hasPending(state.pending)?"Changes waiting to sync":"Cloud sync active"):"";
 renderHomeSyncBanner();
}
function messageForError(e){
 const code=String(e?.code||"");
 if(code.includes("auth/invalid-credential")||code.includes("auth/wrong-password")||code.includes("auth/user-not-found"))
  return "ログインに失敗しました。Firebase → Authentication → Users のメールアドレスとパスワードを確認してください。";
 if(code.includes("auth/operation-not-allowed"))
  return "Firebase → Authentication → Sign-in method で Email/Password を有効にしてください。";
 if(code.includes("permission-denied"))
  return "Firestoreのアクセスが拒否されました。Database → Rules で users/{UID} の専用ルールを公開してください。";
 if(code.includes("not-found")||code.includes("failed-precondition"))
  return "Firestoreが未作成の場合は、Firebase → Firestore Database で作成してください。";
 return String(e?.message||"接続できませんでした。").slice(0,280);
}
function loadScript(url){
 return new Promise((resolve,reject)=>{
  const tag=document.createElement("script");
  tag.src=url;tag.async=true;
  tag.onload=resolve;tag.onerror=()=>reject(Error("Firebase SDK could not load. Please check internet access."));
  document.head.appendChild(tag);
 });
}
function initFirebase(){
 if(state.loading)return state.loading;
 state.loading=(async()=>{
  setPhase("loading","Loading Firebase…");
  const base="https://www.gstatic.com/firebasejs/12.19.0/";
  for(const file of ["firebase-app-compat.js","firebase-auth-compat.js","firebase-firestore-compat.js"])await loadScript(base+file);
  if(!window.firebase)throw Error("Firebase SDK did not initialize.");
  firebase.initializeApp(cfg);
  state.auth=firebase.auth();state.db=firebase.firestore();state.loaded=true;
  state.auth.onAuthStateChanged(user=>{onAuth(user).catch(e=>setPhase("error",messageForError(e)))});
  return true;
 })().catch(e=>{state.loading=null;setPhase("error",messageForError(e));throw e});
 return state.loading;
}
async function onAuth(user){
 if(state.unsub){state.unsub();state.unsub=null}
 state.user=user;state.uid=user?.uid||null;state.active=false;state.ref=null;
 if(!user){
  state.email="";setPhase("signed-out","Sign in to connect your iPhone, iPad and PC.");return;
 }
 state.email=user.email||"";
 state.ref=state.db.doc("users/"+user.uid+"/sync/state");
 setPhase("checking","Checking cloud data…");
 const doc=await state.ref.get({source:"server"});
 if(!state.user||state.user.uid!==user.uid)return;
 state.lastRemote=doc.exists?doc.data():null;
 const isLinked=state.linkedUid===user.uid;
 const localHasHistory=Object.keys(obj(data.progress)).length>0||Object.keys(obj(data.quizProgress)).length>0||(data.quizzes||[]).length>0;
 if(doc.exists){
  if(isLinked||!localHasHistory){if(!isLinked&&!backupLocal("first-cloud-import")){setPhase("error","Local backup failed. Export a JSON backup before continuing.");return}await connect(doc.data(),user.uid)}
  else setPhase("choose-cloud","Cloud already contains progress. Choose how to begin on this device.");
 }else{
  setPhase("choose-upload","Cloud is empty. Choose which device provides your first backup.");
 }
}
function hydrate(remote){
 if(state.linkedUid){
  try{localStorage.setItem(BASELINE_PREFIX+state.linkedUid,JSON.stringify(snapshotOf(remote)))}catch(e){}
 }
 const payload=applyPatch(remote,state.pending),fresh=defaults();
 data={...fresh,...payload,prefs:{...fresh.prefs,...obj(payload.prefs),srs:{...fresh.prefs.srs,...obj(payload.prefs?.srs)}}};
 try{localStorage.setItem(STORE,JSON.stringify(data))}catch(e){}
 state.lastSaved=snapshotOf(data);
 try{
  configure();syncSettings();drawNavigation();
  if(current==="home")renderHome();
  if(current==="words")renderWords();
  if(current==="study")renderStudy();
  if(current==="quiz")renderQuiz();
  if(current==="insights")renderInsights();
 }catch(e){console.warn("LISĀN sync render failed",e)}
}
async function connect(remote,uid){
 if(!state.user||state.user.uid!==uid)return;
 if(state.unsub){state.unsub();state.unsub=null}
 state.linkedUid=uid;
 localStorage.setItem(AUTH_LINK,uid);
 state.pending=mergePatch(readPending(uid),state.pending);
 state.active=true;
 hydrate(remote);
 setPhase("connected",hasPending(state.pending)?"Saving changes to cloud…":"Connected. Changes sync automatically.");
 state.unsub=state.ref.onSnapshot({includeMetadataChanges:false},snap=>{
  if(!state.active||state.uid!==uid)return;
  if(!snap.exists){setPhase("error","Cloud record disappeared; sync paused to protect local data.");state.active=false;return}
  state.lastRemote=snap.data();
  hydrate(snap.data());
  if(hasPending(state.pending))scheduleFlush();
  else setPhase("connected","All changes saved.");
 },e=>{state.active=false;setPhase("error",messageForError(e))});
 if(hasPending(state.pending))scheduleFlush();
}
async function initialUpload(){
 if(!state.user||!state.ref||state.phase!=="choose-upload")return;
 if(!confirm("この端末の学習・クイズ記録を最初のクラウドデータとして登録します。iPhoneの最新記録がこの端末にあるか確認しましたか？"))return;
 if(!backupLocal("before-first-cloud-upload")){alert("端末のバックアップを保存できませんでした。JSONを手動書き出ししてください。");return}
 setPhase("uploading","Uploading this device's progress…");
 try{
  const payload=snapshotOf(data);
  await state.db.runTransaction(async tx=>{
   const doc=await tx.get(state.ref);
   if(doc.exists)throw Error("Cloud already has data. Sign in again to choose the existing record.");
   tx.set(state.ref,{...payload,schema:1,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
  });
  await connect(payload,state.user.uid);
 }catch(e){setPhase("error",messageForError(e))}
}
async function acceptCloud(){
 if(!state.user||!state.ref||state.phase!=="choose-cloud")return;
 const email=state.user.email||"";
 if(!confirm("既存のクラウド履歴（"+email+"）をこの端末で使用します。端末の現在の記録は自動バックアップしますが、同期前の状態に戻すにはバックアップの復元が必要です。続けますか？"))return;
 if(!backupLocal("before-first-cloud-download")){alert("端末のバックアップを保存できませんでした。JSONを書き出してから再度お試しください。");return}
 try{
  setPhase("checking","Checking cloud data…");
  const doc=await state.ref.get({source:"server"});
  if(!doc.exists)throw Error("Cloud is empty. Reconnect and upload the correct device.");
  await connect(doc.data(),state.user.uid);
 }catch(e){setPhase("error",messageForError(e))}
}
function scheduleFlush(){
 if(!state.active||!hasPending(state.pending))return;
 if(state.flushTimer)clearTimeout(state.flushTimer);
 state.flushTimer=setTimeout(()=>{flush().catch(()=>{})},800);
}
function clearSent(sent){
 for(const section of sections){
  if(!sent[section])continue;
  for(const [id,value] of Object.entries(sent[section])){
   if(eq(state.pending[section]?.[id],value))delete state.pending[section][id];
  }
  if(state.pending[section]&&!Object.keys(state.pending[section]).length)delete state.pending[section];
 }
 for(const key of fields)if(Object.hasOwn(sent,key)&&eq(sent[key],state.pending[key]))delete state.pending[key];
 keepPending();
}
async function flush(){
 if(!state.active||!state.ref||state.flushing||!hasPending(state.pending))return;
 if(!navigator.onLine){setPhase("offline","Waiting for connection. Local data is safe.");return}
 state.flushing=true;
 const sent=clone(state.pending);
 setPhase("saving","Saving changes to cloud…");
 try{
  const merged=await state.db.runTransaction(async tx=>{
   const doc=await tx.get(state.ref);
   if(!doc.exists)throw Error("Cloud record is missing; no data was overwritten.");
   const payload=applyPatch(doc.data(),sent);
   tx.set(state.ref,{...payload,schema:1,createdAt:doc.data().createdAt||firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
   return payload;
  });
  clearSent(sent);
  if(!hasPending(state.pending))setPhase("connected","All changes saved.");
  else scheduleFlush();
 }catch(e){
  setPhase("offline",messageForError(e)+" Changes remain on this device.");
 }finally{state.flushing=false}
}
async function signIn(e){
 e.preventDefault();
 const email=el("cloudEmail")?.value.trim()||"",password=el("cloudPassword")?.value||"";
 if(!email||!password){alert("メールアドレスとパスワードを入力してください。");return}
 try{
  await initFirebase();
  setPhase("checking","Signing in…");
  await state.auth.signInWithEmailAndPassword(email,password);
  if(el("cloudPassword"))el("cloudPassword").value="";
 }catch(err){setPhase("error",messageForError(err))}
}
async function signOut(){
 if(hasPending(state.pending)){
  if(!confirm("まだクラウドに送信されていない変更があります。端末には残りますが、ログアウトしますか？"))return;
 }
 if(state.unsub){state.unsub();state.unsub=null}
 state.active=false;state.linkedUid="";
 localStorage.removeItem(AUTH_LINK);
 state.pending={};
 if(state.auth)await state.auth.signOut();
 setPhase("signed-out","Sign in to connect your iPhone, iPad and PC.");
}
function init(){
 if(state.linkedUid){
  state.pending=readPending(state.linkedUid);
  // If the external sync engine failed to load while offline, the HTML app
  // still wrote a marker. Reconstruct only the offline local changes relative
  // to the last server-confirmed snapshot; avoid replacing another device.
  if(localStorage.getItem(UNTRACKED_PREFIX+state.linkedUid)){
   try{
    const baseline=JSON.parse(localStorage.getItem(BASELINE_PREFIX+state.linkedUid)||"null");
    if(baseline){
     mergePatch(state.pending,changes(snapshotOf(baseline),snapshotOf(data)));
     keepPending();
     localStorage.removeItem(UNTRACKED_PREFIX+state.linkedUid);
    }
   }catch(e){console.warn("LISĀN offline reconciliation pending",e)}
  }
 }
 if(state.linkedUid&&!state.loaded){
  state.phase="loading";
  state.status="Loading Firebase…";
 }
 state.lastSaved=snapshotOf(data);
 el("cloudAuthForm")?.addEventListener("submit",signIn);
 el("cloudUpload")?.addEventListener("click",initialUpload);
 el("cloudDownload")?.addEventListener("click",acceptCloud);
 el("cloudSignOut")?.addEventListener("click",()=>{signOut().catch(e=>setPhase("error",messageForError(e)))});
 el("cloudRetry")?.addEventListener("click",()=>{
  if(!state.loaded)initFirebase().catch(()=>{});
  else if(state.user)onAuth(state.user).catch(e=>setPhase("error",messageForError(e)));
  else setPhase("signed-out","Sign in to connect your iPhone, iPad and PC.");
 });
 el("cloudSyncNow")?.addEventListener("click",()=>flush().catch(()=>{}));
 window.addEventListener("online",()=>{if(state.active)scheduleFlush();else if(state.linkedUid&&state.loaded&&state.user)onAuth(state.user).catch(()=>{})});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state.active&&hasPending(state.pending))scheduleFlush()});
 draw();
 if(state.linkedUid)initFirebase().catch(()=>{});
}
window.LISAN_SYNC={onSave:recordLocalSave,render:draw,init,inspect:()=>({phase:state.phase,active:state.active,hasPending:hasPending(state.pending),uid:state.uid})};
init();
})();