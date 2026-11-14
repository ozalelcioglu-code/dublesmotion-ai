'use client';
import { useEffect, useState } from 'react';
import './live-games.css';
import CinematicScene from './CinematicScene';

type Game = 'halay' | 'mountain';
type Player = { name: string; power: number };
type State = { game: Game; players: Player[]; lastEvent: string };
const starter: State = { game:'halay',players:[],lastEvent:'Oyun başlatılmayı bekliyor' };
const channelName='dubles-motion-live-games-preview-v1';

export default function LiveGamesPage() {
  const [state,setState]=useState<State>(starter);
  const [nickname,setNickname]=useState('Misafir');
  const [overlay,setOverlay]=useState(false);
  useEffect(() => {
    const params=new URLSearchParams(window.location.search);
    setOverlay(params.get('overlay')==='1');
    try { const saved=localStorage.getItem(channelName);if(saved)setState(JSON.parse(saved) as State); }catch{}
    const channel=new BroadcastChannel(channelName);
    channel.onmessage=e=>{if(e.data && Array.isArray(e.data.players))setState(e.data as State);};
    return ()=>channel.close();
  },[]);
  const update=(next:State)=>{
    setState(next);
    try {localStorage.setItem(channelName,JSON.stringify(next));const ch=new BroadcastChannel(channelName);ch.postMessage(next);ch.close();}catch{}
  };
  const event=(type:'join'|'like'|'gift')=>{
    const name=nickname.trim().slice(0,26)||'Misafir';
    const list=[...state.players];
    const index=list.findIndex(p=>p.name.toLowerCase()===name.toLowerCase());
    const bonus=type==='gift'?4:type==='like'?2:1;
    if(index<0)list.push({name,power:bonus});else list[index]={...list[index],power:Math.min(25,list[index].power+bonus)};
    update({...state,players:list.slice(-12),lastEvent:name+' · '+(type==='join'?'katıldı':type==='gift'?'demo hediyesi':'beğeni')});
  };
  const top=[...state.players].sort((a,b)=>b.power-a.power).slice(0,5);
  const overlayUrl=typeof window==='undefined'?'':window.location.origin+'/live-games?overlay=1';
  return <main className={'lg-shell '+(overlay?'lg-overlay':'')}>
    {!overlay&&<div className="lg-header"><div><div className="lg-eyebrow">DUBLE-S MOTION AI · LIVE GAMES</div><h1>Cinematic LIVE Game Studio</h1><p>Gerçek zamanlı WebGL ortamları · TikTok bağlantısı kapalı · Test olayları</p></div><span className="lg-tag">CINEMATIC PREVIEW v0.5</span></div>}
    {!overlay&&<div className="lg-toolbar"><button onClick={()=>update({...state,game:'halay'})} className={state.game==='halay'?'lg-selected':''}>🎶 Halay Party</button><button onClick={()=>update({...state,game:'mountain'})} className={state.game==='mountain'?'lg-selected':''}>🏔️ Mountain Race</button><button onClick={()=>update({...starter,game:state.game})}>↻ Sıfırla</button></div>}
    <div className="lg-columns"><section className="lg-game">
      <CinematicScene game={state.game}/><div className="lg-sky"/><div className="lg-spot lg-spot-left"/><div className="lg-spot lg-spot-right"/>
      {state.game==='halay'?<><div className="lg-banner">HALAY PARTY 3D</div><div className="lg-floor"/><div className="lg-actors">{(state.players.length?state.players:[{name:'Duble-S',power:4},{name:'LIVE',power:3},{name:'GAMES',power:4}]).slice(-8).map((p,i)=><div key={p.name+i} className="lg-dancer" style={{animationDelay:(i*.14)+'s'}}><div className="lg-name">{p.name}</div><div className="lg-head"/><div className="lg-torso" style={{background:['#f34ea5','#1ddad4','#a779fe','#ffc44e'][i%4]}}/><div className="lg-arms"/><div className="lg-legs"/></div>)}</div></>:<>
      <div className="lg-banner">MOUNTAIN RACE 3D</div><div className="lg-mountain lg-mountain-back"/><div className="lg-mountain"/><div className="lg-flag">🚩</div><div className="lg-climbers">{(state.players.length?state.players:[{name:'Duble-S',power:6},{name:'LIVE',power:4},{name:'GAMES',power:2}]).slice(-8).map((p,i)=><div className="lg-climber" key={p.name+i} style={{left:(12+i*10)+'%',bottom:(16+p.power*2.1)+'%'}}><span>{p.name}</span><b>🧗</b></div>)}</div></>}
      <div className="lg-hud"><span>DEMO</span><span>{state.players.length} izleyici</span></div>
    </section><aside className="lg-sidebar">
      {!overlay&&<section className="lg-card"><h2>Test kontrol merkezi</h2><p>Gerçek TikTok hediyesi veya ödeme kullanılmaz.</p><input maxLength={26} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="İzleyici adı"/><div className="lg-actions"><button onClick={()=>event('join')}>Katıl</button><button onClick={()=>event('like')}>♡ Beğen</button><button onClick={()=>event('gift')}>✦ Demo hediye</button></div><button className="lg-copy" onClick={()=>navigator.clipboard.writeText(overlayUrl)}>OBS önizleme URL'sini kopyala</button><small>OBS ekranı aynı tarayıcı kökenindeki oturum verilerini kullanır. Üretim için sunucu senkronizasyonu gerekir.</small></section>}
      <section className="lg-card"><h2>🏆 Canlı sıralama</h2>{top.length?top.map((p,i)=><div className="lg-leader" key={p.name}><span>{i+1}. {p.name}</span><strong>{p.power}</strong></div>):<p>Henüz katılımcı yok.</p>}<div className="lg-last">{state.lastEvent}</div></section>
    </aside></div>
    {!overlay&&<footer className="lg-footer">Duble-S LIVE Games · WebGL2 sinematik ortam önizlemesi. Canlı TikTok, çoklu yayıncı aboneliği ve kalıcı Neon oturumları henüz etkin değil.</footer>}
  </main>;
}
