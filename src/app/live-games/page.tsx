'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {Gamepad2,Radio,Users,Gift,Heart,Play,MonitorPlay,RotateCcw,Mountain,Music2,CarFront} from 'lucide-react';
import type {GameType,Player,GameEvent} from '@/lib/live-games/game';
import {starterNames} from '@/lib/live-games/game';
import {normalizeTikFinity} from '@/lib/live-games/tikfinity';
import './style.css';
const Stage=dynamic(()=>import('@/components/live-games/Stage'),{ssr:false,loading:()=> <div className="loading">3D sahne hazırlanıyor…</div>});
type State={game:GameType;players:Player[];events:GameEvent[];burst:number;startedAt:number|null};
const initial:State={game:'halay',players:[],events:[],burst:0,startedAt:null};
const storageKey='dubles-live-games-v2';
const titles:Record<GameType,string>={halay:'HALAY PARTY 3D',mountain:'MOUNTAIN RACE 3D',race:'ŞEHİR YARIŞI'};
export default function LiveGames(){
 const [state,setState]=useState<State>(initial),[overlay,setOverlay]=useState(false),[auto,setAuto]=useState(false),[name,setName]=useState('Yeniİzleyici'),[now,setNow]=useState(0),[copyStatus,setCopyStatus]=useState('');
 const stateRef=useRef(state);
 const socket=useRef<WebSocket|null>(null);
 const seen=useRef(new Set<string>());
 const onLiveEvent=useRef<(kind:GameEvent['kind'],name:string)=>void>(()=>{});
 const [connection,setConnection]=useState<'offline'|'connecting'|'connected'|'error'>('offline');
 const [liveEvents,setLiveEvents]=useState(0);
 useEffect(()=>{stateRef.current=state},[state]);
 // Browser-only settings cannot be read during server rendering.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{setNow(Date.now());setOverlay(new URLSearchParams(window.location.search).get('overlay')==='1');try{const s=localStorage.getItem(storageKey);if(s){const parsed=JSON.parse(s);if(['halay','mountain','race'].includes(parsed.game)&&Array.isArray(parsed.players)&&Array.isArray(parsed.events))setState(parsed);}}catch{}
  const receive=(e:StorageEvent)=>{if(e.key===storageKey&&e.newValue)try{setState(JSON.parse(e.newValue))}catch{}};window.addEventListener('storage',receive);return()=>window.removeEventListener('storage',receive);
 },[]);
 const update=useCallback((next:State)=>{stateRef.current=next;setState(next);try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{}},[]);
 const emit=useCallback((kind:GameEvent['kind'],raw:string)=>{const s=stateRef.current;if(s.game==='race'&&s.startedAt&&Date.now()-s.startedAt>=300000)return;const name=raw.trim().slice(0,32)||'İzleyici',index=s.players.findIndex(p=>p.name.toLocaleLowerCase('tr')===name.toLocaleLowerCase('tr'));const at=Date.now();let players=s.players;
  if(index<0)players=[...players,{id:crypto.randomUUID(),name,team:players.length%2,power:kind==='gift'?(s.game==='race'?1:3):s.game==='race'?0:1,joinedAt:at}];
  else if(kind==='gift'||s.game!=='race')players=players.map((p,i)=>i!==index?p:{...p,power:p.power+(kind==='gift'?(s.game==='race'?1:3):kind==='like'?1:.5)});
  const event:GameEvent={id:crypto.randomUUID(),kind,name,at};update({...s,players,events:[event,...s.events].slice(0,14),startedAt:s.startedAt??at,burst:s.burst+(kind==='gift'?1:0)});
 },[update]);
 onLiveEvent.current=emit;
 const connectTikFinity=()=>{
  if(socket.current){socket.current.close();socket.current=null;setConnection('offline');return;}
  if(overlay)return;
  setConnection('connecting');
  try{
   const ws=new WebSocket('ws://localhost:21213/');
   socket.current=ws;
   ws.onopen=()=>setConnection('connected');
   ws.onmessage=(message)=>{
    try{const event=normalizeTikFinity(JSON.parse(message.data));if(!event)return;
     if(event.key){if(seen.current.has(event.key))return;seen.current.add(event.key);if(seen.current.size>500)seen.current.clear();}
     onLiveEvent.current(event.kind,event.name);setLiveEvents(c=>c+1);
    }catch{/* Ignore malformed or unrelated provider messages. */}
   };
   ws.onerror=()=>setConnection('error');
   ws.onclose=()=>{if(socket.current===ws){socket.current=null;setConnection('offline');}};
  }catch{setConnection('error');}
 };
 useEffect(()=>()=>{socket.current?.close();socket.current=null;},[]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(!auto)return;const timer=setInterval(()=>emit(Math.random()>.78?'gift':'join',starterNames[Math.floor(Math.random()*starterNames.length)]),1800);return()=>clearInterval(timer)},[auto,emit]);
 const top=useMemo(()=>[...state.players].sort((a,b)=>b.power-a.power||a.joinedAt-b.joinedAt).slice(0,10),[state.players]);
 const left=state.startedAt?Math.max(0,300000-(now-state.startedAt)):300000;const seconds=Math.ceil(left/1000);const time=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
 const switchGame=(game:GameType)=>{setAuto(false);update({...initial,game})};
 const showOverlay=async()=>{const url=window.location.origin+'/live-games?overlay=1';try{await navigator.clipboard.writeText(url);setCopyStatus('Yayın ekranı bağlantısı kopyalandı.')}catch{setCopyStatus('Bağlantı kopyalanamadı; adres: '+url)}window.open(url,'_blank','noopener,noreferrer')};
 return <main className={overlay?'app overlay':'app'}>
 {!overlay&&<aside className="sidebar"><div className="brand"><div className="brandIcon">DS</div><div><strong>DUBLE-S</strong><span>LIVE GAMES</span></div></div><p className="sectionlabel">CREATOR STUDIO</p><div className="nav active"><Gamepad2 size={19}/> Oyun Stüdyosu</div><div className="nav"><Radio size={19}/> Canlı bağlantı · yakında</div><div className="sidebarBottom"><span className="pulse"/> Önizleme · demo verileri <small>3D Game Studio</small></div></aside>}
 <section className="workspace"><header className="header"><div><span className="eyebrow">DUBLE-S MOTION / LIVE GAMES</span><h1>{overlay?'CANLI OYUN EKRANI':'LIVE GAME STUDIO'}</h1>{!overlay&&<p>Üç farklı oyun dünyası · TikFinity Desktop ile isteğe bağlı yerel LIVE olay bağlantısı</p>}</div>{!overlay&&<div className="headerActions"><span className="status"><span className={connection==='connected'?'led':'led grey'}/> {connection==='connected'?'TIKFINITY BAĞLI':'DEMO'}</span><button className="ghost" onClick={showOverlay}><MonitorPlay size={16}/> Yayın ekranı</button></div>}</header>
 <div className="content"><div className="maincol">{!overlay&&<div className="gameswitch"><button className={state.game==='halay'?'chosen':''} onClick={()=>switchGame('halay')}><Music2 size={18}/> Halay Party</button><button className={state.game==='mountain'?'chosen':''} onClick={()=>switchGame('mountain')}><Mountain size={18}/> Dağ Yarışı</button><button className={state.game==='race'?'chosen':''} onClick={()=>switchGame('race')}><CarFront size={18}/> Şehir Yarışı</button></div>}
 <div className="stageFrame"><div className="stage"><Stage game={state.game} players={state.players} burst={state.burst}/></div><div className="stagelabel"><span className="liveDot"/> {connection==='connected'?'YEREL LIVE BAĞLANTI':'DEMO'} · {titles[state.game]}</div><div className="stagehud"><strong>{state.game==='race'?time:state.players.length}</strong><span>{state.game==='race'?'KALAN SÜRE':'KATILIMCI'}</span></div><div className="stagecaption">{state.game==='race'?'5 dakikalık şehir yarışı · Hediye sayısıyla konvoyda öne geç':state.game==='halay'?'Ritmi yakala, halaya katıl!':'Zirveye ilk ulaşan kim olacak?'}</div></div>
 {!overlay&&<div className="controls"><div className="controlsHeader"><h2>Test Kontrol Merkezi</h2><span>Gerçek yayın gerektirmez</span></div><div className="inputRow"><input value={name} onChange={e=>setName(e.target.value)} maxLength={32} aria-label="İzleyici adı" placeholder="İzleyici adı"/><button onClick={()=>emit('join',name)}><Users size={17}/> Katıl</button><button onClick={()=>emit('like',name)}><Heart size={17}/> Beğeni</button><button className="pink" onClick={()=>emit('gift',name)}><Gift size={17}/> Demo hediye</button></div><div className="secondRow"><button className={auto?'toggled':''} onClick={()=>setAuto(v=>!v)}><Play size={16}/>{auto?'Simülasyonu durdur':'Otomatik simülasyon'}</button><button onClick={()=>{setAuto(false);update({...initial,game:state.game})}}><RotateCcw size={16}/> Sıfırla</button></div><p role="status">{copyStatus}</p></div>}</div>
 {!overlay&&<div className="rightcol"><section className="panel"><div className="panelheading"><h3>TikTok LIVE bağlantısı</h3><span className={connection==='connected'?'tag good':'tag'}>{connection==='connected'?'BAĞLI':connection==='connecting'?'BAĞLANIYOR':connection==='error'?'HATA':'DEMO'}</span></div><p>TikFinity Desktop aynı yayın bilgisayarında açık olmalı. Bağlanınca yorumdaki “katıl”, beğeni ve hediye etkinlikleri oyuna aktarılır.</p><div className="endpoint">ws://localhost:21213/</div><button className="connect" onClick={connectTikFinity} disabled={connection==='connecting'}>{connection==='connected'?'Bağlantıyı kes':'TikFinity Desktop’a bağlan'}</button><div className="note">Alınan olay: {liveEvents} · Yerel bağlantı önizlemesi. Tarayıcı güvenlik ayarları bağlantıyı engelleyebilir. OBS ekranı aynı tarayıcı kökenindeki demo verilerini okur; farklı cihazlarda güvenilir senkronizasyon henüz yoktur.</div></section><section className="panel"><div className="panelheading"><h3>🏆 Sıralama</h3><span className="tag">DEMO</span></div>{top.length===0?<div className="empty">Henüz oyuncu yok.</div>:top.map((p,i)=><div className="leader" key={p.id}><span className="rank">#{i+1}</span><strong>{p.name}</strong><span>{p.power} {state.game==='race'?'🎁':'puan'}</span></div>)}</section><div className="disclaimer">{state.game==='race'&&state.players.length>18?`İlk 18 araç sahnede gösteriliyor; toplam ${state.players.length} yarışçı sıralanıyor. `:''}Önizleme simülasyonudur; gerçek TikTok hediyesi veya ödeme içermez.</div></div>}
 {overlay&&<div className="overlayScore"><b>🏆 DEMO SIRALAMA</b>{top.slice(0,4).map((p,i)=><div key={p.id}><span>{i+1}. {p.name}</span><strong>{p.power}</strong></div>)}</div>}
 </div></section></main>;
}
