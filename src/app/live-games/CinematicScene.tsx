'use client';

import { useEffect, useRef, useState } from 'react';

type Game = 'halay' | 'mountain';
type Quality = 'low' | 'high';
type Props = { game: Game; quality?: Quality };

const vertex = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 v_uv;
void main(){ v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }`;

const fragment = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform float u_time;
uniform vec2 u_resolution;
uniform int u_scene;
#define PI 3.14159265359

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
 float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+3.1;a*=0.5;}return v;
}
float terrain(vec2 xz){
 float ridge=1.0-abs(sin(xz.x*0.20 + sin(xz.y*.12)*1.5));
 float peaks=pow(max(0.0,ridge),3.0)*5.0;
 return peaks+fbm(xz*.22)*4.0 +fbm(xz*.8)*.48 -2.0;
}
vec3 sky(vec3 rd,float t){
 float g=max(rd.y,0.0);
 vec3 bottom=vec3(.08,.09,.23),top=vec3(.008,.016,.067);
 vec3 col=mix(bottom,top,pow(g,.57));
 float sun=pow(max(dot(rd,normalize(vec3(-.42,.35,-.55))),0.0),180.0);
 col+=vec3(1.0,.37,.48)*sun*.9;
 float star=step(.9987,hash(floor(rd.xy*420.0+rd.z*200.0)))*smoothstep(.0,.35,rd.y);
 col+=vec3(.65,.82,1.0)*star*(.45+.55*sin(t*2.0+rd.x*130.0));
 return col;
}
vec3 mountain(vec2 uv,float t){
 vec3 ro=vec3(sin(t*.07)*2.2,5.7,14.0);
 vec3 target=vec3(0.0,2.2,-12.0);
 vec3 forward=normalize(target-ro),right=normalize(cross(forward,vec3(0,1,0))),up=cross(right,forward);
 vec3 rd=normalize(forward+uv.x*right+uv.y*up);
 vec3 col=sky(rd,t);float distanceHit=0.0;bool hit=false;vec3 p=ro;
 for(int i=0;i<92;i++){
   p=ro+rd*distanceHit;
   float h=p.y-terrain(p.xz);
   if(h<.025){hit=true;break;}
   distanceHit+=clamp(h*.37,.06,1.35);
   if(distanceHit>82.0)break;
 }
 if(hit){
   float e=.08;
   vec3 n=normalize(vec3(terrain(p.xz-vec2(e,0.0))-terrain(p.xz+vec2(e,0.0)),2.0*e,terrain(p.xz-vec2(0.0,e))-terrain(p.xz+vec2(0.0,e))));
   float diffuse=max(dot(n,normalize(vec3(-.7,.8,-.4))),0.0);
   float snow=smoothstep(2.5,5.9,p.y+noise(p.xz*2.5));
   vec3 rock=mix(vec3(.07,.12,.26),vec3(.31,.35,.54),diffuse);
   col=mix(rock,vec3(.67,.81,.95),snow*.83);
   col+=vec3(.29,.31,.64)*pow(1.0-max(n.y,0.0),2.0)*.23;
   float mist=1.0-exp(-distanceHit*.019);
   col=mix(col,sky(rd,t),mist*.73);
 }
 float aurora=exp(-pow((uv.y-.14 - sin(uv.x*2.5+t*.24)*.085)*7.0,2.0))*smoothstep(-.2,.5,uv.y);
 col+=vec3(.015,.22,.31)*aurora*.32;
 float glow=exp(-length(uv-vec2(-.55,.4))*3.3);
 col+=vec3(.17,.08,.27)*glow*.25;
 return col;
}
vec3 concert(vec2 uv,float t){
 vec3 ro=vec3(sin(t*.11)*.65,3.2,8.2),ta=vec3(0.0,1.25,0.0);
 vec3 fw=normalize(ta-ro),right=normalize(cross(fw,vec3(0,1,0))),up=cross(right,fw);
 vec3 rd=normalize(fw+right*uv.x+up*uv.y);
 vec3 col=mix(vec3(.015,.018,.08),vec3(.002,.009,.028),smoothstep(-.8,.9,uv.y));
 float phase=t*.22;
 for(int i=0;i<7;i++){
  float fi=float(i);
  vec3 origin=vec3((fi-3.0)*1.8,5.5,-4.5);
  vec3 beam=normalize(vec3(sin(phase+fi*.83)*.65,-1.0,cos(phase*.7+fi)*.25+.15));
  float projection=dot(origin-ro,rd);
  vec3 samplePoint=ro+rd*max(0.0,projection);
  vec3 rel=samplePoint-origin;
  float beamDist=length(cross(rel,beam));
  float illum=pow(max(0.0,1.0-beamDist/3.8),5.0)*smoothstep(0.0,2.0,-rel.y);
  vec3 tint=mix(vec3(.08,.8,1.0),vec3(1.0,.10,.68),step(.5,fract(fi*.38)));
  col+=tint*illum*.18;
 }
 if(rd.y < -.001){
  float d=-ro.y/rd.y;
  vec3 p=ro+rd*d;
  if(d>0.0 && d<70.0){
    float gridX=pow(1.0-smoothstep(.018,.08,abs(fract(p.x*1.4)-.5)),3.0);
    float gridZ=pow(1.0-smoothstep(.018,.08,abs(fract(p.z*1.4)-.5)),3.0);
    float radial=exp(-length(p.xz)*.055);
    vec3 floorCol=vec3(.015,.017,.067);
    floorCol+=vec3(.16,.27,.70)*(gridX+gridZ)*.16*radial;
    float ring=exp(-pow((length(p.xz)-3.2)*4.0,2.0));
    floorCol+=vec3(.90,.22,.85)*ring*.36;
    float sheen=pow(max(dot(reflect(-normalize(vec3(-.4,.9,.3)),vec3(0,1,0)),normalize(-rd)),0.0),28.0);
    floorCol+=vec3(.09,.16,.33)*sheen;
    col=mix(floorCol,col,1.0-exp(-d*.008));
  }
 }
 vec2 stage=uv-vec2(0.0,.04);
 float pulse=.75+.25*sin(t*1.7);
 float halo=exp(-length(stage*vec2(1.35,1.0))*3.8)*pulse;
 col+=vec3(.19,.07,.38)*halo;
 float bars=exp(-abs(uv.x)*4.3)*exp(-abs(uv.y+.12)*20.0);
 col+=vec3(.6,.07,.42)*bars*.32;
 float spark=step(.998,hash(floor(uv*vec2(340.0,200.0))))*(.6+.4*sin(t*3.0+uv.x*15.0));
 col+=vec3(.43,.8,1.0)*spark*.8;
 return col;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*u_resolution.xy)/max(u_resolution.y,1.0);
 vec3 col=u_scene==1?mountain(uv,u_time):concert(uv,u_time);
 col=1.0-exp(-max(col,0.0)*1.45);
 col=pow(col,vec3(.91));
 float vignette=1.0-.32*pow(length(v_uv-.5)*1.4,2.0);
 fragColor=vec4(col*vignette,1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader=gl.createShader(type);
  if(!shader)throw new Error('WebGL shader unavailable');
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const err=gl.getShaderInfoLog(shader)||'Shader compile failed';
    gl.deleteShader(shader);
    throw new Error(err);
  }
  return shader;
}

export default function CinematicScene({game,quality='high'}:Props){
 const ref=useRef<HTMLCanvasElement>(null);
 const gameRef=useRef(game);
 const [fallback,setFallback]=useState(false);
 useEffect(()=>{gameRef.current=game;},[game]);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;
  const gl=canvas.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'high-performance'});
  if(!gl){setFallback(true);return;}
  let program:WebGLProgram|null=null;
  let buffer:WebGLBuffer|null=null;
  let frame=0;
  let stopped=false;
  const start=performance.now();
  try{
   const vs=compile(gl,gl.VERTEX_SHADER,vertex),fs=compile(gl,gl.FRAGMENT_SHADER,fragment);
   program=gl.createProgram();
   if(!program)throw new Error('WebGL program unavailable');
   gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Link error');
   buffer=gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),gl.STATIC_DRAW);
   const pos=gl.getAttribLocation(program,'a_position');
   gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
   const time=gl.getUniformLocation(program,'u_time'),res=gl.getUniformLocation(program,'u_resolution'),scene=gl.getUniformLocation(program,'u_scene');
   const draw=()=>{
    if(stopped||!program)return;
    const factor=quality==='low'?.6:Math.min(window.devicePixelRatio||1,1.45);
    const width=Math.max(1,Math.floor(canvas.clientWidth*factor)),height=Math.max(1,Math.floor(canvas.clientHeight*factor));
    if(width!==canvas.width||height!==canvas.height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
    gl.useProgram(program);
    gl.uniform1f(time,(performance.now()-start)/1000);
    gl.uniform2f(res,width,height);
    gl.uniform1i(scene,gameRef.current==='mountain'?1:0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    frame=requestAnimationFrame(draw);
   };
   draw();
  }catch(e){console.error('Duble-S cinematic renderer:',e);setFallback(true);}
  const onLost=(e:Event)=>{e.preventDefault();stopped=true;cancelAnimationFrame(frame);setFallback(true);};
  canvas.addEventListener('webglcontextlost',onLost);
  return()=>{stopped=true;cancelAnimationFrame(frame);canvas.removeEventListener('webglcontextlost',onLost);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);};
 },[quality]);
 return <div className={'lg-renderer '+(fallback?'lg-renderer-fallback':'')} aria-hidden="true"><canvas ref={ref} className="lg-canvas"/>{fallback&&<div className="lg-fallback-gradient"/>}<div className="lg-cinematic-grain"/><div className="lg-cinematic-vignette"/></div>;
}
