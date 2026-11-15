'use client';
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float, Sparkles, Stars, Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { GameType, Player } from '@/lib/live-games/game';

function CrowdGlow({ color = '#7c5cff' }: { color?: string }) {
  return (
    <>
      <pointLight position={[0, 2.5, 3]} color={color} intensity={10} distance={11} />
      <pointLight position={[0, 0.8, -3]} color="#29d7ff" intensity={5} distance={10} />
    </>
  );
}

function RiggedDancer({ index, name, power }: { index: number; name: string; power: number }) {
  const root = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Mesh>(null);
  const colors = ['#ff4f9b', '#22d7ff', '#ffbe54', '#a97dff', '#40efb2', '#ff784a'];
  const cloth = colors[index % colors.length];
  const offset = index - 4;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const beat = t * 3.6 + index * 0.44;
    if (!root.current) return;

    root.current.position.set(offset * 0.9, 0.12 + Math.abs(Math.sin(beat)) * 0.14, Math.sin(index * 0.42) * 0.22);
    root.current.rotation.y = Math.sin(t * 0.7 + index * 0.3) * 0.18;
    root.current.rotation.z = Math.sin(beat) * 0.05;

    if (torso.current) {
      torso.current.rotation.z = Math.sin(beat) * 0.12;
      torso.current.rotation.x = Math.cos(beat * 0.5) * 0.04;
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 1.1 + index) * 0.2;
      head.current.rotation.x = Math.cos(t * 0.8 + index) * 0.06;
    }
    if (leftArm.current) {
      leftArm.current.rotation.z = -0.95 + Math.sin(beat + Math.PI * 0.1) * 0.35;
      leftArm.current.rotation.x = Math.cos(beat) * 0.15;
    }
    if (rightArm.current) {
      rightArm.current.rotation.z = 0.95 + Math.sin(beat + Math.PI) * 0.35;
      rightArm.current.rotation.x = -Math.cos(beat) * 0.15;
    }
    if (leftLeg.current) {
      leftLeg.current.rotation.x = Math.sin(beat) * 0.55;
      leftLeg.current.rotation.z = -0.08;
    }
    if (rightLeg.current) {
      rightLeg.current.rotation.x = Math.sin(beat + Math.PI) * 0.55;
      rightLeg.current.rotation.z = 0.08;
    }
  });

  return (
    <group ref={root}>
      <group ref={leftLeg} position={[-0.14, 0.54, 0]}>
        <mesh castShadow position={[0, -0.28, 0]}>
          <capsuleGeometry args={[0.09, 0.5, 6, 10]} />
          <meshStandardMaterial color="#151b2f" roughness={0.68} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.14, 0.54, 0]}>
        <mesh castShadow position={[0, -0.28, 0]}>
          <capsuleGeometry args={[0.09, 0.5, 6, 10]} />
          <meshStandardMaterial color="#151b2f" roughness={0.68} />
        </mesh>
      </group>

      <mesh ref={torso} castShadow position={[0, 1.2, 0]}>
        <capsuleGeometry args={[0.24, 0.72, 7, 14]} />
        <meshStandardMaterial color={cloth} metalness={0.22} roughness={0.35} emissive={cloth} emissiveIntensity={power > 3 ? 0.12 : 0.04} />
      </mesh>

      <group ref={leftArm} position={[-0.32, 1.42, 0]}>
        <mesh castShadow position={[0, -0.25, 0]}>
          <capsuleGeometry args={[0.07, 0.5, 6, 10]} />
          <meshStandardMaterial color="#efbc98" roughness={0.8} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.32, 1.42, 0]}>
        <mesh castShadow position={[0, -0.25, 0]}>
          <capsuleGeometry args={[0.07, 0.5, 6, 10]} />
          <meshStandardMaterial color="#efbc98" roughness={0.8} />
        </mesh>
      </group>

      <mesh ref={head} castShadow position={[0, 1.86, 0.03]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color="#f1c6a4" roughness={0.72} />
      </mesh>
      <mesh castShadow position={[0, 2.04, -0.02]}>
        <sphereGeometry args={[0.18, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshStandardMaterial color="#22192c" roughness={0.95} />
      </mesh>

      <Text position={[0, 2.34, 0]} fontSize={0.15} color="#ffffff" outlineWidth={0.008} outlineColor="#090b14" anchorX="center">
        {name}
      </Text>
      {power > 4 && <CrowdGlow color={cloth} />}
    </group>
  );
}

function HalayArena({ players, burst }: { players: Player[]; burst: number }) {
  const visible = players.slice(-10);
  return (
    <>
      <fog attach="fog" args={['#0f0b1f', 8, 24]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#9dd1ff", "#2d1639", 0.75]} />
      <spotLight position={[-6, 8, 5]} color="#ae59ff" intensity={95} angle={0.5} penumbra={1} castShadow />
      <spotLight position={[6, 8, 3]} color="#29d7ff" intensity={90} angle={0.52} penumbra={1} castShadow />
      <pointLight position={[0, 5, -4]} color="#ff5aa0" intensity={16} distance={18} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#101524" metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <cylinderGeometry args={[5.6, 5.9, 0.18, 64]} />
        <meshStandardMaterial color="#241e43" metalness={0.65} roughness={0.18} emissive="#141228" emissiveIntensity={0.25} />
      </mesh>
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={i} position={[-4.8 + i * 0.57, 0.01, 2.58]}>
          <boxGeometry args={[0.38, 0.03, 0.16]} />
          <meshStandardMaterial color={i % 2 ? '#31d7ff' : '#ff59ac'} emissive={i % 2 ? '#31d7ff' : '#ff59ac'} emissiveIntensity={1.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.12, -2.9]}>
        <boxGeometry args={[6.5, 0.25, 0.35]} />
        <meshStandardMaterial color="#100f1f" emissive="#281847" emissiveIntensity={0.7} />
      </mesh>

      {visible.map((p, i) => (
        <RiggedDancer key={p.id} index={i} name={p.name} power={p.power} />
      ))}

      <Float speed={1.4} floatIntensity={0.35} rotationIntensity={0.12}>
        <Text position={[0, 3.65, -2.7]} fontSize={0.62} color="#ffffff" outlineWidth={0.02} outlineColor="#631ca6">
          HALAY PARTY
        </Text>
      </Float>
      <Sparkles key={burst} count={burst ? 140 : 52} scale={[12, 5, 8]} size={burst ? 5.5 : 2.1} speed={1.5} color="#ffd37d" />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.38} blur={2.5} scale={13} />
    </>
  );
}

