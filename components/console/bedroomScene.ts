import * as THREE from 'three';
import { configureGlassReflection } from './glassReflection';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createWindowAtmosphere } from './windowAtmosphere';
import { getLighting, getReflectionRevision, LIGHTING_DEFAULTS } from '@/lib/console/lighting';
import { windowLightAtX } from '@/lib/console/windowLight';
import { bedroomCameraFrame } from '@/lib/console/bedroomCamera';

/** A real, lit room and monitor; the running console is its emissive screen texture. */
export function createBedroomScene(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  const atmosphere=createWindowAtmosphere(renderer);
  room.background = new THREE.Color('#020306');
  // Local window scattering provides atmosphere without lifting every dark surface.
  const camera = new THREE.PerspectiveCamera(40, 1, .05, 60);
  const materials: THREE.Material[] = [];
  const mat = (color: string, roughness = .8, metalness = 0) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness }); materials.push(m); return m;
  };
  const charcoal = mat('#25292d', .57), seam = mat('#080b0e'), metal = mat('#222830', .42, .6);
  const wall = mat('#262d39'), wood = mat('#574135', .72), fabric = mat('#283849'), sheet = mat('#747777');
  const surfaceCanvas=document.createElement('canvas');surfaceCanvas.width=surfaceCanvas.height=128;
  const surfaceContext=surfaceCanvas.getContext('2d')!;
  const pixels=surfaceContext.createImageData(128,128);
  let noiseSeed=73;
  for(let i=0;i<pixels.data.length;i+=4){noiseSeed=(noiseSeed*16807)%2147483647;const n=110+noiseSeed%36;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}
  surfaceContext.putImageData(pixels,0,0);
  const grain=new THREE.CanvasTexture(surfaceCanvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(9,9);
  for(const material of [charcoal,wall,fabric,sheet]){material.bumpMap=grain;material.bumpScale=material===charcoal?.012:.022;}
  const woodCanvas=document.createElement('canvas');woodCanvas.width=512;woodCanvas.height=128;
  const woodContext=woodCanvas.getContext('2d')!;
  for(let y=0;y<128;y++)for(let x=0;x<512;x++){
    const line=Math.sin(y*1.7+Math.sin(x*.012)*3)+Math.sin(y*.34+x*.006)*.4;
    const value=Math.round(93+line*10);woodContext.fillStyle=`rgb(${value},${Math.round(value*.75)},${Math.round(value*.56)})`;woodContext.fillRect(x,y,1,1);
  }
  const woodGrain=new THREE.CanvasTexture(woodCanvas);woodGrain.colorSpace=THREE.SRGBColorSpace;woodGrain.wrapS=woodGrain.wrapT=THREE.RepeatWrapping;
  wood.map=woodGrain;wood.color.set('#c9b4a3');
  function box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, radius = .025) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius,w/3,h/3,d/3)), material);
    mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; room.add(mesh); return mesh;
  }
  // Plaster room, floorboards and a low bed beyond the workstation.
  box(18,.15,18,0,-2.25,-2,mat('#28252a'));
  box(13.65,8,.15,2.175,1.7,-6,wall);
  // Leave a real opening in the wall so the exterior light passes through the panes.
  box(.15,2.96,18,-4.65,-.72,-2,wall);
  box(.15,2.7,18,-4.65,4.39,-2,wall);
  box(.15,2.28,9.28,-4.65,1.9,-6.36,wall);
  box(.15,2.28,6.88,-4.65,1.9,3.56,wall);
  // Low storage behind the desk leaves the window-to-bed light path open.
  box(4.3,.85,.55,-1.8,-1.72,-1.95,wood,.035);
  box(13.65,.16,.05,2.175,-2.07,-5.88,wood,.012);
  box(.06,.16,10,-4.54,-2.07,-1,wood,.012);
  for (let i=-8;i<=8;i++) box(.018,.005,16,i,-2.17,-2,seam,.001);
  box(4.1,.38,5.5,3.6,-1.82,-3.3,wood,.07);
  box(3.9,.48,5.3,3.6,-1.4,-3.3,sheet,.2);
  const duvetGeometry=new THREE.PlaneGeometry(4.12,4.05,48,40);duvetGeometry.rotateX(-Math.PI/2);
  const duvetPositions=duvetGeometry.attributes.position;
  for(let i=0;i<duvetPositions.count;i++){
    const x=duvetPositions.getX(i),z=duvetPositions.getZ(i);
    const drape=Math.max(0,Math.abs(x)-1.82)*1.9+Math.max(0,z-1.7)*.6;
    duvetPositions.setY(i,.035*Math.sin(x*12+z*.8)+.018*Math.sin(z*9+x*3)-drape);
  }
  duvetGeometry.computeVertexNormals();fabric.side=THREE.DoubleSide;
  const duvet=new THREE.Mesh(duvetGeometry,fabric);duvet.position.set(3.6,-1.08,-2.66);duvet.castShadow=true;duvet.receiveShadow=true;room.add(duvet);
  const pillow=box(1.55,.24,.88,3.5,-1.03,-5.12,sheet,.11); pillow.rotation.y=-.08;
  box(4.2,1.1,.18,3.6,-1.46,-5.95,wood,.04);
  // Desk, legs, keyboard and a cable disappearing behind the monitor.
  box(7.4,.22,3.3,-.45,-1.66,.1,wood,.055);
  box(7.25,.018,3.2,-.45,-1.54,.1,wood,.01);
  for(const x of [-3.7,2.8]) for(const z of [-1.15,1.35]) box(.13,.64,.13,x,-2,z,metal);
  const keyboard = new THREE.Group(); keyboard.position.set(-.2,-1.43,1.13); keyboard.rotation.x=.07; room.add(keyboard);
  const keyboardBody = new THREE.Mesh(new RoundedBoxGeometry(2.15,.1,.64,3,.035),charcoal); keyboard.add(keyboardBody);
  const keyMat=mat('#606166', .65);
  for(let row=0;row<4;row++) for(let col=0;col<14;col++) {
    const key=new THREE.Mesh(new THREE.BoxGeometry(.115,.045,.102),keyMat);
    key.position.set(-.94+col*.145,.073,-.23+row*.14); keyboard.add(key);
  }
  const cableCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(.9,-1.51,.9),new THREE.Vector3(1.9,-1.5,.2),new THREE.Vector3(1.1,-1.48,-.9)]);
  room.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve,24,.018,6,false),seam));
  // Small, useful clutter: cases and a controller left of the display, mug and notes right.
  const paper=mat('#bab5a4'),casePlastic=mat('#323a45',.38),ceramic=mat('#716653',.3);
  for(let i=0;i<3;i++){
    const book=box(.74,.055,1.0,-2.63,-1.49+i*.062,.38,i===1?mat('#434e62'):casePlastic,.015);
    book.rotation.y=(i-1)*.06;
    box(.63,.008,.86,-2.63,-1.457+i*.062,.38,mat(i===1?'#656c70':'#74715d'),.005);
  }
  const controller=new THREE.Group();controller.position.set(-2.45,-1.31,1.12);controller.rotation.y=-.22;room.add(controller);
  const padBody=new THREE.Mesh(new RoundedBoxGeometry(.78,.14,.38,3,.065),charcoal);controller.add(padBody);
  for(const x of [-.29,.29]){
    const grip=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.22,4,12),charcoal);grip.rotation.x=Math.PI/2;grip.position.set(x,-.03,.18);controller.add(grip);
  }
  for(const [x,z] of [[-.21,-.025],[.21,-.025],[-.12,.12],[.12,.12]]){
    const control=new THREE.Mesh(new THREE.CylinderGeometry(.046,.046,.034,16),seam);control.position.set(x,.091,z);controller.add(control);
  }
  const cord=new THREE.CatmullRomCurve3([new THREE.Vector3(-2.45,-1.4,.93),new THREE.Vector3(-3.1,-1.5,.45),new THREE.Vector3(-2.8,-1.5,-.65),new THREE.Vector3(-.8,-1.51,-1.15)]);
  room.add(new THREE.Mesh(new THREE.TubeGeometry(cord,40,.014,6,false),seam));
  const mug=new THREE.Mesh(new THREE.CylinderGeometry(.17,.14,.35,32,1,true),ceramic);mug.position.set(2.2,-1.34,.61);mug.castShadow=true;room.add(mug);
  const coffee=new THREE.Mesh(new THREE.CircleGeometry(.151,32),mat('#19110c',.2));coffee.rotation.x=-Math.PI/2;coffee.position.set(2.2,-1.195,.61);room.add(coffee);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.12,.033,8,24),ceramic);handle.position.set(2.38,-1.34,.61);room.add(handle);
  const notebook=box(.58,.042,.86,1.75,-1.49,1.13,paper,.012);notebook.rotation.y=-.15;
  const pencil=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.57,6),mat('#a28550'));pencil.rotation.z=Math.PI/2;pencil.rotation.y=.3;pencil.position.set(1.84,-1.452,1.22);room.add(pencil);
  // Wall shelf and a compact speaker give the workstation a practical setting.
  box(2.1,.09,.42,-2.65,1.7,-5.66,wood,.018);
  for(let i=0;i<6;i++)box(.13,.42+i%3*.055,.27,-3.44+i*.16,1.96+i%3*.027,-5.66,mat(['#494a48','#64604e','#424b59'][i%3]),.009);
  box(.34,.65,.32,2.29,-1.18,-.75,charcoal,.035);
  for(const y of [-1.34,-1.05]){
    const driver=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.02,32),seam);driver.rotation.x=Math.PI/2;driver.position.set(2.29,y,-.58);room.add(driver);
  }
  // Substantial tapered-looking rear enclosure, swivel pedestal and front bezel.
  box(2.65,2.35,1.65,0,.02,-.45,charcoal,.24);
  box(3.5,2.78,.54,0,.04,.22,charcoal,.14);
  box(1.28,.14,.85,0,-1.44,-.05,charcoal,.07);
  box(.6,.2,.5,0,-1.3,-.12,seam,.045);
  function rounded(path: THREE.Path, x:number,y:number,w:number,h:number,r:number) {
    path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);
    path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);
    path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);
  }
  const shape=new THREE.Shape();rounded(shape,-1.75,-1.35,3.5,2.78,.13);
  const hole=new THREE.Path();rounded(hole,-1.51,-1.025,3.02,2.27,.15);shape.holes.push(hole);
  const bezel=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:16}),charcoal);
  bezel.position.z=.48;bezel.castShadow=true;bezel.receiveShadow=true;room.add(bezel);
  for(let i=0;i<12;i++) box(.69,.017,.02,-1.1,-1.13+i*.012,.66,seam,.004);
  for(let i=0;i<13;i++) box(.013,.8,.022,1.332,.16,-.2-i*.075,seam,.004);
  // UV-bearing convex glass, subdivided so it is visibly curved from the side.
  const screenGeometry = new THREE.PlaneGeometry(3,2.25,64,48);
  const positions=screenGeometry.attributes.position;
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i), y=positions.getY(i);
    const nx=x/1.5,ny=y/1.125;
    // Rounded corners follow the actual aperture rather than a flat rectangular plane.
    const limit=1.5-.15+Math.sqrt(Math.max(0,.15*.15-Math.pow(Math.max(0,Math.abs(y)-(1.125-.15)),2)));
    positions.setXYZ(i,THREE.MathUtils.clamp(x,-limit,limit),y,.12*(1-nx*nx)*(1-ny*ny));
  }
  screenGeometry.computeVertexNormals();
  const screenMaterial = new THREE.MeshPhysicalMaterial({color:'#080e13',roughness:.13,metalness:0,clearcoat:1,clearcoatRoughness:.055,envMapIntensity:.65,emissive:'#ffffff',emissiveIntensity:0});
  configureGlassReflection(screenMaterial);
  materials.push(screenMaterial);
  const screen=new THREE.Mesh(screenGeometry,screenMaterial);screen.position.set(0,.11,.675);room.add(screen);
  // The physical power key has a red standby LED and a DOM hit target projected onto it.
  const powerPosition=new THREE.Vector3(1.4,-1.18,.68);
  const powerKey=new THREE.Mesh(new THREE.CylinderGeometry(.095,.095,.035,32),metal);powerKey.rotation.x=Math.PI/2;powerKey.position.copy(powerPosition);room.add(powerKey);
  const ledMaterial=new THREE.MeshBasicMaterial({color:'#ff3b24'});materials.push(ledMaterial);
  const led=new THREE.Mesh(new THREE.SphereGeometry(.018,12,8),ledMaterial);led.position.set(1.4,-1.18,.715);room.add(led);
  const standby=new THREE.PointLight('#ff3925',.045,.7,2);standby.position.set(1.4,-1.18,.82);room.add(standby);
  const lampColor='#ffb66d', lampBounceColor='#cf976a';
  // Bedside practical, soft blue window, and monitor light on the desk.
  box(.95,.85,.85,6.1,-1.7,-4.65,wood,.04);
  const lampBase=new THREE.Mesh(new THREE.CylinderGeometry(.21,.25,.07,32),metal);lampBase.position.set(6.1,-1.23,-4.65);room.add(lampBase);
  box(.035,.7,.035,6.1,-.9,-4.65,metal,.01);
  const shadeMat=new THREE.MeshStandardMaterial({color:'#c49a6a',roughness:.95,emissive:'#ef923b',emissiveIntensity:.35,side:THREE.DoubleSide});materials.push(shadeMat);
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.32,.5,.54,48,1,true),shadeMat);shade.position.set(6.1,-.53,-4.65);room.add(shade);
  const lamp=new THREE.PointLight(lampColor,6,12,2);lamp.position.set(6.1,-.65,-4.65);lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);lamp.shadow.bias=-.001;lamp.shadow.normalBias=.025;room.add(lamp);
  const windowMaterial=new THREE.MeshPhysicalMaterial({color:'#7c93a8',transparent:true,opacity:.075,depthWrite:false,roughness:.12,metalness:0});materials.push(windowMaterial);
  const windowPane=box(.025,2.28,1.84,-4.48,1.9,-.8,windowMaterial,.01);windowPane.castShadow=false;
  box(.055,2.4,.07,-4.44,1.9,-.8,wood,.01);
  box(.055,.07,1.96,-4.44,1.9,-.8,wood,.01);
  box(.24,.09,2.06,-4.37,.72,-.8,wood,.012);
  for(const z of [-1.94,.34]){
    const curtain=box(.15,3.2,.38,-4.25,1.64,z,fabric,.065);curtain.rotation.y=.08;
  }
  const moon=new THREE.SpotLight('#92b8f0',24,20,.48,.65,1.4);const moonSource=windowLightAtX(-6.4),moonTarget=windowLightAtX(3.6);moon.position.set(moonSource.x,moonSource.y,moonSource.z);moon.target.position.set(moonTarget.x,moonTarget.y,moonTarget.z);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);moon.shadow.bias=-.0004;moon.shadow.normalBias=.018;moon.shadow.radius=3;room.add(moon,moon.target);
  const ambient=new THREE.HemisphereLight('#8ca2c3','#201b1b',.30);room.add(ambient);
  const fill=new THREE.DirectionalLight('#c5d5e9',.42);fill.position.set(-2,4,5);room.add(fill);
  const warmBounce=new THREE.PointLight(lampBounceColor,.8,5,2);warmBounce.position.set(4.3,-.4,-4.5);room.add(warmBounce);
  const screenLight=new THREE.PointLight('#709eff',0,6,2);screenLight.position.set(0,.1,1.1);room.add(screenLight);
  // A shaded task lamp directs a warm pool at the keyboard, rather than lighting the whole room.
  const deskLampMat=mat('#34433f',.34,.55);
  const taskBase=new THREE.Mesh(new THREE.CylinderGeometry(.29,.34,.09,48),deskLampMat);taskBase.position.set(-3.08,-1.46,.02);taskBase.castShadow=true;room.add(taskBase);
  const armPath=new THREE.CatmullRomCurve3([new THREE.Vector3(-3.08,-1.43,.02),new THREE.Vector3(-3.08,-.45,.02),new THREE.Vector3(-2.99,.39,.12),new THREE.Vector3(-2.65,.55,.8)]);
  const taskArm=new THREE.Mesh(new THREE.TubeGeometry(armPath,40,.033,12,false),deskLampMat);taskArm.castShadow=true;room.add(taskArm);
  const keyboardTarget=new THREE.Vector3(-.2,-1.36,1.13);
  const taskDirection=keyboardTarget.clone().sub(new THREE.Vector3(-2.65,.55,.8)).normalize();
  const taskShade=new THREE.Mesh(new THREE.CylinderGeometry(.13,.34,.35,48,1,true),deskLampMat);taskShade.material.side=THREE.DoubleSide;
  taskShade.position.set(-2.65,.55,.8);taskShade.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),taskDirection);taskShade.castShadow=true;room.add(taskShade);
  const diffuserMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(lampColor).multiplyScalar(2.2)});materials.push(diffuserMaterial);
  const diffuser=new THREE.Mesh(new THREE.CircleGeometry(.285,48),diffuserMaterial);diffuser.position.copy(taskShade.position).addScaledVector(taskDirection,.18);diffuser.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),taskDirection);room.add(diffuser);
  const taskLight=new THREE.SpotLight(lampColor,8,7,.7,.72,2);taskLight.position.copy(diffuser.position).addScaledVector(taskDirection,.045);taskLight.target.position.copy(keyboardTarget);taskLight.castShadow=true;taskLight.shadow.mapSize.set(1024,1024);taskLight.shadow.bias=-.0004;taskLight.shadow.normalBias=.02;taskLight.shadow.radius=3;room.add(taskLight,taskLight.target);
  // The lit keyboard is captured by the reflection probe. A point-light bounce here
  // produced a fictional pinprick in the glass instead of reflecting the keycaps.

  // A dimensional night view: clouded sky, distant rooftops, and scattered apartment windows.
  const skyMaterial=new THREE.ShaderMaterial({depthWrite:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec2 vUv;void main(){float clouds=sin(vUv.x*18.0+sin(vUv.y*27.0))*sin(vUv.y*21.0+vUv.x*5.0);vec3 sky=mix(vec3(.04,.065,.105),vec3(.006,.014,.032),smoothstep(0.0,1.0,vUv.y));sky+=vec3(.004,.006,.009)*smoothstep(.1,.8,clouds);gl_FragColor=vec4(sky,1.0);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});materials.push(skyMaterial);
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(120,40),skyMaterial);sky.rotation.y=Math.PI/2;sky.position.set(-19,6,-24);room.add(sky);
  const facade=mat('#141d29',.92),rooftop=mat('#1c2530');
  const litWindow=new THREE.MeshBasicMaterial({color:'#c6a477'});materials.push(litWindow);
  for(let building=0;building<7;building++){
    const z=-25+building*3.8, height=7.2+(building*7%5)*.65, x=-9-(building%3)*1.1;
    box(1.3,height,2.7,x,0,z,facade,.025);
    box(1.42,.12,2.85,x,height/2+.05,z,rooftop,.01);
    for(let row=0;row<4;row++)for(let col=0;col<4;col++)if((row*11+col*7+building*3)%5<2){
      const light=new THREE.Mesh(new THREE.PlaneGeometry(.19,.26),litWindow);light.rotation.y=Math.PI/2;light.position.set(x+.657,1.35+row*.62,z-.92+col*.59);room.add(light);
    }
  }

  // Capture the actual room from the glass, excluding the screen itself to avoid feedback.
  // This is a static environment probe, not a painted reflection or screen-space approximation.
  const reflectionTarget=new THREE.WebGLCubeRenderTarget(window.innerWidth < 600 ? 512 : 1024,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType});
  const probe=new THREE.CubeCamera(.05,45,reflectionTarget);probe.position.set(0,.11,.83);
  let reflectionRevision=getReflectionRevision();
  let environment:THREE.WebGLRenderTarget|undefined;
  function applyLighting(){
    const p=getLighting();
    ambient.intensity=p.ambient;fill.intensity=p.fill;room.environmentIntensity=p.environment;
    lamp.intensity=p.bedside;taskLight.intensity=p.desk;moon.intensity=p.window;
    lamp.color.set(p.lampColor);taskLight.color.set(p.lampColor);
    const bounceColor=p.lampColor===LIGHTING_DEFAULTS.lampColor?lampBounceColor:p.lampColor;
    warmBounce.color.set(bounceColor);
    warmBounce.intensity=p.bedside/6*.8;
    diffuserMaterial.color.set(p.lampColor).multiplyScalar(2.2*p.desk/8);
    shadeMat.emissive.set(p.lampColor===LIGHTING_DEFAULTS.lampColor?'#ef923b':p.lampColor);shadeMat.emissiveIntensity=.35*p.bedside/6;
    screenMaterial.envMapIntensity=p.reflection;screenMaterial.roughness=p.glassRoughness;screenMaterial.clearcoatRoughness=p.clearcoatRoughness;
  }
  function captureReflection(){
    const pmrem=new THREE.PMREMGenerator(renderer);
    const previousShadowUpdate=renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate=true;
    const previousEnvironment=room.environment;
    const previousVisibility=screen.visible;
    // Never bake the previous probe into its replacement when refreshing settings.
    room.environment=null;
    screen.visible=false;
    try { probe.update(renderer,room); }
    finally {
      screen.visible=previousVisibility;
      room.environment=previousEnvironment;
      renderer.shadowMap.autoUpdate=previousShadowUpdate;
    }
    const next=pmrem.fromCubemap(reflectionTarget.texture);pmrem.dispose();
    room.environment=next.texture;screenMaterial.envMap=next.texture;screenMaterial.needsUpdate=true;
    environment?.dispose();environment=next;
  }
  applyLighting();captureReflection();
  const anchor=new THREE.Vector3(),edge=new THREE.Vector3();
  const target=new THREE.Vector3(0,.11,.72);
  return {
    render(picture:THREE.Texture, width:number,height:number,progress:number,powered:boolean,ignition:number|null) {
      applyLighting();
      if(reflectionRevision!==getReflectionRevision()){captureReflection();reflectionRevision=getReflectionRevision();}
      camera.aspect=width/height;
      const frame=bedroomCameraFrame(width,height,progress);
      camera.position.set(frame.x,frame.y,frame.z);
      camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      screenMaterial.emissiveMap=powered?picture:null;
      screenMaterial.emissiveIntensity=powered?getLighting().screen:0;
      screenMaterial.color.set(powered?'#000000':'#080e13');
      // The material program needs recompilation only when the map is introduced.
      if(Boolean(screenMaterial.userData.powered)!==powered){screenMaterial.needsUpdate=true;screenMaterial.userData.powered=powered;}
      ledMaterial.color.set(powered?'#9ee863':'#ff3b24');standby.color.copy(ledMaterial.color);
      screenLight.intensity=powered?(ignition!==null?2:1.3):0;
      renderer.setRenderTarget(null);renderer.setClearColor('#090d15',1);atmosphere.render(renderer,room,camera);
      anchor.copy(powerPosition).project(camera);edge.copy(powerPosition).add(new THREE.Vector3(.11,0,0)).project(camera);
      return { x:(anchor.x+1)*width/2,y:(1-anchor.y)*height/2,size:Math.max(44,Math.abs(edge.x-anchor.x)*width) };
    },
    dispose() {
      const geometries=new Set<THREE.BufferGeometry>();room.traverse(o=>{if(o instanceof THREE.Mesh)geometries.add(o.geometry);});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());grain.dispose();woodGrain.dispose();environment?.dispose();reflectionTarget.dispose();
      atmosphere.dispose();lamp.dispose();moon.dispose();taskLight.dispose();
    },
  };
}
