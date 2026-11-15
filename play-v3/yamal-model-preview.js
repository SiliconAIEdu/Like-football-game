import * as THREE from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';

const stage=document.querySelector('#stage');
const status=document.querySelector('#status');

async function loadPreview(){
 const renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 stage.prepend(renderer.domElement);

 const scene=new THREE.Scene();
 scene.background=new THREE.Color(0x26343b);
 scene.add(new THREE.HemisphereLight(0xf5f8ff,0x564741,2.1));
 for(const [position,color,intensity] of [
  [[-3,4,5],0xffecd4,2.5],
  [[3,3,-2],0xd3e7ff,2]
 ]){
  const light=new THREE.DirectionalLight(color,intensity);
  light.position.set(...position);
  scene.add(light);
 }

 const {scene:model}=await new GLTFLoader().loadAsync('assets/yamal-model-preview.glb');
 scene.add(model);
 model.updateMatrixWorld(true);

 const camera=new THREE.PerspectiveCamera(34,1,.01,25);
 const clay=new THREE.MeshStandardMaterial({color:0xd9c8b2,roughness:.88});
 const views={
  face:{center:1.66,radius:.61,yaw:0,pitch:.02},
  profile:{center:1.66,radius:.67,yaw:Math.PI/2,pitch:.02},
  body:{center:.90,radius:3.65,yaw:.22,pitch:.035},
  boots:{center:.115,radius:1.04,yaw:1.04,pitch:.32},
 };
 let view=views.face;
 let yaw=view.yaw,pitch=view.pitch;
 function render(){
  const aspect=stage.clientWidth/stage.clientHeight;
  camera.aspect=aspect;
  camera.updateProjectionMatrix();
  const distance=view.radius*Math.max(1,.86/aspect);
  const x=Math.sin(yaw)*Math.cos(pitch)*distance;
  const y=Math.sin(pitch)*distance;
  const z=Math.cos(yaw)*Math.cos(pitch)*distance;
  camera.position.set(x,view.center+y,z);
  camera.lookAt(0,view.center,0);
  renderer.render(scene,camera);
 }
 function resize(){
  renderer.setSize(stage.clientWidth,stage.clientHeight);
  render();
 }
 new ResizeObserver(resize).observe(stage);

 const buttons=document.querySelectorAll('[data-view]');
 for(const button of buttons){
  button.addEventListener('click',()=>{
   view=views[button.dataset.view];
   yaw=view.yaw;
   pitch=view.pitch;
   for(const other of buttons)other.setAttribute('aria-pressed',String(other===button));
   render();
  });
 }
 document.querySelector('#clay').addEventListener('click',event=>{
  scene.overrideMaterial=scene.overrideMaterial?null:clay;
  event.currentTarget.setAttribute('aria-pressed',String(Boolean(scene.overrideMaterial)));
  render();
 });
 let drag=null;
 stage.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  stage.setPointerCapture(event.pointerId);
  drag={id:event.pointerId,x:event.clientX,y:event.clientY};
 });
 stage.addEventListener('pointermove',event=>{
  if(drag?.id!==event.pointerId)return;
  yaw-=(event.clientX-drag.x)*.009;
  pitch=THREE.MathUtils.clamp(pitch+(event.clientY-drag.y)*.007,-.65,.75);
  drag.x=event.clientX;
  drag.y=event.clientY;
  render();
 });
 stage.addEventListener('lostpointercapture',()=>{drag=null;});
 stage.addEventListener('keydown',event=>{
  if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
  event.preventDefault();
  yaw+=event.key==='ArrowLeft'?-.12:.12;
  render();
 });
 status.hidden=true;
 resize();
}

loadPreview().catch(error=>{
 status.textContent='模型载入失败，请刷新页面或检查浏览器的 3D 图形支持。';
 console.error(error);
});
