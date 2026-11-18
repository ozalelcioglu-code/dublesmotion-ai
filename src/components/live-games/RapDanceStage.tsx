'use client';
import React,{Suspense,useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {Html,Text,ContactShadows,Stars,useGLTF} from '@react-three/drei';
import {SkeletonUtils} from 'three-stdlib';
import * as THREE from 'three';

export type Dancer={id:string;name:string;gender:'female'|'male';avatar?:string;gifts:number;joined:number};
const MODEL='https://cdn.jsdelivr.net/gh/mrdoob/three.js@r180/examples/models/gltf/Michelle.glb';
const palettes=['#f25ca2','#49ceff','#dba1ff','#ffd56a','#65ebc1','#ff8460'];
const demoNames=['Mira','Aras','Dilan','Deniz','Rojin'];
function FaceTag({d,featured}:{d:Dancer;featured:boolean}){
 return <Html transform={false} center position={[0,2.75,0]} style={{pointerEvents:'none',whiteSpace:'nowrap'}}>
  <div style={{display:'flex',gap:5,alignItems:'center',background:featured?'rgba(22,24,52,.95)':'rgba(8,13,29,.9)',border:'1px solid '+(featured?'#ffcf64':'#6584ac'),color:'#fff',borderRadius:26,padding:'4px 7px',font:'700 11px system-ui',boxShadow:'0 4px 15px #0009'}}>
   {d.avatar&&/^https:\/\//.test(d.avatar)?<img src={d.avatar} alt="" referrerPolicy="no-referrer" style={{width:22,height:22,borderRadius:'50%',objectFit:'cover'}}/>:<span style={{width:22,height:22,borderRadius:'50%',background:'#4767a6',display:'grid',placeItems:'center'}}>{d.name.slice(0,1).toUpperCase()}</span>}
   <span>{d.name.slice(0,19)}</span>{featured?<b style={{color:'#ffd16d'}}>🎁 {d.gifts}</b>:null}
  </div>
 </Html>;
}
function Performer({d,index,front,bpm}:{d:Dancer;index:number;front:boolean;bpm:number}){
 const gltf=useGLTF(MODEL);
 const rig=useMemo(()=>SkeletonUtils.clone(gltf.scene) as THREE.Group,[gltf.scene]);
 const mixer=useMemo(()=>new THREE.AnimationMixer(rig),[rig]);
 const group=useRef<THREE.Group>(null);
 useEffect(()=>{
   const clip=gltf.animations.find(x=>x.name.toLowerCase().includes('dance'))||gltf.animations[0];
   if(!clip)return;
   const action=mixer.clipAction(clip);action.setLoop(THREE.LoopRepeat,Infinity);action.play();
   return ()=>{action.stop();mixer.stopAllAction();};
 },[gltf.animations,mixer]);
 useEffect(()=>{
   rig.traverse(obj=>{if((obj as THREE.Mesh).isMesh){(obj as THREE.Mesh).castShadow=true;}});
 },[rig]);
 const rankX=front?(-2.5+index*1.25):((index%8)-3.5)*1.25;
 const rankZ=front?2.4:-.45-Math.floor(index/8)*1.5;
 useFrame((state,dt)=>{
   const beat=Math.max(.55,Math.min(2.2,bpm/105));
   mixer.timeScale=front?beat:beat*.84;
   mixer.update(dt);
   if(group.current){
     const target=new THREE.Vector3(rankX,0,rankZ);
     group.current.position.lerp(target,Math.min(1,dt*3.3));
     group.current.rotation.y=Math.sin(state.clock.elapsedTime*.35+index*.5)*.08;
   }
 });
 // Michelle is a real skinned, animated human sample. It is a dance test asset, NOT a custom rap choreography.
 return <group ref={group} position={[rankX,0,rankZ]}>
   <group scale={[1.13,1.13,1.13]} rotation={[0,0,0]}><primitive object={rig}/></group>
   <FaceTag d={d} featured={front}/>
   {front&&<pointLight position={[0,2.6,.7]} intensity={5} distance={3.8} color={palettes[index%palettes.length]}/>}
 </group>;
}
function StageWorld({dancers,bpm}:{dancers:Dancer[];bpm:number}){
 const sorted=[...dancers].sort((a,b)=>b.gifts-a.gifts||a.joined-b.joined);
 const front=sorted.slice(0,5),back=sorted.slice(5,35);
 return <>
  <color attach="background" args={['#070918']}/><fog attach="fog" args={['#0b0c24',14,40]}/>
  <ambientLight intensity={.9}/><hemisphereLight args={['#baccf9','#231a3a',.8]}/>
  <spotLight castShadow position={[-7,10,5]} intensity={95} color="#8d5bfd" angle={.51} penumbra={.85}/>
  <spotLight position={[7,9,6]} intensity={78} color="#20c8ff" angle={.5} penumbra={.85}/>
  <pointLight position={[0,7,-4]} intensity={44} color="#f74399" distance={17}/>
  <Stars count={280} radius={55} depth={22} factor={2.8} fade/>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[90,80]}/><meshStandardMaterial color="#141b30" metalness={.34} roughness={.37}/></mesh>
  <mesh position={[0,-.12,.4]} receiveShadow><boxGeometry args={[16,.24,10.2]}/><meshStandardMaterial color="#1c2240" metalness={.7} roughness={.23}/></mesh>
  {Array.from({length:12},(_,i)=><mesh key={i} position={[-7.2+i*1.3,.035,4.92]}><boxGeometry args={[.92,.035,.14]}/><meshBasicMaterial color={i%2?'#1cddf6':'#eb56ff'}/></mesh>)}
  {Array.from({length:14},(_,i)=><mesh key={i} position={[-7+i*1.08,2.5,-4.75]}><boxGeometry args={[.52,4.7,.15]}/><meshStandardMaterial emissive={i%2?'#672fbd':'#138fa9'} emissiveIntensity={2} color="#11152b"/></mesh>)}
  {[-1,1].map(s=><group key={s} position={[s*7.2,2.8,-3.5]}>
    <mesh><boxGeometry args={[.55,5.6,.6]}/><meshStandardMaterial color="#40516e" metalness={.8}/></mesh>
    <pointLight position={[0,2,1]} color={s===-1?'#f543a7':'#2ceaff'} intensity={33} distance={11}/>
   </group>)}
  <Text position={[0,5.6,-4.5]} fontSize={.85} color="#fff" outlineWidth={.035} outlineColor="#9a30d8">RAP DANCE LIVE</Text>
  <Text position={[0,4.95,-4.5]} fontSize={.23} color="#64d7f9">DUBLE-S MOTION · TOP 5 CREW</Text>
  {front.map((d,i)=><Performer key={d.id} d={d} index={i} front bpm={bpm}/>)}
  {back.map((d,i)=><Performer key={d.id} d={d} index={i} front={false} bpm={bpm}/>)}
  <ContactShadows position={[0,.01,0]} scale={22} opacity={.34} blur={2.2}/>
 </>;
}
function StageFallback(){return <Html center><div style={{color:'white',background:'#0f1633dd',padding:18,borderRadius:12,whiteSpace:'nowrap'}}>3D karakterler yükleniyor…</div></Html>;}
export default function RapDanceStage({dancers,bpm}:{dancers:Dancer[];bpm:number}){
 const entries:Dancer[]=dancers.length?dancers:demoNames.map((name,i):Dancer=>({id:'demo-'+i,name,gender:i%2?'male':'female',gifts:5-i,joined:i}));
 return <Canvas shadows dpr={[1,1.7]} camera={{position:[0,4,16],fov:42}} gl={{antialias:true,powerPreference:'high-performance'}} style={{height:'100%',width:'100%'}}>
  <Suspense fallback={<StageFallback/>}><StageWorld dancers={entries} bpm={bpm}/></Suspense>
 </Canvas>;
}
