import * as THREE from 'three';
import { createScreenLightSampler } from './screenLightSampler';
import { LAYOUT_DEFAULTS } from '@/lib/console/layout';
import type { LayoutItem } from './layoutEditor';
import { configureGlassReflection } from './glassReflection';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createWindowAtmosphere } from './windowAtmosphere';
import { getLighting, getReflectionRevision, LIGHTING_DEFAULTS, refreshLightingReflection } from '@/lib/console/lighting';
import { windowLightAtX } from '@/lib/console/windowLight';
import { asset } from '@/lib/console/assets';
import { bedroomCameraFrame } from '@/lib/console/bedroomCamera';

/** A real, lit room and monitor; the running console is its emissive screen texture. */
export function createBedroomScene(renderer: THREE.WebGLRenderer,picture:THREE.Texture,invalidate:()=>void=()=>{}) {
  const room = new THREE.Scene();room.name="bedroom";
  let disposed=false;
  let editor:ReturnType<typeof import('./layoutEditor').createLayoutEditor>|undefined;
  const layoutItems:LayoutItem[]=[];
  let itemStart=0;
  const beginItem=()=>{itemStart=room.children.length;};
  const endItem=(name:string,wall=false)=>{layoutItems.push({name,wall,objects:room.children.slice(itemStart)});};
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
  beginItem();
  box(4.1,.38,5.5,3.6,-1.82,-3.3,wood,.07);
  box(3.9,.48,5.3,3.6,-1.4,-3.3,sheet,.2);
  // A smooth, thick quilt with a folded head edge and two ordinary pillows.
  box(4.0,.16,3.95,3.6,-1.12,-2.58,fabric,.075);
  box(4.0,.12,.36,3.6,-1.035,-4.38,fabric,.055);
  for(const x of [2.64,4.5]) box(1.62,.25,.92,x,-1.02,-5.03,sheet,.12);
  box(4.2,1.35,.18,3.6,-1.25,-5.95,wood,.04);
  endItem('Bed',false);
  beginItem();
  // Matte snowboarding print above the bed, with a slim dark frame.
  const posterTexture=new THREE.TextureLoader().load(asset('textures/snowboarding-poster.webp'),()=>{
    if(disposed){posterTexture.dispose();return;}
    refreshLightingReflection();
  });
  posterTexture.colorSpace=THREE.SRGBColorSpace;
  posterTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const posterMaterial=new THREE.MeshStandardMaterial({map:posterTexture,color:0x999999,roughness:1,metalness:0,envMapIntensity:0});materials.push(posterMaterial);
  box(1.88,2.78,.055,4.05,1.8,-5.86,charcoal,.012);
  const poster=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.7),posterMaterial);
  poster.position.set(4.05,1.8,-5.828);poster.receiveShadow=true;room.add(poster);
  endItem('Poster',true);
  // Presentation offset is separate from saved prop coordinates.
  const posterPlacement=new THREE.Group();room.add(posterPlacement);
  layoutItems.find(item=>item.name==='Poster')!.objects.forEach(object=>posterPlacement.add(object));
  const placePoster=(width:number,height:number)=>{
    const x=width<=700&&height>width?-3.9:0;
    if(posterPlacement.position.x===x)return;
    posterPlacement.position.x=x;room.updateMatrixWorld(true);renderer.shadowMap.needsUpdate=true;
  };
  placePoster(window.innerWidth,window.innerHeight);
  // Desk, legs, console and a cable disappearing behind the monitor.
  box(7.4,.22,3.3,-.45,-1.66,.1,wood,.055);
  box(7.25,.018,3.2,-.45,-1.54,.1,wood,.01);
  for(const x of [-3.7,2.8]) for(const z of [-1.15,1.35]) box(.13,.64,.13,x,-2,z,metal);
  beginItem();
  // Horizontal original PS2: stepped shell, cooling fins, tray and front ports.
  const consoleBlack=mat('#11131a',.64), consoleBlue=mat('#284aa0',.42);
  box(2.12,.22,.78,-.2,-1.41,1.13,consoleBlack,.018);
  box(2.2,.045,.82,-.2,-1.285,1.13,charcoal,.008);
  for(let i=0;i<6;i++) box(2.14,.012,.79,-.2,-1.49+i*.032,1.13,seam,.002);
  box(.96,.085,.017,.23,-1.39,1.535,charcoal,.004);
  for(const x of [-1.03,-.73]) {
    box(.22,.035,.018,x,-1.355,1.537,seam,.003);
    box(.2,.07,.02,x,-1.44,1.537,seam,.009);
  }
  for(const y of [-1.375,-1.45]) box(.06,.024,.02,.72,y,1.54,metal,.003);
  const logoCanvas=document.createElement('canvas');logoCanvas.width=256;logoCanvas.height=128;
  const logoContext=logoCanvas.getContext('2d')!;
  logoContext.fillStyle='#5377cf';logoContext.font='300 66px sans-serif';logoContext.fillText('PS2',50,74);
  logoContext.font='12px sans-serif';logoContext.fillText('PlayStation 2',64,99);
  const consoleLogo=new THREE.CanvasTexture(logoCanvas);consoleLogo.colorSpace=THREE.SRGBColorSpace;
  const logoMaterial=new THREE.MeshBasicMaterial({map:consoleLogo,transparent:true,depthWrite:false});materials.push(logoMaterial);
  const logo=new THREE.Mesh(new THREE.PlaneGeometry(.74,.37),logoMaterial);
  logo.rotation.x=-Math.PI/2;logo.position.set(-.2,-1.259,1.12);room.add(logo);
  box(.06,.028,.019,.77,-1.34,1.541,consoleBlue,.002);
  endItem('PlayStation 2',false);
  const cableCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(.9,-1.51,.9),new THREE.Vector3(1.9,-1.5,.2),new THREE.Vector3(1.1,-1.48,-.9)]);
  room.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve,24,.018,6,false),seam));
  // Small, useful clutter: cases and a controller left of the display, mug and notes right.
  const paper=mat('#bab5a4'),casePlastic=mat('#323a45',.38),ceramic=mat('#716653',.3);
  beginItem();
  for(let i=0;i<3;i++){
    const book=box(.74,.055,1.0,-2.63,-1.49+i*.062,.38,i===1?mat('#434e62'):casePlastic,.015);
    book.rotation.y=(i-1)*.06;
    box(.63,.008,.86,-2.63,-1.457+i*.062,.38,mat(i===1?'#656c70':'#74715d'),.005);
  }
  endItem('Game cases',false);
  beginItem();
  const controller=new THREE.Group();controller.position.set(-2.45,-1.395,1.12);controller.rotation.y=-.22;room.add(controller);
  const padBody=new THREE.Mesh(new RoundedBoxGeometry(.78,.14,.38,3,.065),charcoal);controller.add(padBody);
  for(const x of [-.29,.29]){
    const grip=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.22,4,12),charcoal);grip.rotation.x=Math.PI/2;grip.position.set(x,-.03,.18);controller.add(grip);
  }
  for(const [x,z] of [[-.21,-.025],[.21,-.025],[-.12,.12],[.12,.12]]){
    const control=new THREE.Mesh(new THREE.CylinderGeometry(.046,.046,.034,16),seam);control.position.set(x,.091,z);controller.add(control);
  }
  controller.traverse(object=>{
    if(object instanceof THREE.Mesh){object.castShadow=true;object.receiveShadow=true;}
  });
  const cord=new THREE.CatmullRomCurve3([new THREE.Vector3(-2.45,-1.485,.93),new THREE.Vector3(-2.1,-1.5,1.57),new THREE.Vector3(-1.4,-1.5,1.68),new THREE.Vector3(-1.03,-1.44,1.55)]);
  const controllerCable=new THREE.Mesh(new THREE.TubeGeometry(cord,40,.014,6,false),seam);
  controllerCable.castShadow=true;controllerCable.receiveShadow=true;room.add(controllerCable);
  endItem('Controller and cable',false);
  beginItem();
  const mug=new THREE.Mesh(new THREE.CylinderGeometry(.17,.14,.35,32,1,true),ceramic);mug.position.set(2.2,-1.34,.61);mug.castShadow=true;room.add(mug);
  const coffee=new THREE.Mesh(new THREE.CircleGeometry(.151,32),mat('#19110c',.2));coffee.rotation.x=-Math.PI/2;coffee.position.set(2.2,-1.195,.61);room.add(coffee);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.12,.033,8,24),ceramic);handle.position.set(2.38,-1.34,.61);room.add(handle);
  endItem('Mug',false);
  beginItem();
  const notebook=box(.58,.042,.86,1.75,-1.49,1.13,paper,.012);notebook.rotation.y=-.15;
  const pencil=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.57,6),mat('#a28550'));pencil.rotation.z=Math.PI/2;pencil.rotation.y=.3;pencil.position.set(1.84,-1.452,1.22);room.add(pencil);
  endItem('Notebook and pencil',false);
  // Wall shelf and a compact speaker give the workstation a practical setting.
  box(2.1,.09,.42,-2.65,1.7,-5.66,wood,.018);
  for(let i=0;i<6;i++)box(.13,.42+i%3*.055,.27,-3.44+i*.16,1.96+i%3*.027,-5.66,mat(['#494a48','#64604e','#424b59'][i%3]),.009);
  beginItem();
  box(.34,.65,.32,2.29,-1.18,-.75,charcoal,.035);
  for(const y of [-1.34,-1.05]){
    const driver=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.02,32),seam);driver.rotation.x=Math.PI/2;driver.position.set(2.29,y,-.58);room.add(driver);
  }
  endItem('Speaker',false);
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
  const restingScreen=positions.array.slice();
  let screenFitKey='';
  screenGeometry.computeVertexNormals();
  const screenMaterial = new THREE.MeshPhysicalMaterial({color:'#080e13',roughness:.13,metalness:0,clearcoat:1,clearcoatRoughness:.055,envMapIntensity:.65,emissive:'#ffffff',emissiveIntensity:0,emissiveMap:picture});
  configureGlassReflection(screenMaterial);
  materials.push(screenMaterial);
  const screen=new THREE.Mesh(screenGeometry,screenMaterial);screen.position.set(0,.11,.675);room.add(screen);
  // The physical power key has a red standby LED and a DOM hit target projected onto it.
  const powerPosition=new THREE.Vector3(1.4,-1.18,.68);
  const powerKey=new THREE.Mesh(new THREE.CylinderGeometry(.095,.095,.035,32),metal);powerKey.rotation.x=Math.PI/2;powerKey.position.copy(powerPosition);room.add(powerKey);
  let powerHovered=false,ledStrength=1,ledFrom=1,ledTo=1,ledTransitionStart=0;
  const ledMaterial=new THREE.MeshStandardMaterial({color:'#000000',emissive:'#ff3b24',emissiveIntensity:1,roughness:.4});materials.push(ledMaterial);
  const led=new THREE.Mesh(new THREE.SphereGeometry(.029,16,12),ledMaterial);led.position.set(1.4,-1.18,.715);room.add(led);
  const standby=new THREE.PointLight('#ff3925',.085,.7,2);standby.position.set(1.4,-1.18,.82);room.add(standby);
  const lampColor='#ffb66d', lampBounceColor='#cf976a';
  // Bedside practical, soft blue window, and monitor light on the desk.
  beginItem();
  box(1.12,1.1,.95,6.22,-1.58,-4.65,wood,.04);
  box(1.22,.1,1.05,6.22,-.98,-4.65,wood,.025);
  box(.96,.36,.025,6.22,-1.24,-4.16,charcoal,.015);
  box(.22,.035,.035,6.22,-1.24,-4.13,metal,.01);
  const lampBase=new THREE.Mesh(new THREE.CylinderGeometry(.21,.25,.07,32),metal);lampBase.position.set(6.22,-.89,-4.65);room.add(lampBase);
  box(.035,.7,.035,6.22,-.53,-4.65,metal,.01);
  const shadeMat=new THREE.MeshStandardMaterial({color:'#c49a6a',roughness:.95,emissive:'#ef923b',emissiveIntensity:.35,side:THREE.DoubleSide});materials.push(shadeMat);
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.32,.5,.54,48,1,true),shadeMat);shade.position.set(6.22,-.16,-4.65);room.add(shade);
  const lamp=new THREE.PointLight(lampColor,6,12,2);lamp.position.set(6.22,-.28,-4.65);lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);lamp.shadow.bias=-.001;lamp.shadow.normalBias=.025;room.add(lamp);
  endItem('Bedside table and lamp',false);
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
  layoutItems.find(item=>item.name==='Bedside table and lamp')?.objects.push(warmBounce);
  // Screen spill emits toward the desk/viewer, never back into its own glass.
  // A point source here produces a persistent specular dot at the screen centre.
  RectAreaLightUniformsLib.init();
  const screenLightSampler=createScreenLightSampler(renderer);
  const screenLight=new THREE.RectAreaLight('#709eff',0,2.9,2.15);
  // Just beyond the convex glass: the console and controller must be in front
  // of the emitting plane. A slight downward tilt catches their top surfaces.
  screenLight.position.set(0,.1,.84);screenLight.rotation.set(.18,Math.PI,0);room.add(screenLight);
  beginItem();
  // A shaded task lamp directs a warm pool at the console, rather than lighting the whole room.
  const deskLampMat=mat('#34433f',.34,.55);
  const taskBase=new THREE.Mesh(new THREE.CylinderGeometry(.29,.34,.09,48),deskLampMat);taskBase.position.set(-3.65,-1.46,-.8);taskBase.castShadow=true;room.add(taskBase);
  const armPath=new THREE.CatmullRomCurve3([new THREE.Vector3(-3.65,-1.43,-.8),new THREE.Vector3(-3.65,-.45,-.8),new THREE.Vector3(-3.56,.39,-.7),new THREE.Vector3(-3.22,.55,-.02)]);
  const taskArm=new THREE.Mesh(new THREE.TubeGeometry(armPath,40,.033,12,false),deskLampMat);taskArm.castShadow=true;room.add(taskArm);
  const consoleTarget=new THREE.Vector3(-.2,-1.25,1.13);
  const taskDirection=consoleTarget.clone().sub(new THREE.Vector3(-3.22,.55,-.02)).normalize();
  const taskShade=new THREE.Mesh(new THREE.CylinderGeometry(.13,.34,.35,48,1,true),deskLampMat);taskShade.material.side=THREE.DoubleSide;
  taskShade.position.set(-3.22,.55,-.02);taskShade.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),taskDirection);taskShade.castShadow=true;room.add(taskShade);
  const diffuserMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(lampColor).multiplyScalar(2.2)});materials.push(diffuserMaterial);
  const diffuser=new THREE.Mesh(new THREE.CircleGeometry(.285,48),diffuserMaterial);diffuser.position.copy(taskShade.position).addScaledVector(taskDirection,.18);diffuser.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),taskDirection);room.add(diffuser);
  const taskLight=new THREE.SpotLight(lampColor,8,8,.95,.65,2);taskLight.position.copy(diffuser.position).addScaledVector(taskDirection,.045);taskLight.target.position.copy(consoleTarget);taskLight.castShadow=true;taskLight.shadow.mapSize.set(1024,1024);taskLight.shadow.bias=-.0004;taskLight.shadow.normalBias=.02;taskLight.shadow.radius=3;room.add(taskLight,taskLight.target);
  endItem('Desk lamp',false);
  // Nearby objects are reflected by the room probe, without a fake point-light bounce.

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

  // Dust occupies both the room and the task lamp's pool, drifting in slow air currents.
  const dustGeometry=new THREE.BufferGeometry();
  const dustPositions=new Float32Array(360*3);
  let dustSeed=431;
  const randomDust=()=>{dustSeed=dustSeed*16807%2147483647;return dustSeed/2147483647;};
  for(let i=0;i<360;i++){
    const nearDesk=i<210;
    dustPositions[i*3]=nearDesk?-3.85+randomDust()*3.8:-4.2+randomDust()*10;
    dustPositions[i*3+1]=-1.35+randomDust()*4.5;
    dustPositions[i*3+2]=nearDesk?-.75+randomDust()*2.3:-5.4+randomDust()*4.2;
  }
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dustMaterial=new THREE.ShaderMaterial({
    uniforms:{time:{value:0},pixelRatio:{value:1},lampPosition:{value:taskLight.position},
      lampDirection:{value:taskDirection},lampColor:{value:new THREE.Color(lampColor)},
      lampStrength:{value:1},lampOuter:{value:0},lampInner:{value:0}},transparent:true,depthWrite:false,
    vertexShader:`uniform float time;uniform float pixelRatio;
      uniform vec3 lampPosition;uniform vec3 lampDirection;uniform vec3 lampColor;
      uniform float lampStrength;uniform float lampOuter;uniform float lampInner;
      varying float visibility;varying vec3 moteColor;
      void main(){
        float phase=position.x*7.3+position.z*4.1;
        vec3 p=position;
        // Distinct fall speeds plus overlapping eddies avoid synchronized bobbing.
        float height=mod(position.y+1.35-time*(.025+.012*sin(phase)),4.5);
        p.y=height-1.35;
        p.x+=sin(time*.48+phase)*.14+sin(time*.17+phase*2.3)*.18;
        p.z+=sin(time*.31+phase*1.7)*.13;
        vec3 ray=p-lampPosition;
        float cone=smoothstep(lampOuter,lampInner,dot(normalize(ray),lampDirection));
        float warm=cone*lampStrength/(1.0+dot(ray,ray)*.2);
        visibility=.75*warm*smoothstep(0.0,.25,height)*(1.0-smoothstep(4.2,4.5,height));
        moteColor=lampColor;
        vec4 viewPosition=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*viewPosition;
        gl_PointSize=clamp(12.0/-viewPosition.z,.8,1.8)*pixelRatio;
      }`,
    fragmentShader:`varying float visibility;varying vec3 moteColor;
      void main(){float r=length(gl_PointCoord-.5)*2.0;
      if(r>1.0)discard;gl_FragColor=vec4(moteColor,(1.0-smoothstep(.05,1.0,r))*visibility);}`
  });materials.push(dustMaterial);
  const dust=new THREE.Points(dustGeometry,dustMaterial);dust.frustumCulled=false;room.add(dust);

  // Capture the actual room from the glass, excluding the screen itself to avoid feedback.
  // This is a static environment probe, not a painted reflection or screen-space approximation.
  const reflectionTarget=new THREE.WebGLCubeRenderTarget(window.innerWidth < 600 ? 512 : 1024,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType});
  const probe=new THREE.CubeCamera(.05,45,reflectionTarget);probe.position.set(0,.11,.83);
  let reflectionRevision=getReflectionRevision();
  let environment:THREE.WebGLRenderTarget|undefined;
  let deskOn=true, bedsideOn=true;
  function applyLighting(){
    const p=getLighting();
    ambient.intensity=p.ambient;fill.intensity=p.fill;room.environmentIntensity=p.environment;
    lamp.intensity=bedsideOn?p.bedside:0;taskLight.intensity=deskOn?p.desk:0;moon.intensity=p.window;
    // UI shows the full cone width; Three.js uses its half-angle in radians.
    const beamAngle=THREE.MathUtils.degToRad(p.deskBeamAngle/2);
    if(taskLight.angle!==beamAngle){taskLight.angle=beamAngle;renderer.shadowMap.needsUpdate=true;}
    dustMaterial.uniforms.lampOuter.value=Math.cos(beamAngle);
    dustMaterial.uniforms.lampInner.value=Math.cos(beamAngle*(1-taskLight.penumbra));
    lamp.color.set(p.lampColor);taskLight.color.set(p.lampColor);
    dustMaterial.uniforms.lampColor.value.set(p.lampColor);
    dustMaterial.uniforms.lampStrength.value=deskOn?p.desk/17.3:0;
    const bounceColor=p.lampColor===LIGHTING_DEFAULTS.lampColor?lampBounceColor:p.lampColor;
    warmBounce.color.set(bounceColor);
    warmBounce.intensity=bedsideOn?p.bedside/6*.8:0;
    diffuserMaterial.color.set(p.lampColor).multiplyScalar(deskOn?2.4*p.desk/17.6:0);
    shadeMat.emissive.set(p.lampColor===LIGHTING_DEFAULTS.lampColor?'#ef923b':p.lampColor);shadeMat.emissiveIntensity=bedsideOn?.35*p.bedside/6:0;
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
    editor?.hideHighlight();
    screen.visible=false;
    dust.visible=false;
    try { probe.update(renderer,room); }
    finally {
      screen.visible=previousVisibility;
      dust.visible=true;
      editor?.restoreHighlight();
      room.environment=previousEnvironment;
      renderer.shadowMap.autoUpdate=previousShadowUpdate;
    }
    const next=pmrem.fromCubemap(reflectionTarget.texture);pmrem.dispose();
    room.environment=next.texture;screenMaterial.envMap=next.texture;screenMaterial.needsUpdate=true;
    environment?.dispose();environment=next;
  }
  for(const item of layoutItems){
    const offset=new THREE.Vector3(...(LAYOUT_DEFAULTS[item.name]??[0,0,0]));
    item.objects.forEach(object=>object.position.add(offset));
  }
  // Keep the cup and its contents together around a local pivot after layout offsets.
  const cup=new THREE.Group();cup.position.copy(mug.position);room.add(cup);
  for(const part of [mug,coffee,handle])cup.attach(part);
  const cupRest=cup.position.clone();
  const puddleMaterial=mat('#251308',.16);
  const puddle=new THREE.Mesh(new THREE.CircleGeometry(1,48),puddleMaterial);
  const floorY=-2.17;
  puddle.rotation.x=-Math.PI/2;puddle.visible=false;room.add(puddle);
  // Curved ceramic pieces retain the cup's wall shape rather than becoming cubes.
  const shards=Array.from({length:20},(_,i)=>{
    const geometry=i<16
      ?new THREE.CylinderGeometry(.17,.15,.1,4,1,true,(i%8)*Math.PI/4,Math.PI/4*.92)
      :new THREE.TorusGeometry(.12,.033,5,6,Math.PI/2);
    const mesh=new THREE.Mesh(geometry,ceramic);mesh.visible=false;mesh.castShadow=true;mesh.receiveShadow=true;room.add(mesh);
    return {mesh,velocity:new THREE.Vector3(),spin:new THREE.Vector3()};
  });
  let cupState:'rest'|'falling'|'broken'='rest',debrisTime=0;
  const velocity=new THREE.Vector3(1.9,.15,.65);
  const interactionPoint=new THREE.Vector3();
  function smash(){
    cupState='broken';cup.visible=false;debrisTime=0;
    puddle.position.set(cup.position.x,floorY+.006,cup.position.z);
    puddle.scale.set(.4,.28,1);puddle.visible=true;
    shards.forEach((shard,i)=>{
      const angle=i*2.39996323,speed=.45+(i%5)*.19;
      shard.mesh.visible=true;shard.mesh.position.copy(cup.position);
      shard.mesh.position.y=floorY+.11+(i%3)*.025;
      shard.mesh.rotation.set(i*.7,i*1.3,i*.4);
      shard.velocity.set(Math.cos(angle)*speed+.45,.6+(i%4)*.24,Math.sin(angle)*speed);
      shard.spin.set(3+i%4,2-i%5,4-i%3);
    });
  }
  function interact(id:string){
    if(id==='desk')deskOn=!deskOn;
    if(id==='bedside')bedsideOn=!bedsideOn;
    if(id==='coffee'&&cupState==='rest')cupState='falling';
    applyLighting();renderer.shadowMap.needsUpdate=true;
    if(id!=='coffee')captureReflection();
    invalidate();
  }
  function stepCoffee(dt:number){
    if(cupState==='falling'){
      // Slide across the desktop, then lose support at its right edge.
      const supported=cup.position.x<3.3;
      if(!supported)velocity.y-=9.81*dt;
      cup.position.addScaledVector(velocity,dt);
      if(supported){cup.position.y=cupRest.y;velocity.y=0;}
      cup.rotation.z-=dt*(supported?1.1:5.5);cup.rotation.x+=dt*1.7;
      coffee.visible=cup.rotation.z>-.5;
      if(cup.position.y<=floorY+.16)smash();
    }else if(cupState==='broken'&&debrisTime<3){
      debrisTime+=dt;
      for(const shard of shards){
        shard.velocity.y-=9.81*dt;
        shard.mesh.position.addScaledVector(shard.velocity,dt);
        shard.mesh.rotation.x+=shard.spin.x*dt;shard.mesh.rotation.y+=shard.spin.y*dt;shard.mesh.rotation.z+=shard.spin.z*dt;
        if(shard.mesh.position.y<floorY+.045){
          shard.mesh.position.y=floorY+.045;
          shard.velocity.y=Math.abs(shard.velocity.y)>.35?-shard.velocity.y*.26:0;
          shard.velocity.x*=Math.exp(-dt*18);shard.velocity.z*=Math.exp(-dt*18);shard.spin.multiplyScalar(Math.exp(-dt*20));
        }
      }
    }
  }
  function updateInteractions(dt:number,reduced:boolean){
    if(cupState==='rest'||(cupState==='broken'&&debrisTime>=3))return;
    // Fixed-size substeps keep collision and bounce stable across frame rates.
    let remaining=reduced?4:Math.min(dt,.05);
    while(remaining>0){const step=Math.min(remaining,1/120);stepCoffee(step);remaining-=step;}
    renderer.shadowMap.needsUpdate=true;invalidate();
  }
  function interactionAnchors(width:number,height:number){
    return [{id:'desk',object:taskShade,label:deskOn?'Turn desk lamp off':'Turn desk lamp on'},
      {id:'bedside',object:shade,label:bedsideOn?'Turn bedside lamp off':'Turn bedside lamp on'},
      {id:'coffee',object:cup,label:'Knock coffee off desk'}].map(item=>{
        item.object.getWorldPosition(interactionPoint);interactionPoint.project(camera);
        return {id:item.id,label:item.label,available:item.id!=='coffee'||cupState==='rest',x:(interactionPoint.x+1)*width/2,y:(1-interactionPoint.y)*height/2};
      });
  }
  for(const material of materials){
    if(material instanceof THREE.MeshStandardMaterial)screenLightSampler.configureMaterial(material);
  }
  room.updateMatrixWorld(true);
  applyLighting();captureReflection();
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('devControls'))void import('./layoutEditor').then(({createLayoutEditor})=>{
    if(disposed)return;
    editor=createLayoutEditor(renderer,room,camera,layoutItems,invalidate,refreshLightingReflection);
    invalidate();
  });
  const anchor=new THREE.Vector3(),edge=new THREE.Vector3();
  const target=new THREE.Vector3(0,.11,.72);
  return {
    interact, updateInteractions, interactionAnchors,
    powerLightAnimating(){return performance.now()-ledTransitionStart<100;},
    setPowerHovered(value:boolean){if(powerHovered!==value){powerHovered=value;ledFrom=ledStrength;ledTo=value?2:1;ledTransitionStart=performance.now();invalidate();}},
    setEditingAvailable(value:boolean){editor?.setAvailable(value);},
    render(picture:THREE.Texture, width:number,height:number,progress:number,powered:boolean,time=0,returning=false,pullback=0,shutting=false) {
      dustMaterial.uniforms.time.value=time;
      dustMaterial.uniforms.pixelRatio.value=renderer.getDrawingBufferSize(new THREE.Vector2()).y/height;
      placePoster(width,height);
      applyLighting();
      if(reflectionRevision!==getReflectionRevision()){captureReflection();reflectionRevision=getReflectionRevision();}
      camera.aspect=width/height;
      const frame=bedroomCameraFrame(width,height,progress,returning);
      if(pullback>0){
        const rest=bedroomCameraFrame(width,height,0);
        frame.y=THREE.MathUtils.lerp(frame.y,rest.y,pullback);frame.z=THREE.MathUtils.lerp(frame.z,rest.z,pullback);
      }
      camera.position.set(frame.x,frame.y,frame.z);
      camera.lookAt(returning?new THREE.Vector3(0,frame.y,.72):target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      // The same glass/raster grows to match the viewport. No second image or
      // black-backed crossfade can dim or duplicate the particles during zoom.
      const takeover=frame.handoff;
      const halfHeight=(camera.position.z-screen.position.z)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
      const fitKey=takeover===0?'rest':`${takeover}:${halfHeight}:${camera.aspect}`;
      if(fitKey!==screenFitKey){
      screenFitKey=fitKey;
      const uvs=screenGeometry.attributes.uv;
      for(let i=0;i<positions.count;i++){
        positions.setXYZ(i,
          THREE.MathUtils.lerp(restingScreen[i*3],(uvs.getX(i)*2-1)*halfHeight*camera.aspect,takeover),
          THREE.MathUtils.lerp(restingScreen[i*3+1],(uvs.getY(i)*2-1)*halfHeight,takeover),
          restingScreen[i*3+2]*(1-takeover));
      }
      positions.needsUpdate=true;screenGeometry.computeVertexNormals();
      screenGeometry.computeBoundingSphere();
      }
      screenMaterial.emissiveMap=picture;
      screenMaterial.emissiveIntensity=powered?getLighting().screen:0;
      screenMaterial.color.set(powered?'#000000':'#080e13');
      ledMaterial.emissive.set(powered&&!shutting?'#9ee863':'#ff3b24');
      const ledProgress=Math.min(1,(performance.now()-ledTransitionStart)/100);
      ledStrength=powered?1:THREE.MathUtils.lerp(ledFrom,ledTo,ledProgress*ledProgress*(3-2*ledProgress));
      ledMaterial.emissiveIntensity=ledStrength;
      standby.color.copy(ledMaterial.emissive);standby.intensity=.085*ledStrength;
      screenLightSampler.update(picture,screenLight,powered,getLighting().screen);
      renderer.setRenderTarget(null);renderer.setClearColor('#090d15',1);atmosphere.render(renderer,room,camera,taskLight,progress,time,picture);
      anchor.copy(powerPosition).project(camera);edge.copy(powerPosition).add(new THREE.Vector3(.11,0,0)).project(camera);
      // Match the accessible DOM menu to the screen plane through the camera transition.
      screenGeometry.computeBoundingBox();
      const bounds=screenGeometry.boundingBox!;
      const topLeft=new THREE.Vector3(bounds.min.x,bounds.max.y,0).add(screen.position).project(camera);
      const bottomRight=new THREE.Vector3(bounds.max.x,bounds.min.y,0).add(screen.position).project(camera);
      const screenBlend=THREE.MathUtils.smoothstep(progress,.82,1);
      const sx=(topLeft.x+1)*width/2,sy=(1-topLeft.y)*height/2;
      return { x:(anchor.x+1)*width/2,y:(1-anchor.y)*height/2,size:Math.max(44,Math.abs(edge.x-anchor.x)*width),
        screen:{x:THREE.MathUtils.lerp(sx,0,screenBlend),y:THREE.MathUtils.lerp(sy,0,screenBlend),
          width:THREE.MathUtils.lerp((bottomRight.x-topLeft.x)*width/2,width,screenBlend),
          height:THREE.MathUtils.lerp((topLeft.y-bottomRight.y)*height/2,height,screenBlend)}};
    },
    dispose() {
      disposed=true;screenLightSampler.dispose();editor?.dispose();posterTexture.dispose();
      const geometries=new Set<THREE.BufferGeometry>();room.traverse(o=>{if(o instanceof THREE.Mesh)geometries.add(o.geometry);});
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());dustGeometry.dispose();grain.dispose();woodGrain.dispose();consoleLogo.dispose();environment?.dispose();reflectionTarget.dispose();
      atmosphere.dispose();lamp.dispose();moon.dispose();taskLight.dispose();
    },
  };
}
