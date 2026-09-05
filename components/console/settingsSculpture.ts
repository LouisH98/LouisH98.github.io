import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
/** Faceted glass clock, fitted to cf9Ht8OFyEM at 14–20 seconds. */
export function createSettingsSculpture() {
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(42,1,.1,60), group=new THREE.Group();
  camera.position.z=9;scene.add(group);
  const mapCanvas=document.createElement('canvas');mapCanvas.width=256;mapCanvas.height=128;
  const ctx=mapCanvas.getContext('2d')!;
  const gradient=ctx.createLinearGradient(0,0,256,128);
  [[0,'#322452'],[.15,'#8c85ba'],[.28,'#efffff'],[.38,'#615481'],[.55,'#282044'],[.68,'#aaa4da'],[.82,'#ffffff'],[1,'#3b345f']].forEach(([stop,color])=>gradient.addColorStop(stop as number,color as string));
  ctx.fillStyle=gradient;ctx.fillRect(0,0,256,128);
  const environment=new THREE.CanvasTexture(mapCanvas);environment.mapping=THREE.EquirectangularReflectionMapping;environment.colorSpace=THREE.SRGBColorSpace;
  // Transmission uses an opaque scene background, rather than the CSS behind the canvas.
  const backdropCanvas=document.createElement('canvas');backdropCanvas.width=512;backdropCanvas.height=512;
  const backdropContext=backdropCanvas.getContext('2d')!;
  const backdropGradient=backdropContext.createRadialGradient(200,250,25,200,250,370);
  backdropGradient.addColorStop(0,'#030109');backdropGradient.addColorStop(.38,'#100b23');backdropGradient.addColorStop(1,'#2b2148');
  backdropContext.fillStyle=backdropGradient;backdropContext.fillRect(0,0,512,512);
  const backdrop=new THREE.CanvasTexture(backdropCanvas);backdrop.colorSpace=THREE.SRGBColorSpace;scene.background=backdrop;
  scene.environment=environment;
  // Lightweight proxies appear only inside other pieces' background captures.
  // The final visible surfaces use the refractive shader below.
  const glass=new THREE.MeshPhongMaterial({color:0x9290b5,envMap:environment,reflectivity:.12,shininess:90,specular:0x697185,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide});
  const cubeGlass=glass.clone();cubeGlass.opacity=.28;
  const refraction=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{sceneTexture:{value:null},environmentTexture:{value:environment},resolution:{value:new THREE.Vector2(1,1)},bend:{value:.045},selectionGlow:{value:0}},
    vertexShader:`varying vec3 viewNormal; varying vec3 viewPosition;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.0);viewPosition=p.xyz;viewNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*p;}`,
    fragmentShader:`uniform sampler2D sceneTexture; uniform sampler2D environmentTexture;uniform vec2 resolution;uniform float bend;uniform float selectionGlow;
      varying vec3 viewNormal; varying vec3 viewPosition;
      void main(){
        vec3 n=normalize(viewNormal);if(!gl_FrontFacing)n=-n;
        vec3 eye=normalize(-viewPosition);
        vec3 ray=refract(-eye,n,1.0/1.45);
        vec2 uv=gl_FragCoord.xy/resolution;
        vec2 offset=(ray.xy/ max(abs(ray.z),.25)+eye.xy/max(abs(eye.z),.25))*bend;
        offset.x*=resolution.y/resolution.x;
        vec3 transmitted=vec3(texture2D(sceneTexture,clamp(uv+offset*1.025,vec2(.001),vec2(.999))).r,
          texture2D(sceneTexture,clamp(uv+offset,vec2(.001),vec2(.999))).g,
          texture2D(sceneTexture,clamp(uv+offset*.975,vec2(.001),vec2(.999))).b);
        vec3 r=reflect(-eye,n);vec2 envUV=vec2(atan(r.z,r.x)/6.2831853+.5,asin(clamp(r.y,-1.,1.))/3.1415926+.5);
        vec3 reflection=texture2D(environmentTexture,envUV).rgb;
        float fresnel=.025+.32*pow(1.-abs(dot(n,eye)),5.);
        vec3 glassColor=mix(transmitted*vec3(.97,.98,1.),reflection,fresnel);
        glassColor+=vec3(.035,.48,.9)*selectionGlow*(.28+.85*pow(1.-abs(dot(n,eye)),2.));
        gl_FragColor=vec4(glassColor,.9);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const glassMeshes:THREE.Mesh[]=[];
  const geometries:THREE.BufferGeometry[]=[];
  const objects:THREE.Group[]=[];
  for(let i=0;i<12;i++) {
    const a=i/12*Math.PI*2;
    const length=1.05+(Math.sin(i*4.1)+1)*.85;
    const geometry=new THREE.CylinderGeometry(.13+(i%3)*.04,.16+(i%3)*.035,length,6);geometries.push(geometry);
    const item=new THREE.Group();const mesh=new THREE.Mesh(geometry,glass);glassMeshes.push(mesh);item.add(mesh);
    // Coplanar spokes: every inner end meets the same circle, with no individual tilt.
    item.position.set(Math.cos(a)*(1.0+length/2),Math.sin(a)*(1.0+length/2),0);
    item.rotation.set(0,0,a-Math.PI/2);group.add(item);
  }
  for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2+.35, size=.4+(i%3)*.12;
    const geometry=new RoundedBoxGeometry(size,size,size,2,.025);geometries.push(geometry);
    const item=new THREE.Group();const mesh=new THREE.Mesh(geometry,cubeGlass);glassMeshes.push(mesh);item.add(mesh);
    item.position.set(Math.cos(a)*2.1,Math.sin(a)*2.1,.65+Math.sin(i)*.5);item.rotation.set(i*.7,i*.4,i*.2);group.add(item);objects.push(item);
  }
  scene.add(new THREE.AmbientLight(0x8b80cd,1.5));
  const light=new THREE.PointLight(0xc6f7ff,12,20);light.position.set(1,2,4);scene.add(light);
  const rim=new THREE.DirectionalLight(0x7765ff,1);rim.position.set(-3,-2,2);scene.add(rim);
  const layers=glassMeshes.map(mesh=>{
    const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
    const material=refraction.clone();material.uniforms.sceneTexture.value=target.texture;
    const original=(mesh.material as THREE.MeshPhongMaterial).clone();mesh.material=original;
    return {mesh,target,material,original,depth:0,glow:0};
  });
  let lastTime=0;
  return {
    scene,camera,
    render(renderer:THREE.WebGLRenderer,lights:THREE.Scene,lightsCamera:THREE.Camera){
      const size=renderer.getDrawingBufferSize(new THREE.Vector2());
      const captureWidth=size.x<500?192:320;
      const w=Math.min(size.x,captureWidth),h=Math.round(w*size.y/size.x);
      const previous=renderer.getRenderTarget();
      scene.updateMatrixWorld(true);
      const position=new THREE.Vector3();
      layers.forEach(layer=>{layer.mesh.getWorldPosition(position);layer.depth=position.applyMatrix4(camera.matrixWorldInverse).z;});
      // A separate background for each solid: exclude itself and foreground solids.
      // The captures use the transparent physical material, avoiding recursive feedback.
      for(const layer of layers){
        if(layer.target.width!==w||layer.target.height!==h)layer.target.setSize(w,h);
        layers.forEach(other=>{other.mesh.visible=other!==layer&&other.depth<layer.depth;other.mesh.material=other.original;});
        renderer.setRenderTarget(layer.target);renderer.clear();renderer.render(scene,camera);
        renderer.clearDepth();renderer.render(lights,lightsCamera);
        layer.material.uniforms.resolution.value.copy(size);
      }
      renderer.setRenderTarget(previous);
      layers.forEach(layer=>{layer.mesh.visible=true;layer.mesh.material=layer.material;});
      renderer.render(scene,camera);
      layers.forEach(layer=>{layer.mesh.material=layer.original;});
    },
    update(time:number,aspect:number,portrait:boolean,amount:number,selection:number,reduced:boolean){
      const dt=Math.min(.05,Math.max(0,time-lastTime));lastTime=time;
      const selectedCube=12+[0,2,4][selection%3],selectedShard=[1,5,9][selection%3];
      layers.forEach((layer,index)=>{
        const target=index===selectedCube?1:index===selectedShard?.72:0;
        layer.glow=THREE.MathUtils.lerp(layer.glow,target,reduced?1:1-Math.exp(-dt*7));
        layer.material.uniforms.selectionGlow.value=layer.glow;
        layer.original.emissive.setRGB(.025,.35,.8).multiplyScalar(layer.glow);
      });
      camera.aspect=aspect;camera.updateProjectionMatrix();
      group.position.set(portrait?0:-aspect*.78,portrait?1.2:0,0);
      group.scale.setScalar((portrait?.49:1)*(.35+.65*amount));
      // Broad, slow changes in foreshortening, as in the reference's glass wheel.
      // Rotate the entire plane so the spokes remain radial and coplanar.
      group.rotation.set(
        .14+Math.sin(time*.18)*.48,
        .48+Math.sin(time*.14+.2)*.65,
        time*.055+Math.sin(time*.11)*.12
      );
      objects.forEach((o,i)=>{o.rotation.x=time*.12+i*.7;o.rotation.y=time*.16+i*.4;});
    },
    dispose(){geometries.forEach(g=>g.dispose());glass.dispose();cubeGlass.dispose();refraction.dispose();layers.forEach(layer=>{layer.material.dispose();layer.original.dispose();layer.target.dispose();});backdrop.dispose();environment.dispose();}
  };
}
