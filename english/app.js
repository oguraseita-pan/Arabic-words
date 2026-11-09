
/* LEXIS English Studio · local-first learning, independent from Lisān. */
'use strict';
const $=id=>document.getElementById(id);
const DAY=86400000, KEY='lexis_english_v1';

const SRS_DEFAULT={multiplier:1,againMin:10,firstGood:1,firstEasy:4,ease:2.5,hardFactor:1.2,easyBonus:.8};
const SRS_PRESETS={standard:{...SRS_DEFAULT},intensive:{...SRS_DEFAULT,multiplier:.7,againMin:5,firstEasy:2,ease:2.3},relaxed:{...SRS_DEFAULT,multiplier:1.5,againMin:15,firstGood:2,firstEasy:7,ease:2.7}};
const SRS_LIMITS={multiplier:[.25,3],againMin:[1,240],firstGood:[.25,30],firstEasy:[1,90],ease:[1.3,4]};
function configSrs(){return data.prefs.srs==='custom'?{...SRS_DEFAULT,...data.prefs.srsConfig}:{...(SRS_PRESETS[data.prefs.srs]||SRS_DEFAULT)}}
function clampNum(v,low,high){return Math.min(high,Math.max(low,Number(v)||low))}
function calcInterval(w,score,key='progress'){
 const old=Number(pOf(w,key).interval)||0,c=configSrs(),good=clampNum(c.firstGood,.25,30),easy=clampNum(c.firstEasy,good,90);
 const growth=clampNum(c.ease,1.3,4),hard=clampNum(c.hardFactor,1,2),bonus=clampNum(c.easyBonus,.1,2),scale=clampNum(c.multiplier,.25,3);
 const d=score===0?clampNum(c.againMin,1,240)/1440:score===1?(old?Math.max(.25,old*hard*.85):good*.5):score===2?(old?Math.max(good,old*growth):good):(old?Math.max(easy,old*(growth+bonus)):easy);
 return Math.max(1/1440,Math.min(3650,score===0?d:d*scale));
}
function intervalLabel(d){
 if(!(d>0))return txt('soon','まもなく');
 const mins=Math.round(d*1440);
 if(mins<60)return mins+txt(' min','分');
 if(d<1)return Math.round(d*240)/10+txt(' hr','時間');
 if(d<14)return Math.round(d*10)/10+txt(' days','日');
 if(d<70)return Math.round(d/7*10)/10+txt(' weeks','週間');
 return Math.round(d/30*10)/10+txt(' months','か月');
}
function previewSrs(){const w={id:'__wm_preview__'};return [[0,txt('Again','もう一度')],[1,txt('Hard','難しい')],[2,txt('Good','普通')],[3,txt('Easy','簡単')]].map(([v,label])=>'<div><small>'+label+'</small><strong>'+intervalLabel(calcInterval(w,v))+'</strong></div>').join('')}
const FILTER_KEY='wordmate_filter_open_v1';
function initialFilter(){try{const v=JSON.parse(localStorage.getItem(FILTER_KEY)||'null');return {study:v?.study!==false,quiz:v?.quiz!==false}}catch{return {study:true,quiz:true}}}
let filterOpen=initialFilter();
function saveFilterOpen(){try{localStorage.setItem(FILTER_KEY,JSON.stringify(filterOpen))}catch{}}
function filterDetails(kind){return '<details class="filter-box" id="practiceFilters" data-practice-kind="'+kind+'"'+(filterOpen[kind]?' open':'')+'><summary>'+txt('Study settings','学習条件')+'</summary>'+filters(kind)+'</details>'}