function CityCar({ player, index }: { player: Player; index: number }) {
  const vehicle=useRef<THREE.Group>(null);
  const texture=useTexture('/live-games/supercar.png');
  const narrow=useThree(s=>s.size.width<600);
  useFrame(({clock})=>{if(vehicle.current)vehicle.current.position.y=0.18+Math.sin(clock.elapsedTime*4+index)*0.025;});
  const x=(index%3-1)*(narrow?1.05:2.25), z=4-Math.floor(index/3)*2.35;
  return <group ref={vehicle} position={[x,.18,z]}>
    <mesh position={[0,.55,0]}><planeGeometry args={narrow?[1.35,.66]:[2.35,1.15]}/><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false}/></mesh>
    <Text position={[0,1.18,0]} fontSize={.19} color="white" outlineWidth={.014} outlineColor="#07111d" anchorX="center">{player.name}</Text>
  </group>;
}

function CityRace({players}:{players:Player[]}){
  const leaders=[...players].sort((a,b)=>b.power-a.power||a.joinedAt-b.joinedAt).slice(0,18);
  const skyline=useTexture('/live-games/city-race.png');
  return <>
    <color attach="background" args={['#07101f']}/><fog attach="fog" args={['#081528',15,45]}/>
    <ambientLight intensity={1.05}/><hemisphereLight args={["#a7d8ff", "#1a2230", 1.1]}/>
    <directionalLight position={[3,9,5]} intensity={2.4} color="#c2d8ff"/><pointLight position={[-5,5,0]} color="#fa42a0" intensity={35} distance={18}/><pointLight position={[5,5,-7]} color="#55ddff" intensity={45} distance={20}/>
    <mesh position={[0,6,-20]}><planeGeometry args={[40,22]}/><meshBasicMaterial map={skyline} toneMapped={false}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.07,-7]}><planeGeometry args={[10,45]}/><meshStandardMaterial color="#192534" roughness={.7} metalness={.2}/></mesh>
    {[-1.12,1.12].flatMap(x=>Array.from({length:14},(_,i)=><mesh key={`${x}-${i}`} position={[x,.004,7-i*2.8]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.06,1.5]}/><meshBasicMaterial color="#d7edf6"/></mesh>))}
    {[-1,1].flatMap(side=>Array.from({length:10},(_,i)=>{const height=2.8+(i*7%6)*.6;return <group key={`${side}-${i}`} position={[side*(7+(i%2)),height/2,-i*3.7+6]}><mesh><boxGeometry args={[2.5,height,2.4]}/><meshStandardMaterial color={i%2?'#16283c':'#1c3045'} roughness={.8}/></mesh>{Array.from({length:3},(_,j)=><mesh key={j} position={[0,height*.25-j*.5,1.21]}><boxGeometry args={[1.5,.08,.03]}/><meshBasicMaterial color={i%2?'#ff8aba':'#80e7ff'}/></mesh>)}</group>}))}
    {leaders.map((p,i)=><CityCar key={p.id} player={p} index={i}/>)}
    <Text position={[0,4.6,-10]} fontSize={.65} color="#bdfaff" outlineWidth={.02} outlineColor="#163569">CANLI PİST</Text>
  </>;
}

