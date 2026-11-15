'use client';
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Text, Stars, Sky, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { Player } from '@/lib/live-games/game';

const COLORS=['#e94b63','#18b8e0','#f6bd4c','#8855dc','#e8ebef','#0e151c','#31bb86','#dc7a31'];
const modes=['GT Coupe','Hypercar','Grand Tourer','Roadster','Sport Sedan','Super SUV'];

function Badge({player,small=false}:{player:Player;small?:boolean}) {
 const image=player.avatarUrl&&/^https:\/\//i.test(player.avatarUrl)?player.avatarUrl:undefined;
 return <Html transform={false} center position={[0,small?2.1:2.8,0]} distanceFactor={12} style={{pointerEvents:'none'}}>
  <div style={{display:'flex',gap:5,alignItems:'center',padding:'4px 8px',borderRadius:22,background:'rgba(5,14,26,.88)',border:'1px solid rgba(255,255,255,.42)',color:'#fff',whiteSpace:'nowrap',font:'700 12px system-ui',boxShadow:'0 4px 18px #000a'}}>
    {image?<img src={image} alt="" referrerPolicy="no-referrer" style={{height:24,width:24,borderRadius:'50%',objectFit:'cover'}}/>:<span style={{display:'grid',placeItems:'center',height:24,width:24,borderRadius:'50%',background:'#445b9b'}}>{player.name.slice(0,1).toUpperCase()}</span>}
    <span>{player.name.slice(0,22)}</span>
  </div>
 </Html>;
}
function Block({x,z,size=5,height=8,seed=0}:{x:number;z:number;size?:number;height?:number;seed?:number}) {
 const windowColor=seed%2?'#eecfa8':'#a7e9ff';
 return <group position={[x,0,z]}>
  <mesh position={[0,height/2,0]} castShadow receiveShadow>
   <boxGeometry args={[size,height,size]}/><meshStandardMaterial color={seed%3?'#243a50':'#394c65'} metalness={.34} roughness={.58}/>
  </mesh>
  {Array.from({length:Math.min(12,Math.floor(height/1.1))},(_,i)=><React.Fragment key={i}>
    <mesh position={[0,1+i*1.1,size/2+.013]}>
      <boxGeometry args={[size*.72,.28,.023]}/><meshBasicMaterial color={windowColor} transparent opacity={i%3===0?.45:.78}/>
    </mesh>
    <mesh position={[size/2+.013,1+i*1.1,0]} rotation={[0,Math.PI/2,0]}>
      <boxGeometry args={[size*.72,.28,.023]}/><meshBasicMaterial color={windowColor} transparent opacity={.55}/>
    </mesh>
   </React.Fragment>)}
  <mesh position={[0,height+.13,0]}><boxGeometry args={[size+.35,.25,size+.35]}/><meshStandardMaterial color="#111c2d" roughness={.65}/></mesh>
 </group>;
}
function CityWorld({players}:{players:Player[]}) {
 const path=useMemo(()=>new THREE.CatmullRomCurve3([
  new THREE.Vector3(-15,.06,-17),new THREE.Vector3(-6,.06,-21),new THREE.Vector3(11,.06,-19),
  new THREE.Vector3(20,.06,-12),new THREE.Vector3(21,.06,4),new THREE.Vector3(16,.06,18),
  new THREE.Vector3(4,.06,22),new THREE.Vector3(-14,.06,19),new THREE.Vector3(-22,.06,8),new THREE.Vector3(-20,.06,-7)
 ],true,'catmullrom',.35),[]);
 const roadSegments=useMemo(()=>Array.from({length:180},(_,i)=>{
  const a=path.getPointAt(i/180),b=path.getPointAt((i+1)/180);
  return {point:a.clone().add(b).multiplyScalar(.5),angle:Math.atan2(b.x-a.x,b.z-a.z),length:a.distanceTo(b)};
 }),[path]);
 const sorted=useMemo(()=>[...players].sort((a,b)=>b.power-a.power||a.joinedAt-b.joinedAt).slice(0,12),[players]);
 return <Canvas shadows dpr={[1,1.8]} gl={{antialias:true,powerPreference:'high-performance'}} camera={{position:[3,14,30],fov:52}}>
  <color attach="background" args={['#091829']}/><fog attach="fog" args={['#142a3b',27,87]}/>
  <ambientLight intensity={.65}/><hemisphereLight args={['#bad8f9','#303748',1.45]}/>
  <directionalLight castShadow position={[14,28,-8]} intensity={2.4} color="#ffdbb3" shadow-mapSize={[1024,1024]}/>
  <pointLight position={[0,15,0]} color="#64c9fe" intensity={90} distance={70}/>
  <Stars count={550} radius={100} factor={3} fade/>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[110,110]}/><meshStandardMaterial color="#172a39" roughness={.95}/></mesh>
  {roadSegments.map((s,i)=><group key={i} position={s.point} rotation={[0,s.angle,0]}>
    <mesh receiveShadow><boxGeometry args={[8,.06,s.length+.05]}/><meshStandardMaterial color="#151b27" metalness={.08} roughness={.8}/></mesh>
    {i%5===0&&<mesh position={[0,.04,0]}><boxGeometry args={[.13,.025,Math.max(.12,s.length*.85)]}/><meshBasicMaterial color="#ffdc91"/></mesh>}
    <mesh position={[-3.92,.04,0]}><boxGeometry args={[.12,.03,s.length+.06]}/><meshBasicMaterial color="#d6e0e4"/></mesh>
    <mesh position={[3.92,.04,0]}><boxGeometry args={[.12,.03,s.length+.06]}/><meshBasicMaterial color="#d6e0e4"/></mesh>
   </group>)}
  {Array.from({length:10},(_,i)=>[-1,1].map(side=><Block key={side+'-'+i} x={side*(28+(i%3)*5)} z={-28+i*6.2} size={3.5+(i%3)} height={5+(i*13%17)} seed={i+side}/>))}
  {Array.from({length:5},(_,i)=>[-1,1].map(side=><Block key={'d'+side+'-'+i} x={-23+i*10} z={side*30} size={4} height={5+(i*7%19)} seed={i+8}/>))}
  {sorted.map((p,i)=><MovingCar key={p.id} player={p} index={i} path={path} leader={i===0}/>)}
  <CityDirector path={path} leader={sorted[0]} index={0}/>
 </Canvas>;
}
function MovingCar({player,index,path,leader}:{player:Player;index:number;path:THREE.CatmullRomCurve3;leader:boolean}) {
 const group=useRef<THREE.Group>(null),wheels=useRef<THREE.Group[]>([]);
 const color=COLORS[index%COLORS.length],shape=index%modes.length;
 useFrame(({clock})=>{
  if(!group.current)return;
  const speed=.0065+Math.min(player.power,35)*.00009;
  const fraction=((clock.elapsedTime*speed+index*.037)%1+1)%1;
  const point=path.getPointAt(fraction),tangent=path.getTangentAt(fraction);
  const lane=(index%3-1)*1.9;
  const normal=new THREE.Vector3(-tangent.z,0,tangent.x);
  group.current.position.copy(point).addScaledVector(normal,lane);
  group.current.position.y=.42;
  group.current.rotation.y=Math.atan2(tangent.x,tangent.z);
  for(const wheel of wheels.current)if(wheel)wheel.rotation.x=-clock.elapsedTime*(3+player.power*.06);
 });
 return <group ref={group}>
   <mesh position={[0,.28,0]} castShadow><boxGeometry args={[1.65,.43,3.35+(shape%2)*.35]}/><meshStandardMaterial color={color} metalness={.86} roughness={.19}/></mesh>
   <mesh position={[0,.78,-.12]} castShadow><boxGeometry args={[1.35,.53,1.65]}/><meshPhysicalMaterial color={shape%2?'#293343':'#151d2c'} metalness={.6} roughness={.08} clearcoat={1}/></mesh>
   <mesh position={[0,.54,-1.72]}><boxGeometry args={[1.28,.1,.1]}/><meshBasicMaterial color="#fff7d2"/></mesh>
   <mesh position={[0,.5,1.72]}><boxGeometry args={[1.22,.1,.1]}/><meshBasicMaterial color="#ee274b"/></mesh>
   {[-1,1].flatMap(side=>[-1.05,1.05].map((z,j)=><group key={side+'-'+j} ref={node=>{if(node)wheels.current[(side+1)*1+j]=node}} position={[side*.87,.0,z]} rotation={[0,0,Math.PI/2]}>
      <mesh castShadow><cylinderGeometry args={[.37,.37,.18,18]}/><meshStandardMaterial color="#0c0f17" roughness={.92}/></mesh>
      <mesh position={[0,.095,0]}><cylinderGeometry args={[.19,.19,.01,12]}/><meshStandardMaterial color="#b8c2ce" metalness={.8}/></mesh>
    </group>))}
   <Badge player={player}/>
   {leader&&<pointLight position={[0,1.1,0]} color={color} intensity={8} distance={5}/>}
 </group>;
}
function CityDirector({path,leader,index}:{path:THREE.CatmullRomCurve3;leader?:Player;index:number}){
 const {camera}=useThree();
 useFrame(({clock},dt)=>{
  if(!leader){camera.position.lerp(new THREE.Vector3(0,28,42),Math.min(1,dt*.55));camera.lookAt(0,0,0);return;}
  const f=(clock.elapsedTime*(.0065+Math.min(leader.power,35)*.00009)+index*.037)%1;
  const pos=path.getPointAt(f),tan=path.getTangentAt(f);
  const follow=pos.clone().addScaledVector(tan,-11).add(new THREE.Vector3(5,7,5));
  camera.position.lerp(follow,Math.min(1,dt*.85));
  camera.lookAt(pos.x,pos.y+.9,pos.z);
 });
 return null;
}
function KaabaStructure(){
 return <group>
   <mesh position={[0,4.3,0]} castShadow receiveShadow><boxGeometry args={[10,8.6,11.2]}/><meshStandardMaterial color="#101014" roughness={.7} metalness={.02}/></mesh>
   <mesh position={[0,7.26,0]}><boxGeometry args={[10.05,.82,11.25]}/><meshStandardMaterial color="#b8954d" metalness={.75} roughness={.28}/></mesh>
   <mesh position={[0,7.27,0]}><boxGeometry args={[10.14,.39,11.34]}/><meshStandardMaterial color="#1a1412" metalness={.3} roughness={.55}/></mesh>
   {[-4.85,4.85].map(x=><mesh key={x} position={[x,7.22,0]}><boxGeometry args={[.12,.28,11.3]}/><meshStandardMaterial color="#d4b268" metalness={.8}/></mesh>)}
   <mesh position={[0,3.13,5.64]}><boxGeometry args={[2.1,4.2,.085]}/><meshStandardMaterial color="#cca455" metalness={.8} roughness={.26}/></mesh>
   <mesh position={[0,1.2,5.7]}><boxGeometry args={[1.7,2.4,.09]}/><meshStandardMaterial color="#8c6429" metalness={.65} roughness={.3}/></mesh>
   <mesh position={[0,0,0]}><boxGeometry args={[10.4,.27,11.6]}/><meshStandardMaterial color="#d4d0c8" roughness={.9}/></mesh>
 </group>;
}
function Pilgrim({player,index,total}:{player:Player;index:number;total:number}) {
 const ref=useRef<THREE.Group>(null),armL=useRef<THREE.Group>(null),armR=useRef<THREE.Group>(null);
 const isWoman=player.gender==='female';
 useFrame(({clock})=>{
  if(!ref.current)return;
  // The orbit is counterclockwise as viewed from above, with the Kaaba to the pilgrim's left.
  const t=-clock.elapsedTime*.15 -index*2*Math.PI/Math.max(total,1);
  const radius=8.8+(index%4)*1.2;
  ref.current.position.set(Math.cos(t)*radius,.12+Math.abs(Math.sin(clock.elapsedTime*5+index))*.03,Math.sin(t)*radius);
  const tx=-Math.sin(t),tz=Math.cos(t);ref.current.rotation.y=Math.atan2(tx,tz);
  if(armL.current)armL.current.rotation.x=Math.sin(clock.elapsedTime*5+index)*.3;
  if(armR.current)armR.current.rotation.x=-Math.sin(clock.elapsedTime*5+index)*.3;
 });
 return <group ref={ref}>
   {isWoman?<mesh position={[0,1.05,0]} castShadow><cylinderGeometry args={[.31,.48,1.65,12]}/><meshStandardMaterial color={index%3===0?'#e8e4e0':'#29303b'} roughness={.9}/></mesh>:
     <mesh position={[0,.99,0]} castShadow><cylinderGeometry args={[.34,.43,1.54,12]}/><meshStandardMaterial color="#f4f1e9" roughness={.94}/></mesh>}
   <mesh position={[0,2.04,0]} castShadow><sphereGeometry args={[.22,16,12]}/><meshStandardMaterial color="#bd8e6b" roughness={.95}/></mesh>
   {isWoman&&<mesh position={[0,2.02,-.055]}><sphereGeometry args={[.265,16,12]}/><meshStandardMaterial color={index%3===0?'#e8e4e0':'#29303b'} roughness={.94}/></mesh>}
   {[-1,1].map((side)=><group key={side} ref={side===-1?armL:armR} position={[side*.37,1.47,0]}>
      <mesh position={[0,-.37,0]}><capsuleGeometry args={[.11,.58,6,10]}/><meshStandardMaterial color={isWoman?(index%3===0?'#e8e4e0':'#29303b'):'#f3f0e7'} roughness={.9}/></mesh>
    </group>)}
   <Badge player={player} small/>
 </group>;
}
function TawafWorld({players}:{players:Player[]}) {
 const visible=players.slice(0,32);
 return <Canvas shadows dpr={[1,1.85]} gl={{antialias:true,powerPreference:'high-performance'}} camera={{position:[19,18,22],fov:48}}>
   <color attach="background" args={['#e6dccb']}/><fog attach="fog" args={['#dfd6c7',35,100]}/>
   <ambientLight intensity={1.1}/><hemisphereLight args={['#e8ebff','#9b9388',1.4]}/>
   <directionalLight position={[14,28,8]} intensity={2.9} castShadow shadow-mapSize={[2048,2048]} color="#ffe9c6"/>
   <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[120,120]}/><meshStandardMaterial color="#d8d3ca" metalness={.08} roughness={.53}/></mesh>
   {Array.from({length:3},(_,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,.014,0]}>
      <ringGeometry args={[7.3+i*3.6,7.36+i*3.6,96]}/><meshBasicMaterial color="#b5a99b" transparent opacity={.35} depthWrite={false}/>
    </mesh>)}
   {Array.from({length:32},(_,i)=>{
    const a=i*2*Math.PI/32,r=43;
    return <group key={i} position={[Math.cos(a)*r,0,Math.sin(a)*r]}>
      <mesh position={[0,5,0]}><cylinderGeometry args={[.68,.78,10,16]}/><meshStandardMaterial color="#e5ddcc" roughness={.9}/></mesh>
      <mesh position={[0,10.2,0]}><sphereGeometry args={[1.1,12,10]}/><meshStandardMaterial color="#f0e5d4"/></mesh>
     </group>})}
   <KaabaStructure/>
   {visible.map((p,i)=><Pilgrim key={p.id} player={p} index={i} total={visible.length}/>)}
   <Text position={[0,12.1,0]} rotation={[0,Math.PI/4,0]} fontSize={1.25} color="#292f38" outlineWidth={.025} outlineColor="#f7f3ea">TAVAF • 7 TUR</Text>
   <ContactShadows position={[0,.06,0]} opacity={.24} scale={38} blur={2.8}/>
 </Canvas>;
}
export {CityWorld,TawafWorld};