const GROUPS=window.LEXICON_SETS||[], BASE=window.LEXICON_DATA||[];
const SET_BY_ID=Object.fromEntries(GROUPS.map(s=>[s.id,s]));
const DEFAULT={version:1,progress:{},quizProgress:{},customWords:{},activity:{},prefs:{ui:'ja',theme:'light',daily:15,voice:'en-US',speed:0.9,autoRead:true,srs:'standard',srsConfig:{...SRS_DEFAULT},prefsUpdatedAt:0},studyConditions:{set:'all',target:'all',pos:'all',mode:'dueNew',direction:'ja-en',limit:'15'},quizConditions:{set:'all',target:'all',pos:'all',mode:'dueNew',direction:'en-ja',limit:'10'}};
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const txt=(en,ja)=>data.prefs.ui==='ja'?ja:en;
const dateKey=(time=Date.now())=>{const d=new Date(time);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function initial(){let d;try{d=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){};if(!d||d.version!==1)return clone(DEFAULT);return {...clone(DEFAULT),...d,prefs:{...DEFAULT.prefs,...d.prefs},studyConditions:{...DEFAULT.studyConditions,...d.studyConditions},quizConditions:{...DEFAULT.quizConditions,...d.quizConditions}}}
let data=initial(), current='home',search='',libFilter={set:'all',target:'all',pos:'all'}, session={ids:[],pos:0,shown:false,started:false},quiz={ids:[],pos:0,answered:false,selected:null,options:[],correct:0,started:false},modalId=null;
function normalizeCustom(d){for(const w of Object.values(d.customWords||{})){if(w.set==='C')w.set='D';if(w.set==='S')w.set='B';if(!w.pos)w.pos=w.type==='C'?'expression':'noun';if(!w.senses||!w.senses.length)w.senses=[{ja:w.ja,example:w.example,exampleJa:w.exampleJa||'',explain:''}];}}
normalizeCustom(data);
const all=()=>BASE.concat(Object.values(data.customWords||{}).filter(w=>!w.deleted));
const byId=id=>all().find(w=>w.id===id);
const pOf=(w,which='progress')=>(data[which]||{})[w.id]||{};
const due=(w,which='progress')=>{const p=pOf(w,which);return p.tries>0 && Number(p.due||0)<=Date.now()};
const fresh=(w,which='progress')=>!(pOf(w,which).tries>0);
const mastered=(w,which='progress')=>Number(pOf(w,which).reps||0)>=3 && Number(pOf(w,which).interval||0)>=7;
const active=w=>!pOf(w).skip;
function inTarget(w,target){return target==='all'||target==='words'&&w.type==='W'||target==='chunks'&&w.type==='C'||target==='favorite'&&!!pOf(w).star||target==='custom'&&!!w.custom}
const scope=conds=>all().filter(w=>active(w)&&(conds.set==='all'||w.set===conds.set)&&(conds.pos==='all'||!conds.pos||w.pos===conds.pos)&&inTarget(w,conds.target));
function save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){notify(txt('Local storage is full. Please export a backup.','保存容量が不足しています。バックアップを保存してください。'))}window.LEXIS_SYNC?.onSave?.()}
function notify(s){const el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('show'),2400)}
function speaker(s){if(!window.speechSynthesis)return notify('Speech synthesis is unavailable');speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(s);utter.lang=data.prefs.voice;utter.rate=Number(data.prefs.speed)||.9;const voices=speechSynthesis.getVoices();const match=voices.find(v=>v.lang===utter.lang)||voices.find(v=>v.lang.startsWith('en'));if(match)utter.voice=match;speechSynthesis.speak(utter)}
const opt=(v,label,selected)=>'<option value="'+esc(v)+'"'+(v===selected?' selected':'')+'>'+esc(label)+'</option>';
const select=(field,kind,label,options)=>'<label class="control"><span>'+label+'</span><select data-config="'+kind+'" data-field="'+field+'">'+options.map(o=>opt(o[0],o[1],data[kind+'Conditions'][field])).join('')+'</select></label>';
const setOptions=()=>[['all',txt('All sets','すべてのセット')]].concat(GROUPS.map(g=>[g.id,g.title]));
const posLabel=w=>{const x=(window.WORDMATE_PARTS||[]).find(p=>p.id===w.pos);return x?txt(x.en,x.ja):txt('Expression','表現')};
const posOptions=()=>[['all',txt('All parts of speech','全品詞')]].concat((window.WORDMATE_PARTS||[]).map(p=>[p.id,txt(p.en,p.ja)]));
const targetOptions=()=>[['all',txt('All','すべて')],['words',txt('Words','単語')],['chunks',txt('Chunks','チャンク')],['favorite',txt('Favorites','お気に入り')],['custom',txt('My additions','自主追加')]];
const modeOptions=()=>[['dueNew',txt('Due + new','復習対象＋新規')],['due',txt('Due only','復習対象のみ')],['all',txt('All selected items','選択対象すべて')]];
const directionOptions=()=>[['ja-en',txt('Japanese → English','日本語 → 英語')],['en-ja',txt('English → Japanese','英語 → 日本語')],['mixed',txt('Mixed','ランダム')]];
function filters(kind){return '<div class="filter-grid">'+select('set',kind,txt('Study set','学習セット'),setOptions())+select('target',kind,txt('Study target','学習対象'),targetOptions())+select('pos',kind,txt('Part of speech','品詞'),posOptions())+select('mode',kind,txt('Scheduling','学習方法'),modeOptions())+select('direction',kind,txt('Direction','出題方向'),directionOptions())+select('limit',kind,txt('Session length','学習件数'),[['10','10'],['15','15'],['20','20'],['30','30'],['50','50'],['all',txt('All','すべて')]])+'</div>'}
function chooseItems(kind){const c=data[kind+'Conditions'],pool=scope(c),progress=kind==='study'?'progress':'quizProgress';const limit=c.limit==='all'?pool.length:Math.max(1,Number(c.limit)||15);if(c.mode==='all')return shuffle(pool).slice(0,limit).map(w=>w.id);if(c.mode==='due')return shuffle(pool.filter(w=>due(w,progress))).slice(0,limit).map(w=>w.id);const reviews=shuffle(pool.filter(w=>due(w,progress))),newOnes=shuffle(pool.filter(w=>fresh(w,progress))),items=[];while(items.length<limit&&(reviews.length||newOnes.length)){if(reviews.length)items.push(reviews.shift());if(items.length<limit&&reviews.length)items.push(reviews.shift());if(items.length<limit&&newOnes.length)items.push(newOnes.shift());}return items.map(w=>w.id)}
function shuffle(arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function gradeItem(w,score,key='progress'){const old=pOf(w,key),interval=calcInterval(w,score,key),now=Date.now();data[key][w.id]={...old,tries:(old.tries||0)+1,reps:score===0?0:(old.reps||0)+1,correct:(old.correct||0)+(score>=2?1:0),interval,lapses:(old.lapses||0)+(score===0?1:0),due:now+interval*DAY,updatedAt:now};const day=dateKey(),a=data.activity[day]||{reviews:0,quiz:0};a[key==='progress'?'reviews':'quiz']++;data.activity[day]={...a,updatedAt:now};save()}
function flip(w){const dir=data.studyConditions.direction;return dir==='mixed'?(session.pos%2===0?'ja-en':'en-ja'):dir}
function styleKind(w){return '<span class="tag">'+esc(posLabel(w))+'</span>'+(w.type==='C'?'<span class="tag subtle-tag">'+txt('CHUNK','チャンク')+'</span>':'')}
function buttonsFor(w){const p=pOf(w);return '<div class="item-actions"><button class="'+(p.star?'marked':'')+'" data-action="star" data-id="'+esc(w.id)+'" title="Favorite" aria-label="Favorite">'+(p.star?'★':'☆')+'</button><button data-action="skip" data-id="'+esc(w.id)+'" title="Exclude from study">'+(p.skip?'↩':'⊘')+'</button>'+(w.custom?'<button data-action="edit" data-id="'+esc(w.id)+'" title="Edit">✎</button>':'')+'</div>'}
const stats=()=>{const x=all().filter(active);return {total:x.length,words:x.filter(w=>w.type==='W').length,chunks:x.filter(w=>w.type==='C').length,seen:x.filter(w=>pOf(w).tries).length,review:x.filter(w=>due(w)).length,mastered:x.filter(w=>mastered(w)).length,favorite:x.filter(w=>pOf(w).star).length,custom:x.filter(w=>w.custom).length}};
const tile=(label,n,small)=>'<div class="card metric"><small>'+label+'</small><strong>'+n+'</strong><span>'+small+'</span></div>';
function home(){const s=stats(),today=data.activity[dateKey()]?.reviews||0;return '<div id="homeSyncAlert" class="sync-banner" hidden><span>☁</span><div><strong id="syncAlertTitle"></strong><small id="syncAlertDescription"></small></div><button class="btn" data-action="nav" data-page="settings">'+txt('Open settings','設定へ')+'</button></div><section class="hero"><div class="hero-content"><span class="hero-eyebrow">WORDMATE · ENGLISH VOCABULARY</span><h1>'+txt('Learn the English you actually use.','実際に使う英語を身につける。')+'</h1><p>'+txt('High-value words and natural chunks for daily life, business, TOEIC and sales. Review with spaced repetition.','日常・ビジネス・TOEIC・営業で使う実践的な単語とチャンクを、忘却曲線に沿って学習。')+'</p><button class="btn" data-action="nav" data-page="study">'+txt('Start flashcards','学習を始める')+' →</button></div><div class="hero-ornament">Aa<br><i>↗</i></div></section><div class="stats-grid">'+tile(txt('Items studied','学習済み'),s.seen,s.total+' '+txt('in library','語句を収録'))+tile(txt('Due today','本日の復習'),s.review,txt('ready for review','復習対象'))+tile(txt('Mastered','定着'),s.mastered,txt('long-term memory','長期記憶'))+tile(txt('Today','本日'),today,txt('of '+data.prefs.daily+' daily reviews','目標 '+data.prefs.daily+' 件'))+'</div><div class="home-shortcuts"><button class="btn" data-action="nav" data-page="insights">▥ '+txt('Progress','学習記録')+'</button><button class="btn" data-action="nav" data-page="settings">⚙ '+txt('Settings','設定')+'</button></div><div class="section-heading"><h2>'+txt('Your study sets','学習セット')+'</h2><button class="text-link" data-action="nav" data-page="words">'+txt('See all items','すべて表示')+'</button></div><div class="pack-grid">'+GROUPS.map(g=>{const items=all().filter(w=>w.set===g.id),n=items.filter(w=>pOf(w).tries).length;return '<button class="card pack-card" data-action="openSet" data-set="'+g.id+'"><span class="pack-icon">'+g.icon+'</span><strong>'+g.title+'</strong><small>'+g.description+'</small><div class="pack-count">'+n+' / '+items.length+'</div><div class="rail"><span style="width:'+(items.length?100*n/items.length:0)+'%"></span></div></button>'}).join('')+'</div><div class="tip card"><strong>'+txt('Why chunks matter','チャンクを学ぶ理由')+'</strong><p>'+txt('Learn complete, reusable phrases such as “I see your point, but ...” instead of isolated dictionary meanings.','I see your point, but ... のように、そのまま会話で使えるまとまりを覚えます。')+'</p><button class="text-link" data-action="openType" data-type="C">'+txt('Explore chunks','チャンクを見る')+' →</button></div>'}
function heading(kicker,title,subtitle){return '<div class="page-intro"><small class="kicker">'+kicker+'</small><h1 class="page-title">'+title+'</h1><p class="subtitle">'+subtitle+'</p></div>'}
function studyPage(){
 const w=byId(session.ids[session.pos]);
 let body='';
 if(!session.started)body='<div class="empty"><h2>'+txt('Ready for your next session?','学習を始めましょう')+'</h2><p>'+txt('Select your target, set, part of speech and direction.','学習対象・セット・品詞・出題方向を選んでください。')+'</p><button class="btn primary" data-action="startStudy">'+txt('Start session','学習開始')+'</button></div>';
 else if(!w)body='<div class="empty"><h2>'+txt('Session complete!','学習完了！')+'</h2><p>'+txt('Your review schedule is saved.','次の復習予定を記録しました。')+'</p><button class="btn primary" data-action="startStudy">'+txt('Study again','もう一度学習')+'</button></div>';
 else{
  const dir=flip(w),front=dir==='ja-en'?w.ja:w.en,back=dir==='ja-en'?w.en:w.ja;
  const frontHTML=dir==='en-ja'?'<button class="flash-term" data-action="speak" data-id="'+esc(w.id)+'">'+esc(front)+' </button>':'<h2>'+esc(front)+'</h2>';
  body='<div class="study-progress"><strong>'+(session.pos+1)+' / '+session.ids.length+'</strong><span>'+txt('Recall before revealing','答えを思い出してから表示')+'</span></div><div class="rail"><span style="width:'+(100*session.pos/session.ids.length)+'%"></span></div>'+
  '<article class="card flashcard"><div class="flash-top">'+styleKind(w)+'<span>'+esc(SET_BY_ID[w.set]?.title||'Personal')+'</span></div>'+
  '<div class="flash-stage">'+frontHTML+'<small>'+(dir==='ja-en'?txt('Say it in English','英語で言ってみましょう'):txt('What does it mean?','意味を思い出しましょう'))+'</small></div>'+
  (session.shown?'<div class="flash-answer"><div class="flash-answer-term">'+(dir==='ja-en'?'<button class="flash-answer-word" data-action="speak" data-id="'+esc(w.id)+'">'+esc(w.en)+'</button><strong>'+esc(w.ja)+'</strong>':'<strong>'+esc(back)+'</strong><button class="flash-answer-word" data-action="speak" data-id="'+esc(w.id)+'">'+esc(w.en)+'</button>')+'</div>'+
  '<button class="flash-example" data-action="speakExample" data-id="'+esc(w.id)+'">'+esc(w.example||'')+'</button><small>'+esc(w.note||'')+'</small>'+
  '<button class="detail-link" data-action="detail" data-id="'+esc(w.id)+'">'+txt('Full meanings & examples','すべての意味・例文を見る')+' →</button></div>':'')+'</article>'+
  '<div class="study-dock">'+(session.shown?'<div class="study-buttons">'+[['0',txt('Again','もう一度')],['1',txt('Hard','難しい')],['2',txt('Good','できた')],['3',txt('Easy','簡単')]].map(x=>'<button class="grade-btn grade-'+x[0]+'" data-action="grade" data-grade="'+x[0]+'"><span>'+x[1]+'</span><small>'+intervalLabel(calcInterval(w,Number(x[0])))+'</small></button>').join('')+'</div>':'<button class="btn primary wide" data-action="reveal">'+txt('Show answer','答えを見る')+'</button>')+'</div>';
 }
 return filterDetails('study')+'<div class="practice practice-study '+(session.started&&w?'has-dock':'')+'">'+body+'</div>';
}
function quizChoices(w){const c=data.quizConditions,dir=c.direction==='mixed'?(quiz.pos%2?'ja-en':'en-ja'):c.direction;const wantEn=dir==='ja-en',answer=wantEn?w.en:w.ja;const pool=shuffle(all().filter(a=>a.id!==w.id&&a.type===w.type&&a[wantEn?'en':'ja']!==answer));const selected=pool.slice(0,3);if(selected.length<3)selected.push(...shuffle(all().filter(a=>a.id!==w.id&&!selected.includes(a))).slice(0,3-selected.length));const opts=shuffle([w,...selected]).map(a=>({id:a.id,text:wantEn?a.en:a.ja}));return {opts,dir}}
function startQuizQuestion(){const w=byId(quiz.ids[quiz.pos]);if(w){const p=quizChoices(w);quiz.options=p.opts;quiz.dir=p.dir;quiz.answered=false;quiz.selected=null;if(data.prefs.autoRead&&p.dir==='en-ja')speaker(w.en)}}
function quizPage(){
 const w=byId(quiz.ids[quiz.pos]);let body='';
 if(!quiz.started)body='<div class="empty"><h2>'+txt('Four choices. One best answer.','4択で知識を確認')+'</h2><p>'+txt('Quiz history has its own review schedule.','クイズには独立した復習履歴を使用します。')+'</p><button class="btn primary" data-action="startQuiz">'+txt('Start quiz','クイズ開始')+'</button></div>';
 else if(!w)body='<div class="empty"><h2>'+txt('Quiz complete','クイズ終了')+'</h2><p>'+txt('Correct answers: ','正答数：')+quiz.correct+' / '+quiz.ids.length+'</p><button class="btn primary" data-action="startQuiz">'+txt('Try again','もう一度')+'</button></div>';
 else{
  const question=quiz.dir==='ja-en'?'<h2 class="quiz-question">'+esc(w.ja)+'</h2>':'<button class="quiz-question clickable-question tap-to-speak" data-action="speak" data-id="'+esc(w.id)+'" aria-label="Read English aloud">'+esc(w.en)+'</button>';
  const feedback=quiz.answered?'<div class="quiz-feedback"><strong>'+(quiz.selected===w.id?txt('✓ Correct!','✓ 正解！'):txt('✕ Review this expression','✕ もう一度確認'))+'</strong>'+
    '<button class="result-word tap-to-speak" data-action="speak" data-id="'+esc(w.id)+'">'+esc(w.en)+'</button>'+
    '<p>'+esc(w.ja)+'</p>'+
    (w.example?'<button class="result-example tap-to-speak" data-action="speakExample" data-id="'+esc(w.id)+'">'+esc(w.example)+'</button>':'')+
    '<div class="next-review-note"><span>'+txt('Next quiz review','次回のクイズ復習')+'</span><strong>'+intervalLabel(Number(pOf(w,'quizProgress').interval)||0)+txt(' later','後')+'</strong></div>'+
    '<button class="detail-link" data-action="detail" data-id="'+esc(w.id)+'">'+txt('Full meaning & examples','詳しい意味・例文を見る')+' →</button></div>':'';
  body='<div class="study-progress"><strong>'+txt('QUESTION ','問題 ')+(quiz.pos+1)+' / '+quiz.ids.length+'</strong><span>'+txt('Correct: ','正答：')+quiz.correct+'</span></div>'+
    '<div class="rail"><span style="width:'+(quiz.pos/quiz.ids.length*100)+'%"></span></div>'+
    '<article class="card quiz-card'+(quiz.answered?' answered':'')+'"><div class="quiz-card-top"><span>'+styleKind(w)+'</span><span>'+esc(SET_BY_ID[w.set]?.title||'Personal')+'</span></div>'+
    '<div class="quiz-prompt">'+txt('CHOOSE THE BEST ANSWER','正しい答えを選択')+'</div><div class="quiz-focus">'+question+'</div>'+feedback+'</article>'+
    '<div class="quiz-dock" role="group" aria-label="'+txt('Four choices','4つの選択肢')+'"><div class="quiz-grid">'+quiz.options.map(c=>
      '<button class="quiz-choice '+(quiz.answered?(c.id===w.id?'correct':c.id===quiz.selected?'incorrect':''):'')+'" data-action="pick" data-id="'+esc(c.id)+'" '+(quiz.answered?'disabled':'')+'>'+esc(c.text)+'</button>').join('')+'</div>'+
      (quiz.answered?'<div class="quiz-next-row"><span>'+(quiz.selected===w.id?txt('✓ Correct','✓ 正解'):txt('✕ Review','✕ 要復習'))+'</span><button class="btn primary" data-action="quizNext">'+(quiz.pos+1===quiz.ids.length?txt('View results','結果を見る'):txt('Next question','次の問題'))+' →</button></div>':'')+'</div>';
 }
 return filterDetails('quiz')+'<div class="practice practice-quiz '+(quiz.started&&w?'has-dock':'')+'">'+body+'</div>';
}
function matching(){const q=search.toLowerCase().trim();return all().filter(w=>(libFilter.set==='all'||w.set===libFilter.set)&&(libFilter.pos==='all'||w.pos===libFilter.pos)&&inTarget(w,libFilter.target)&&(!q||[w.en,w.ja,w.example,w.note,...(w.senses||[]).map(s=>s.ja)].join(' ').toLowerCase().includes(q)))}
function wordCard(w){
 const p=pOf(w),status=p.skip?txt('Excluded','学習対象外'):p.tries?mastered(w)?txt('Mastered','定着'):due(w)?txt('Due','復習予定'):txt('Learning','学習中'):txt('New','未学習');
 return '<article class="card word-card"><div class="word-card-top">'+styleKind(w)+'<span class="tag">'+esc(SET_BY_ID[w.set]?.title||'My words')+'</span></div>'+
 '<button class="term-btn" data-action="speak" data-id="'+esc(w.id)+'">'+esc(w.en)+' </button>'+
 '<strong class="ja-meaning">'+esc(w.ja)+'</strong>'+
 '<button class="example example-button" data-action="speakExample" data-id="'+esc(w.id)+'" title="Tap to hear the example">'+esc(w.example||'')+'</button>'+
 '<div class="word-footer"><span class="word-status">'+status+'</span>'+buttonsFor(w)+'</div>'+
 '<button class="detail-link" data-action="detail" data-id="'+esc(w.id)+'">'+txt('View meanings, examples & usage','意味・例文・使い方を見る')+' →</button></article>';
}
function showDetail(id){
 const w=byId(id);if(!w)return;
 modalId=id;
 const senses=(w.senses&&w.senses.length?w.senses:[{ja:w.ja,example:w.example,exampleJa:w.exampleJa||"",explain:""}]);
 const content=senses.map((se,i)=>
 '<section class="sense-card"><div class="sense-head"><span class="sense-number">'+(i+1)+'</span><strong>'+esc(se.ja||w.ja)+'</strong></div>'+
 (se.example?'<button class="sense-example" data-action="speakSense" data-id="'+esc(id)+'" data-sense="'+i+'" aria-label="Play example pronunciation"><span class="listen-glyph"></span> '+esc(se.example)+'</button>':'')+
 (se.exampleJa?'<p class="example-ja">'+esc(se.exampleJa)+'</p>':'')+
 (se.explain?'<p class="sense-explain">'+esc(se.explain)+'</p>':'')+'</section>').join("");
 $('modalLayer').innerHTML='<div class="overlay" role="presentation"><article class="modal detail-modal" role="dialog" aria-modal="true" aria-label="'+esc(w.en)+'"><div class="modal-head"><span class="kicker">'+txt('VOCABULARY DETAIL','単語・チャンク詳細')+'</span><button data-action="closeModal" aria-label="Close">✕</button></div>'+
 '<div class="detail-title"><button class="detail-word-tap" data-action="speak" data-id="'+esc(id)+'" aria-label="Read English aloud">'+esc(w.en)+'</button></div>'+
 '<div class="detail-meta">'+styleKind(w)+'<span class="tag">'+esc(SET_BY_ID[w.set]?.title||'Personal')+'</span>'+(w.level?'<span class="tag">'+esc(w.level)+'</span>':'')+'</div>'+
 '<p class="detail-intro">'+esc(w.jp||'')+'</p>'+
 '<h3 class="detail-section-heading">'+txt('Meanings & examples','意味・例文')+' <small>('+senses.length+')</small></h3>'+content+
 (w.note?'<section class="detail-usage"><h3>'+txt('Grammar & usage notes','文法・使い方のポイント')+'</h3><p>'+esc(w.note)+'</p></section>':'')+
 (w.related?.length?'<section class="detail-usage"><h3>'+txt('Related expressions & word forms','関連表現・派生語')+'</h3><div class="related-tags">'+w.related.map(r=>'<span>'+esc(r)+'</span>').join('')+'</div></section>':'')+
 '<div class="detail-foot"><button class="btn" data-action="star" data-id="'+esc(id)+'">'+(pOf(w).star?'★ '+txt('Favorited','お気に入り登録済み'):'☆ '+txt('Add favorite','お気に入りに追加'))+'</button>'+
 (w.custom?'<button class="btn" data-action="edit" data-id="'+esc(id)+'">'+txt('Edit','編集')+'</button>':'')+
 '<button class="btn primary" data-action="closeModal">'+txt('Close','閉じる')+'</button></div></article></div>';
}
function libraryList(){const found=matching();$('libraryCount').textContent=found.length+' / '+all().length;$('libraryGrid').innerHTML=found.length?found.map(wordCard).join(''):'<div class="empty">'+txt('No matching items','該当する語句がありません')+'</div>'}
function wordsPage(){return heading('VOCABULARY LIBRARY',txt('Words & natural chunks','単語・チャンク一覧'),txt('Search, favorite, exclude or add your own expressions.','検索・お気に入り登録・学習除外・自主追加ができます。'))+'<div class="library-controls"><input id="wordSearch" type="search" placeholder="'+txt('Search English, Japanese or examples','英語・日本語・例文で検索')+'" value="'+esc(search)+'"/><select data-lib="set">'+setOptions().map(x=>opt(x[0],x[1],libFilter.set)).join('')+'</select><select data-lib="pos">'+posOptions().map(x=>opt(x[0],x[1],libFilter.type)).join('')+'</select><select data-lib="target">'+targetOptions().map(x=>opt(x[0],x[1],libFilter.target)).join('')+'</select><button class="btn primary" data-action="add">＋ '+txt('Add expression','語句を追加')+'</button></div><div class="list-meta"><strong id="libraryCount"></strong><span>'+txt('Tap English to hear pronunciation','英語をタップして発音')+'</span></div><div id="libraryGrid" class="word-grid"></div>'}
function insightsPage(){const s=stats(),daily=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return {label:d.toLocaleDateString(data.prefs.ui==='ja'?'ja-JP':'en-US',{weekday:'short'}),count:(data.activity[dateKey(d.getTime())]?.reviews||0)+(data.activity[dateKey(d.getTime())]?.quiz||0)}});const max=Math.max(1,...daily.map(d=>d.count));return heading('YOUR PROGRESS',txt('Learning insights','学習記録'),txt('Independent flashcard and quiz progress.','カード学習とクイズの記録は独立しています。'))+'<div class="stats-grid">'+tile(txt('Studied','学習済み'),s.seen,'of '+s.total)+tile(txt('Review due','復習対象'),s.review,txt('cards','件'))+tile(txt('Favorites','お気に入り'),s.favorite,txt('expressions','件'))+tile(txt('Personal additions','自主追加'),s.custom,txt('expressions','件'))+'</div><div class="analytics"><article class="card report"><h2>'+txt('Last 7 days','過去7日間')+'</h2><div class="bars">'+daily.map(d=>'<div class="bar-item"><strong>'+d.count+'</strong><span style="height:'+(Math.max(5,d.count/max*130))+'px"></span><small>'+d.label+'</small></div>').join('')+'</div></article><article class="card report"><h2>'+txt('Progress by set','セット別進捗')+'</h2>'+GROUPS.map(g=>{const a=all().filter(w=>w.set===g.id),n=a.filter(w=>pOf(w).tries).length;return '<div class="progress-row"><div><span>'+g.icon+' '+g.title+'</span><b>'+n+' / '+a.length+'</b></div><div class="rail"><span style="width:'+(a.length?n/a.length*100:0)+'%"></span></div></div>'}).join('')+'</article></div>'}
function settingsPage(){
 const p=data.prefs,c=configSrs();
 const field=(name,label,opts,help='')=>'<div class="setting-row"><div><strong>'+label+'</strong>'+(help?'<small>'+help+'</small>':'')+'</div><select data-pref="'+name+'">'+opts.map(o=>opt(String(o[0]),o[1],String(p[name]))).join('')+'</select></div>';
 const sf=(name,label,help,opts)=>'<div class="setting-row"><div><strong>'+label+'</strong><small>'+help+'</small></div><select data-srs="'+name+'">'+opts.map(o=>opt(String(o[0]),o[1],String(c[name]))).join('')+'</select></div>';
 return heading('PREFERENCES',txt('Settings','設定'),txt('Review schedule, learning options and cloud sync.','忘却曲線・学習方法・クラウド同期を設定できます。'))+
 '<div class="settings-grid"><article class="card settings-panel"><h2>'+txt('General preferences','基本設定')+'</h2>'+
 field('ui',txt('Interface language','表示言語'),[['en','English'],['ja','日本語']])+
 field('daily',txt('Daily target','1日の目標'),[5,10,15,20,30,50].map(n=>[n,n+' '+txt('items','件')]))+
 field('theme',txt('Appearance','テーマ'),[['light','Light'],['dark','Dark']])+'</article>'+
 '<article class="card settings-panel"><h2>'+txt('Audio','音声')+'</h2>'+
 field('voice',txt('English accent','英語アクセント'),[['en-US','US English'],['en-GB','UK English']])+
 field('speed',txt('Speech speed','読み上げ速度'),[[.75,'0.75×'],[.9,'0.90×'],[1,'1.00×'],[1.15,'1.15×']])+
 field('autoRead',txt('Automatic answer audio','自動読み上げ'),[[true,txt('On','オン')],[false,txt('Off','オフ')]])+
 '<button class="btn" data-action="sampleAudio">'+txt('Test pronunciation','音声テスト')+'</button></article>'+
 '<article class="card settings-panel srs-panel"><h2>'+txt('Spaced repetition / forgetting curve','忘却曲線・復習間隔の設定')+'</h2>'+
 '<p>'+txt('Select a preset or adjust the detailed intervals. Changes apply only to future answers.','プリセットを選択するか、復習間隔を細かく調整してください。変更は今後の回答から適用されます。')+'</p>'+
 field('srs',txt('Review schedule','復習スケジュール'),[['standard',txt('Balanced','標準')],['intensive',txt('Intensive','集中')],['relaxed',txt('Relaxed','ゆったり')],['custom',txt('Custom','カスタム')]])+
 sf('multiplier',txt('Interval scale','復習間隔の倍率'),txt('Lower = more frequent','低いほど頻繁に復習'),[[.5,'0.5×'],[.7,'0.7×'],[.85,'0.85×'],[1,'1.0×'],[1.2,'1.2×'],[1.5,'1.5×'],[2,'2.0×']])+
 sf('againMin',txt('Again: retry after','もう一度：再学習'),txt('Minutes after a wrong answer','間違えた後の分数'),[[1,txt('1 min','1分')],[5,txt('5 min','5分')],[10,txt('10 min','10分')],[15,txt('15 min','15分')],[30,txt('30 min','30分')],[60,txt('60 min','60分')]])+
 sf('firstGood',txt('First Good answer','初回「普通」の間隔'),txt('Days until first review','初回の復習までの日数'),[[.5,txt('12 hours','12時間')],[1,txt('1 day','1日')],[2,txt('2 days','2日')],[3,txt('3 days','3日')],[5,txt('5 days','5日')],[7,txt('7 days','7日')]])+
 sf('firstEasy',txt('First Easy answer','初回「簡単」の間隔'),txt('Days until first easy review','初回簡単の復習日数'),[[1,txt('1 day','1日')],[2,txt('2 days','2日')],[3,txt('3 days','3日')],[4,txt('4 days','4日')],[5,txt('5 days','5日')],[7,txt('7 days','7日')],[10,txt('10 days','10日')],[14,txt('14 days','14日')]])+
 sf('ease',txt('Memory growth factor','記憶の伸長係数'),txt('How fast intervals increase','復習間隔の伸びる割合'),[[1.5,'1.5×'],[1.8,'1.8×'],[2,'2.0×'],[2.3,'2.3×'],[2.5,'2.5×'],[2.7,'2.7×'],[3,'3.0×']])+
 '<div class="srs-preview"><strong>'+txt('New card interval preview','新規カードの復習間隔（目安）')+'</strong><div class="srs-preview-grid">'+previewSrs()+'</div></div>'+
 '<p class="srs-note">'+txt('Adjustable SM-2-style scheduling, not a direct measurement of your memory. Existing review dates are unchanged. Quiz and flashcard progress are separate.','SM-2方式を参考にした設定で、実際の個人の忘却曲線を測定するものではありません。既存の復習予定は維持し、クイズと学習の進捗は別管理です。')+'</p></article>'+
 '<article class="card settings-panel"><h2>'+txt('Data & backup','データとバックアップ')+'</h2><p>'+txt('Save favorites, custom words and review history.','お気に入り・自主追加・履歴をバックアップします。')+'</p>'+
 '<button class="btn" data-action="export">'+txt('Export backup','バックアップ出力')+'</button><button class="btn" data-action="import">'+txt('Import backup','バックアップ復元')+'</button><input type="file" id="importFile" accept=".json,application/json" hidden/><button class="btn danger" data-action="reset">'+txt('Reset learning history','学習履歴をリセット')+'</button></article>'+
 '<details class="card settings-panel sync-panel"><summary><strong>☁ '+txt('Cloud sync · iPhone / iPad / PC','クラウド同期｜iPhone・iPad・PC')+'</strong><span id="syncStatusBrief">'+txt('Checking...','確認中')+'</span></summary><p>'+txt('The LISĀN email/password also works. The English data is kept separately.','LISĀNと同じメール・パスワードを使用できます。英語の学習データは別に保存します。')+'</p><p id="syncStatus">'+txt('Starting...','確認中...')+'</p>'+
 '<form id="syncLogin"><input type="email" id="syncEmail" placeholder="Email" required/><input type="password" id="syncPassword" placeholder="Password" required/><button type="submit" class="btn primary">'+txt('Sign in','ログイン')+'</button></form><div id="syncAuthed" hidden><strong id="syncUser"></strong><p>'+txt('Changes sync across devices after sign-in.','ログイン後は自動で端末間同期します。')+'</p><button class="btn" data-action="syncNow">'+txt('Sync now','今すぐ同期')+'</button><button class="btn" data-action="signOut">'+txt('Sign out','ログアウト')+'</button></div></details></div>';
}
function render(){
 const el=$('practiceFilters');
 if(el?.dataset?.practiceKind&&['study','quiz'].includes(el.dataset.practiceKind)){
  const k=el.dataset.practiceKind;
  if(filterOpen[k]!==!!el.open){filterOpen[k]=!!el.open;saveFilterOpen()}
 }
 document.body.dataset.theme=data.prefs.theme;document.body.classList.toggle('practice-mode',current==='study'||current==='quiz');document.documentElement.lang=data.prefs.ui==='ja'?'ja':'en';$('brandTitle').textContent='WordMate';
 const links=[['home','Home','ホーム','⌂'],['study','Study','学習','▣'],['quiz','Quiz','クイズ','✓'],['words','Library','単語一覧','▤'],['insights','Insights','記録','▥'],['settings','Settings','設定','⚙']];
 for(const id of ['sideNav','bottomNav'])$(id).innerHTML=links.filter(v=>id==='sideNav'||['home','study','quiz','words','settings'].includes(v[0])).map(v=>'<button class="'+(current===v[0]?'active':'')+'" data-action="nav" data-page="'+v[0]+'"><span class="nav-icon">'+v[3]+'</span>'+txt(v[1],v[2])+'</button>').join('');
 const link=links.find(v=>v[0]===current);if($('headerCrumb'))$('headerCrumb').textContent=link?txt(link[1],link[2]):'Home';
 const pages={home,study:studyPage,quiz:quizPage,words:wordsPage,insights:insightsPage,settings:settingsPage};$('view').innerHTML=pages[current]();
 if(current==='words')libraryList();
 if(current==='home'||current==='settings')window.LEXIS_SYNC?.render?.();
 if($('headerTotal'))$('headerTotal').textContent=all().length+' '+txt('items','語句');
}
function navigate(page){current=page;render();window.scrollTo({top:0,behavior:'instant'})}
function updateStar(id,field){const p={...pOf({id}),[field]:!pOf({id})[field],updatedAt:Date.now()};data.progress[id]=p;save();if(current==='words'){libraryList()}else render()}
function showModal(id){
 const w=id?byId(id):null;modalId=id||null;
 const additional=(w?.senses||[]).slice(1).map(se=>[se.ja,se.example,se.exampleJa||'',se.explain||''].join(' | ')).join('\n');
 const opts=posOptions().filter(o=>o[0]!=='all');
 $('modalLayer').innerHTML='<div class="overlay"><div class="modal"><div class="modal-head"><h2>'+txt(w?'Edit expression':'Add your expression',w?'語句を編集':'語句を追加')+'</h2><button data-action="closeModal" aria-label="Close">✕</button></div><form id="customForm">'+
 '<label>'+txt('Part of speech','品詞')+'<select name="pos">'+opts.map(x=>opt(x[0],x[1],w?.pos||'expression')).join('')+'</select></label>'+
 '<label>'+txt('Study set','学習セット')+'<select name="set">'+GROUPS.map(x=>opt(x.id,x.title,w?.set||'D')).join('')+'</select></label>'+
 '<label>'+txt('English','英語')+'<input required name="en" maxlength="200" value="'+esc(w?.en||'')+'"/></label>'+
 '<label>'+txt('Meaning in Japanese','意味（日本語）')+'<input required name="ja" maxlength="300" value="'+esc(w?.ja||'')+'"/></label>'+
 '<label>'+txt('Example sentence','英語例文')+'<textarea name="example" maxlength="800" rows="2">'+esc(w?.example||'')+'</textarea></label>'+
 '<label>'+txt('Japanese example translation','例文の日本語訳')+'<textarea name="exampleJa" maxlength="800" rows="2">'+esc(w?.exampleJa||w?.senses?.[0]?.exampleJa||'')+'</textarea></label>'+
 '<label>'+txt('Additional meanings (one per line)','追加の意味（1行につき1つ）')+'<textarea name="extraSenses" maxlength="5000" rows="4" placeholder="'+txt('Japanese meaning | English example | Japanese translation | usage note','意味 | 英語例文 | 日本語訳 | 使い方の補足')+'">'+esc(additional)+'</textarea></label>'+
 '<label>'+txt('Grammar & usage notes','文法・使い方のポイント')+'<textarea name="note" maxlength="1000" rows="2">'+esc(w?.note||'')+'</textarea></label>'+
 '<div class="modal-actions">'+(w?'<button type="button" class="btn danger" data-action="deleteCustom" data-id="'+esc(w.id)+'">'+txt('Delete','削除')+'</button>':'')+'<button type="submit" class="btn primary">'+txt('Save expression','保存する')+'</button></div></form></div></div>';
 $('customForm').querySelector('[name="en"]')?.focus();
}
function closeModal(){$('modalLayer').innerHTML='';modalId=null}
function saveCustom(form){
 const fd=new FormData(form),en=String(fd.get('en')||'').trim(),ja=String(fd.get('ja')||'').trim();
 if(!en||!ja)return;
 if(all().some(w=>w.en.toLowerCase()===en.toLowerCase()&&w.id!==modalId)){notify(txt('This expression already exists.','同じ表現が登録されています。'));return}
 const id=modalId||'custom-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),pos=String(fd.get('pos')||'expression'),example=String(fd.get('example')||'').trim(),exampleJa=String(fd.get('exampleJa')||'').trim();
 const senses=[{ja,example,exampleJa,explain:''}];
 for(const line of String(fd.get('extraSenses')||'').split('\n').filter(s=>s.trim())){
  const parts=line.split('|').map(s=>s.trim());
  if(parts[0])senses.push({ja:parts[0],example:parts[1]||'',exampleJa:parts[2]||'',explain:parts[3]||''});
 }
 const prior=data.customWords[id]||{};
 data.customWords[id]={...prior,id,en,ja,pos,type:pos==='expression'||pos==='phrasal-verb'?'C':'W',set:fd.get('set'),example,exampleJa,senses,note:String(fd.get('note')||'').trim(),custom:true,updatedAt:Date.now()};
 save();closeModal();render();notify(txt('Expression saved.','語句を保存しました。'));
}
function exportData(){const blob=new Blob([JSON.stringify({app:'WordMate',exportedAt:new Date().toISOString(),data},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='wordmate-backup-'+dateKey()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),800)}
function importData(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result);if(!['LEXIS English Studio','WordMate'].includes(x.app)||!x.data||x.data.version!==1)throw Error('Invalid WordMate backup');if(!confirm(txt('Replace local English study data with this backup?','このバックアップで英語学習データを置き換えますか？')))return;const old=data;data={...clone(DEFAULT),...x.data,prefs:{...DEFAULT.prefs,...x.data.prefs}};try{localStorage.setItem(KEY,JSON.stringify(data));save();render();notify(txt('Backup imported.','バックアップを復元しました。'))}catch(e){data=old;throw e}}catch(e){alert(txt('Could not import: ','読み込めませんでした：')+e.message)}};reader.readAsText(file)}
document.addEventListener('click',e=>{const btn=e.target.closest('button[data-action]');if(!btn)return;const a=btn.dataset.action,id=btn.dataset.id,w=id&&byId(id);if(a==='nav')return navigate(btn.dataset.page);if(a==='openSet'){libFilter.set=btn.dataset.set;return navigate('words')}if(a==='openType'){libFilter.target=btn.dataset.type==='C'?'chunks':'words';return navigate('words')}if(a==='star'||a==='skip'){updateStar(id,a==='star'?'star':'skip');if(modalId===id&&$('modalLayer').innerHTML.includes('detail-modal'))showDetail(id);return}if(a==='speak'&&w)return speaker(w.en);if(a==='speakExample'&&w)return speaker(w.example||w.en);if(a==='speakSense'&&w)return speaker(w.senses?.[Number(btn.dataset.sense)]?.example||w.example||w.en);if(a==='detail')return showDetail(id);if(a==='startStudy'){session={ids:chooseItems('study'),pos:0,shown:false,started:true};return render()}if(a==='reveal'){session.shown=true;if(data.prefs.autoRead){const item=byId(session.ids[session.pos]);if(item)speaker(item.en)}return render()}if(a==='grade'){const item=byId(session.ids[session.pos]);if(item)gradeItem(item,Number(btn.dataset.grade));session.pos++;session.shown=false;return render()}if(a==='startQuiz'){quiz={ids:chooseItems('quiz'),pos:0,answered:false,selected:null,options:[],correct:0,started:true};startQuizQuestion();return render()}if(a==='pick'&&!quiz.answered){const item=byId(quiz.ids[quiz.pos]);quiz.answered=true;quiz.selected=id;if(item){if(item.id===id)quiz.correct++;gradeItem(item,item.id===id?2:0,'quizProgress')}render();if(item&&data.prefs.autoRead)speaker(item.en);return}if(a==='quizNext'){quiz.pos++;startQuizQuestion();return render()}if(a==='add')return showModal();if(a==='edit')return showModal(id);if(a==='closeModal')return closeModal();if(a==='deleteCustom'&&w?.custom){if(confirm(txt('Delete this expression?','この語句を削除しますか？'))){data.customWords[id]={...w,deleted:true,updatedAt:Date.now()};save();closeModal();render()}return}if(a==='sampleAudio')return speaker('The production is coming along, but we are slightly behind schedule.');if(a==='export')return exportData();if(a==='import')return $('importFile')?.click();if(a==='reset'){if(confirm(txt('Reset all review progress and favorites? Your personal expressions will remain.','学習履歴とお気に入りを初期化しますか？自主追加語句は残ります。'))){data.progress={};data.quizProgress={};data.activity={};save();render()}return}if(a==='syncNow')return window.LEXIS_SYNC?.syncNow?.();if(a==='signOut')return window.LEXIS_SYNC?.signOut?.()});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.config){data[el.dataset.config+'Conditions'][el.dataset.field]=el.value;data[el.dataset.config+'Conditions'].updatedAt=Date.now();session.started=false;quiz.started=false;save();render();return}if(el.dataset.lib){libFilter[el.dataset.lib]=el.value;libraryList();return}if(el.dataset.srs){
 const k=el.dataset.srs,v=Number(el.value);if(!SRS_LIMITS[k]||!Number.isFinite(v))return;
 const config={...configSrs(),[k]:clampNum(v,...SRS_LIMITS[k])};if(config.firstEasy<config.firstGood)config.firstEasy=config.firstGood;
 data.prefs.srsConfig=config;data.prefs.srs='custom';data.prefs.prefsUpdatedAt=Date.now();save();render();return
}
if(el.dataset.pref){const v=el.value;data.prefs[el.dataset.pref]=el.dataset.pref==='daily'?Number(v):el.dataset.pref==='autoRead'?v==='true':el.dataset.pref==='speed'?Number(v):v;if(el.dataset.pref==='srs'&&SRS_PRESETS[v])data.prefs.srsConfig={...SRS_PRESETS[v]};data.prefs.prefsUpdatedAt=Date.now();save();render();return}if(el.id==='importFile')return importData(el.files[0])});
document.addEventListener('toggle',e=>{const v=e.target;if(v?.id==='practiceFilters'&&['study','quiz'].includes(v.dataset?.practiceKind)){filterOpen[v.dataset.practiceKind]=!!v.open;saveFilterOpen()}},true);
document.addEventListener('input',e=>{if(e.target.id==='wordSearch'){search=e.target.value;libraryList()}});
document.addEventListener('submit',e=>{if(e.target.id==='customForm'){e.preventDefault();saveCustom(e.target)}else if(e.target.id==='syncLogin'){e.preventDefault();window.LEXIS_SYNC?.signIn?.($('syncEmail').value,$('syncPassword').value)}});
render();
window.LEXIS_APP={getData:()=>data,setData:d=>{data={...clone(DEFAULT),...d,prefs:{...DEFAULT.prefs,...d.prefs},studyConditions:{...DEFAULT.studyConditions,...d.studyConditions},quizConditions:{...DEFAULT.quizConditions,...d.quizConditions}};normalizeCustom(data);try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){};render()},notify,render,KEY};