function RockWall() {
  const geom = useMemo(() => {
    const geometry = new THREE.BoxGeometry(9.5, 9.6, 2.8, 16, 22, 8);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const noise = Math.sin(x * 1.3) * 0.14 + Math.cos(y * 1.1) * 0.1 + Math.sin((x + y + z) * 1.7) * 0.08;
      pos.setXYZ(i, x + noise * 0.6, y + noise, z + noise * 0.35);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  return (
    <mesh geometry={geom} position={[0, 2.5, -2.4]} receiveShadow castShadow>
      <meshStandardMaterial color="#304c71" roughness={0.96} metalness={0.02} />
    </mesh>
  );
}

function RiggedClimber({ player, index, total }: { player: Player; index: number; total: number }) {
  const root = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const sway = useMemo(() => (index - (total - 1) / 2) * 0.75, [index, total]);
  const colors = ['#f95095', '#31d7ff', '#ffcb66', '#b496ff', '#40efb2'];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 2.8 + index * 0.6;
    const climb = Math.min(player.power * 0.2, 4.7);
    if (!root.current) return;
    root.current.position.set(sway, 0.75 + climb + Math.sin(t) * 0.05, 1.05 + Math.cos(t * 0.7) * 0.08);
    root.current.rotation.z = Math.sin(t * 0.5) * 0.03;
    root.current.rotation.y = Math.sin(t * 0.3) * 0.12;
    if (leftArm.current) leftArm.current.rotation.x = -1.1 + Math.sin(t) * 0.55;
    if (rightArm.current) rightArm.current.rotation.x = -1.1 + Math.sin(t + Math.PI) * 0.55;
    if (leftLeg.current) leftLeg.current.rotation.x = 0.65 + Math.sin(t + Math.PI) * 0.45;
    if (rightLeg.current) rightLeg.current.rotation.x = 0.65 + Math.sin(t) * 0.45;
  });

  return (
    <group ref={root}>
      <mesh castShadow position={[0, 1.08, 0]}>
        <capsuleGeometry args={[0.18, 0.55, 6, 12]} />
        <meshStandardMaterial color={colors[index % colors.length]} metalness={0.18} roughness={0.42} emissive={colors[index % colors.length]} emissiveIntensity={0.06} />
      </mesh>
      <mesh castShadow position={[0, 1.55, 0.05]}>
        <sphereGeometry args={[0.18, 22, 22]} />
        <meshStandardMaterial color="#f1c39d" roughness={0.75} />
      </mesh>
      <group ref={leftArm} position={[-0.22, 1.28, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.055, 0.42, 6, 10]} />
          <meshStandardMaterial color="#efbc98" roughness={0.8} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.22, 1.28, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.055, 0.42, 6, 10]} />
          <meshStandardMaterial color="#efbc98" roughness={0.8} />
        </mesh>
      </group>
      <group ref={leftLeg} position={[-0.1, 0.8, 0]}>
        <mesh castShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.07, 0.42, 6, 10]} />
          <meshStandardMaterial color="#1a2037" roughness={0.7} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.1, 0.8, 0]}>
        <mesh castShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.07, 0.42, 6, 10]} />
          <meshStandardMaterial color="#1a2037" roughness={0.7} />
        </mesh>
      </group>
      <Text position={[0, 1.9, 0]} fontSize={0.14} color="#ffffff" outlineWidth={0.008} outlineColor="#0b0f18" anchorX="center">
        {player.name}
      </Text>
    </group>
  );
}

