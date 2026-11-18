'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import type {Dancer} from '@/components/live-games/RapDanceStage';
import './rap-dance.css';
const Stage=dynamic(()=>import('@/components/live-games/RapDanceStage'),{ssr:false,loading:()=> <div className="rap-loading">3D sahne hazırlanıyor…</div>});
type Gender='female'|'male';
type LiveState={dancers:Dancer[];bpm:number;viewerCount:number;last:string};
const initial:LiveState={dancers:[],bpm:104,viewerCount:0,last:'Yayına hazır'};
const storeKey='ds-rap-dance-preview-v1';
const validPhoto=(v:unknown)=>{if(typeof v!=='string'||v.length>1600)return undefined;try{const url=new URL(v);return url.protocol==='https:'?url.toString():undefined}catch{return undefined}};
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
function parseLive(input:unknown){
 const msg=obj(input),data=obj(msg.data),user=obj(data.user),event=String(msg.event||'').toLowerCase();
 const name=String(data.uniqueId||user.uniqueId||data.nickname||user.nickname||'').trim().slice(0,32);
 const avatar=validPhoto(data.profilePictureUrl||user.profilePictureUrl||data.avatarUrl||user.avatarUrl);
 const comment=String(data.comment||'').trim().toLocaleLowerCase('tr');
 const gender:Gender|undefined=['kadın','kadin'].includes(comment)?'female':comment==='erkek'?'male':undefined;
 const viewers=Number(data.viewerCount??data.viewer_count??data.roomUserCount);
 if(event==='roomuser'&&Number.isFinite(viewers)&&viewers>=0)return {type:'viewers' as const,count:Math.min(100000,Math.floor(viewers))};
 if(!name)return null;
 if(event==='chat'&&gender)return {type:'join' as const,name,gender,avatar};
 if(event==='gift'){
  if(data.repeatEnd===false||data.repeatEnd===0)return null;
  const amount=Math.max(1,Math.min(100000,Number(data.diamondCount||data.repeatCount||1)||1));
  return {type:'gift' as const,name,amount,avatar};
 }
 return null;
}
export default function RapDanceLive(){
 const [state,setState]=useState<LiveState>(initial);
 const [overlay,setOverlay]=useState(false),[auto,setAuto]=useState(false),[name,setName]=useState('YeniIzleyici'),[gender,setGender]=useState<Gender>('female');
 const [connection,setConnection]=useState<'offline'|'connecting'|'connected'|'error'>('offline'),[musicName,setMusicName]=useState('Müzik seçilmedi'),[musicPlaying,setMusicPlaying]=useState(false);
 const [copyLabel,setCopyLabel]=useState('OBS bağlantısını kopyala');
 const audioRef=useRef<HTMLAudioElement|null>(null),audioUrl=useRef<string|null>(null),socketRef=useRef<WebSocket|null>(null),stateRef=useRef(state),channelRef=useRef<BroadcastChannel|null>(null),seenGift=useRef(new Set<string>());
 useEffect(()=>{stateRef.current=state},[state]);
 useEffect(()=>{
  setOverlay(new URLSearchParams(location.search).has('overlay'));
  try{const stored=localStorage.getItem(storeKey);if(stored){const parsed=JSON.parse(stored);if(parsed&&Array.isArray(parsed.dancers)&&Number.isFinite(parsed.bpm))setState(parsed)}}catch{}
  if(typeof BroadcastChannel!=='undefined'){const c=new BroadcastChannel(storeKey);channelRef.current=c;c.onmessage=e=>{if(e.data&&Array.isArray(e.data.dancers))setState(e.data)};}
  const onStorage=(event:StorageEvent)=>{if(event.key===storeKey&&event.newValue)try{const x=JSON.parse(event.newValue);if(Array.isArray(x.dancers))setState(x)}catch{}};
  window.addEventListener('storage',onStorage);return()=>{channelRef.current?.close();window.removeEventListener('storage',onStorage);socketRef.current?.close();if(audioUrl.current)URL.revokeObjectURL(audioUrl.current)};
 },[]);
 const save=useCallback((next:LiveState)=>{stateRef.current=next;setState(next);try{localStorage.setItem(storeKey,JSON.stringify(next));channelRef.current?.postMessage(next)}catch{}},[]);
 const add=useCallback((raw:string,g:Gender,avatar?:string)=>{const s=stateRef.current,n=raw.trim().slice(0,32);if(!n)return;const existing=s.dancers.findIndex(x=>x.name.toLocaleLowerCase('tr')===n.toLocaleLowerCase('tr'));const dancers=[...s.dancers];if(existing<0)dancers.push({id:crypto.randomUUID(),name:n,gender:g,avatar,gifts:0,joined:Date.now()});else dancers[existing]={...dancers[existing],gender:g,avatar:avatar||dancers[existing].avatar};save({...s,dancers:dancers.slice(-150),viewerCount:Math.max(s.viewerCount,dancers.length),last:n+' piste katıldı'});},[save]);
 const gift=useCallback((raw:string,amount=1,avatar?:string)=>{const s=stateRef.current,n=raw.trim().slice(0,32);if(!n)return;const dancers=[...s.dancers],i=dancers.findIndex(x=>x.name.toLocaleLowerCase('tr')===n.toLocaleLowerCase('tr'));if(i<0)return;dancers[i]={...dancers[i],gifts:dancers[i].gifts+amount,avatar:avatar||dancers[i].avatar};save({...s,dancers,last:n+' +'+amount+' hediye puanı'});},[save]);
 const addRef=useRef(add),giftRef=useRef(gift);addRef.current=add;giftRef.current=gift;
 const connect=()=>{
  if(socketRef.current){socketRef.current.close();socketRef.current=null;setConnection('offline');return;}
  setConnection('connecting');
  try{const ws=new WebSocket('ws://localhost:21213/');socketRef.current=ws;
   ws.onopen=()=>setConnection('connected');
   ws.onmessage=message=>{try{const raw=JSON.parse(message.data),v=parseLive(raw);if(!v)return;if(v.type==='viewers'){const s=stateRef.current;save({...s,viewerCount:v.count});return;}if(v.type==='join')addRef.current(v.name,v.gender,v.avatar);if(v.type==='gift'){const data=obj(obj(raw).data);const id=String(data.transactionId||data.msgId||data.eventId||'');if(id){if(seenGift.current.has(id))return;seenGift.current.add(id);if(seenGift.current.size>1000)seenGift.current.clear();}giftRef.current(v.name,v.amount,v.avatar);}}catch{}};
   ws.onerror=()=>setConnection('error');ws.onclose=()=>{if(socketRef.current===ws){socketRef.current=null;setConnection('offline')}};
  }catch{setConnection('error')}
 };
 useEffect(()=>{if(!auto||overlay)return;const names=['Mira','Efe','Dilan','Baran','Rojin','Aras','Deniz','Lara','Kuzey','Zara'];let i=0;const timer=setInterval(()=>{const n=names[i%names.length];addRef.current(n,i%2?'male':'female');if(i>2&&i%2===0)giftRef.current(n,1+Math.floor(Math.random()*4));i++;},1900);return()=>clearInterval(timer)},[auto,overlay]);
 const sorted=useMemo(()=>[...state.dancers].sort((a,b)=>b.gifts-a.gifts||a.joined-b.joined),[state.dancers]);
 const cap=Math.min(35,Math.max(5,Math.ceil(Math.max(state.viewerCount,state.dancers.length)/5)*5));
 const displayed=sorted.slice(0,cap);
 const selectMusic=(file:File|undefined)=>{if(!file||!file.type.startsWith('audio/'))return;if(audioUrl.current)URL.revokeObjectURL(audioUrl.current);audioUrl.current=URL.createObjectURL(file);if(audioRef.current){audioRef.current.src=audioUrl.current;audioRef.current.load();setMusicPlaying(false)}setMusicName(file.name.slice(0,75));};
 const toggleMusic=async()=>{const a=audioRef.current;if(!a||!a.src)return;if(a.paused){try{await a.play();setMusicPlaying(true)}catch{setMusicPlaying(false)}}else{a.pause();setMusicPlaying(false)}};
 const overlayURL=typeof window!=='undefined'?window.location.origin+'/rap-dance?overlay=1':'';
 return <main className={'rap-app '+(overlay?'rap-overlay':'')}>
   {!overlay&&<header className="rap-header"><div><small>DUBLE-S MOTION · TIKTOK LIVE GAMES</small><h1>RAP DANCE LIVE <span>STUDIO</span></h1><p>Gerçek iskeletli 3D dansçılar · İlk 5 ön sırada · Yayıncı müzik kontrolü</p></div><div className="rap-status"><i className={connection==='connected'?'on':''}/>{connection==='connected'?'TIKFINITY BAĞLI':'ÖNİZLEME / DEMO'}</div></header>}
   <div className="rap-layout"><section className="rap-main"><div className="rap-stage"><Stage dancers={displayed} bpm={state.bpm}/><div className="rap-stage-head"><strong>RAP DANCE LIVE</strong><span>TOP 5 CREW</span></div><div className="rap-stage-bottom"><span>👥 {state.viewerCount} izleyici · {state.dancers.length} katılımcı</span><span>{state.last}</span></div></div>
   {!overlay&&<div className="rap-controls"><div className="rap-controls-grid"><div><h2>İzleyici katılım testi</h2><input value={name} maxLength={32} onChange={e=>setName(e.target.value)} placeholder="İzleyici adı"/><select value={gender} onChange={e=>setGender(e.target.value as Gender)}><option value="female">Kadın</option><option value="male">Erkek</option></select><button onClick={()=>add(name,gender)}>Piste katıl</button><button onClick={()=>gift(name,5)}>+5 demo hediye</button><button onClick={()=>setAuto(v=>!v)}>{auto?'Demo akışını durdur':'Demo akışını başlat'}</button></div><div><h2>Yayıncının müziği</h2><label className="rap-file">MP3 / WAV seç<input type="file" accept="audio/*" onChange={e=>selectMusic(e.target.files?.[0])}/></label><span className="rap-music-name">{musicName}</span><button onClick={toggleMusic} disabled={musicName==='Müzik seçilmedi'}>{musicPlaying?'Müziği durdur':'Müziği çal'}</button><label className="rap-bpm">Dans temposu · {state.bpm} BPM<input type="range" min="75" max="155" value={state.bpm} onChange={e=>save({...stateRef.current,bpm:Number(e.target.value)})}/></label><small>Ses yayın bilgisayarında çalınır; TikTok'a gitmesi için yayın yazılımında ses yakalama gerekir. Telif haklarına uygun müzik kullanın.</small></div></div></div>}
   </section>
   {!overlay&&<aside className="rap-aside"><div className="rap-panel"><h2>Canlı bağlantı</h2><p>Yerel TikFinity Desktop uygulaması aynı bilgisayarda çalışmalıdır. Gerçek yorum ve hediye bağlantısı henüz yayın testinden geçmedi.</p><button onClick={connect}>{connection==='connected'?'Bağlantıyı kes':'TikFinity Desktop’a bağlan'}</button><div className="rap-help">Kadın / erkek yorumu piste katılır. Hediyeler ilk beş sırasını değiştirir.</div></div><div className="rap-panel"><h2>OBS yayın ekranı</h2><button onClick={async()=>{try{await navigator.clipboard.writeText(overlayURL);setCopyLabel('Kopyalandı')}catch{setCopyLabel('Kopyalanamadı')}}}>{copyLabel}</button><button onClick={()=>window.open(overlayURL,'_blank','noopener,noreferrer')}>Yayın ekranını aç</button><small>Aynı cihaz ve tarayıcı kökenindeki ekranlar eşitlenir. Ayrı cihazlar için sunucu odası gerekir.</small></div><div className="rap-panel"><h2>🏆 Hediye liderleri</h2>{sorted.slice(0,5).map((d,i)=><div className="rap-leader" key={d.id}><span>{i+1}. {d.name}</span><b>🎁 {d.gifts}</b></div>)}{!sorted.length&&<p>İlk katılımcı bekleniyor.</p>}<button onClick={()=>{setAuto(false);save(initial)}}>Oyunu sıfırla</button></div></aside>}
   {overlay&&<div className="rap-overlay-board">🏆 TOP 5 {sorted.slice(0,5).map((d,i)=><div key={d.id}><span>{i+1}. {d.name}</span><b>🎁 {d.gifts}</b></div>)}</div>}</div>
   <audio ref={audioRef} preload="none" loop onPause={()=>setMusicPlaying(false)} onPlay={()=>setMusicPlaying(true)}/>
  </main>;
}