function MountainArena({ players, burst }: { players: Player[]; burst: number }) {
  const visible = players.slice(-8);
  return (
    <>
      <color attach="background" args={['#06111d']} />
      <fog attach="fog" args={['#0a1829', 10, 30]} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#bde0ff", "#183042", 0.9]} />
      <directionalLight position={[6, 10, 6]} intensity={2.8} color="#d1e9ff" castShadow />
      <pointLight position={[0, 6, 5]} intensity={8} color="#8dcfff" distance={20} />
      <Stars radius={50} depth={38} count={1200} factor={3.2} saturation={0.6} fade speed={1.1} />
      <Sparkles key={burst} count={burst ? 120 : 40} scale={[10, 8, 6]} size={burst ? 4.8 : 2.0} color="#a6ebff" speed={1.4} />

      <RockWall />
      <mesh position={[-5.3, 1.2, -6]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[4.1, 6.5, 6]} />
        <meshStandardMaterial color="#203c5e" flatShading roughness={0.94} />
      </mesh>
      <mesh position={[5.4, 1.0, -6.4]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[4.5, 7.2, 6]} />
        <meshStandardMaterial color="#274564" flatShading roughness={0.94} />
      </mesh>
      <mesh position={[0, 5.65, -2.1]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.52, 1.1, 3]} />
        <meshStandardMaterial color="#ffc84b" emissive="#ffcf6e" emissiveIntensity={0.4} />
      </mesh>

      {visible.map((p, i) => (
        <RiggedClimber key={p.id} player={p} index={i} total={visible.length} />
      ))}
      <Float speed={1.2} floatIntensity={0.25}>
        <Text position={[0, 5.35, -1.55]} fontSize={0.44} color="#ffffff" outlineWidth={0.018} outlineColor="#1a3355">
          ZİRVE YARIŞI
        </Text>
      </Float>
      <ContactShadows position={[0, 0.02, 0.25]} opacity={0.22} blur={1.9} scale={12} />
    </>
  );
}

export default function Stage({ game, players, burst }: { game: GameType; players: Player[]; burst: number }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [0, 3.5, 10.8], fov: 45 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
    >
      {game === 'halay' ? <HalayArena players={players} burst={burst} /> : game === 'mountain' ? <MountainArena players={players} burst={burst} /> : <CityRace players={players} />}
    </Canvas>
  );
}
