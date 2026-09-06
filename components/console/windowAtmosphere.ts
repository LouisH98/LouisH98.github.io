import * as THREE from 'three';
import { createSourceBloom } from './sourceBloom';
import { createLinearTarget } from './renderPipeline';
import { getLighting } from '@/lib/console/lighting';
import { WINDOW_LIGHT } from '@/lib/console/windowLight';

/** Depth-aware scattering through the four window panes, bounded by opaque room geometry. */
export function createWindowAtmosphere(renderer: THREE.WebGLRenderer) {
  const target=createLinearTarget(renderer);
  const bloom=createSourceBloom(renderer);
  target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  const material=new THREE.ShaderMaterial({
    depthTest:false,depthWrite:false,dithering:true,
    uniforms:{vignetteStrength:{value:0},grainStrength:{value:0},contactStrength:{value:0},gradeStrength:{value:0},finishAmount:{value:1},grainTime:{value:0},resolution:{value:new THREE.Vector2(1,1)},bloomPicture:{value:bloom.texture},lampPosition:{value:new THREE.Vector3()},lampDirection:{value:new THREE.Vector3()},lampColor:{value:new THREE.Color()},lampStrength:{value:0},lampOuter:{value:0},lampInner:{value:0},lampShadow:{value:null},lampShadowMatrix:{value:new THREE.Matrix4()},density:{value:.045},windowOrigin:{value:new THREE.Vector3(...Object.values(WINDOW_LIGHT.origin))},lightDirection:{value:new THREE.Vector3(...Object.values(WINDOW_LIGHT.direction))},picture:{value:target.texture},sceneDepth:{value:target.depthTexture},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()}},
    vertexShader:`varying vec2 screenUV;
      void main(){screenUV=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
    fragmentShader:`uniform sampler2D picture;
      uniform sampler2D bloomPicture;
      uniform sampler2D sceneDepth;
      uniform float vignetteStrength;
      uniform float grainStrength;
      uniform float contactStrength;
      uniform float gradeStrength;
      uniform float finishAmount;
      uniform float grainTime;
      uniform vec2 resolution;
      uniform mat4 inverseProjection;
      uniform mat4 cameraWorld;
      uniform vec3 windowOrigin;
      uniform vec3 lightDirection;
      uniform float density;
      uniform vec3 lampPosition;
      uniform vec3 lampDirection;
      uniform vec3 lampColor;
      uniform float lampStrength;
      uniform float lampOuter;
      uniform float lampInner;
      uniform highp sampler2DShadow lampShadow;
      uniform mat4 lampShadowMatrix;
      varying vec2 screenUV;
      #include <common>
      #include <dithering_pars_fragment>
      // Integer avalanche hash: time changes the seed, never the pixel position.
      // This avoids the translated sine-hash pattern and its visible diagonal bands.
      uint grainHash(uint value){
        value^=value>>16u;
        value*=0x7feb352du;
        value^=value>>15u;
        value*=0x846ca68bu;
        value^=value>>16u;
        return value;
      }
      float filmNoise(vec2 pixel){
        uvec2 cell=uvec2(floor(pixel));
        uint seed=grainHash(uint(grainTime));
        uint spatial=grainHash(cell.x)^grainHash(cell.y+0x9e3779b9u);
        uint sampleA=grainHash(spatial^seed);
        uint sampleB=grainHash(sampleA+0x68bc21ebu);
        // Two independent samples give softer, centred grain than uniform speckle.
        return (float(sampleA>>8u)+float(sampleB>>8u))/16777216.0-1.0;
      }
      vec3 worldPoint(float depth){
        vec4 point=inverseProjection*vec4(screenUV*2.0-1.0,depth*2.0-1.0,1.0);
        return (cameraWorld*vec4(point.xyz/point.w,1.0)).xyz;
      }
      // Reconstruct nearby surfaces in view space: only short-range geometry
      // above the tangent plane contributes, avoiding dark silhouette halos.
      vec3 viewPoint(vec2 uv){
        float depth=texture2D(sceneDepth,uv).r;
        vec4 p=inverseProjection*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);
        return p.xyz/p.w;
      }
      float contactShade(){
        if(contactStrength<.001 || finishAmount<.001 || texture2D(sceneDepth,screenUV).r>=.99999)return 1.0;
        vec3 p=viewPoint(screenUV);
        vec2 texel=1.0/resolution;
        vec3 left=p-viewPoint(screenUV-vec2(texel.x,0.0));
        vec3 right=viewPoint(screenUV+vec2(texel.x,0.0))-p;
        vec3 down=p-viewPoint(screenUV-vec2(0.0,texel.y));
        vec3 up=viewPoint(screenUV+vec2(0.0,texel.y))-p;
        vec3 dx=abs(left.z)<abs(right.z)?left:right;
        vec3 dy=abs(down.z)<abs(up.z)?down:up;
        vec3 n=normalize(cross(dx,dy));
        if(dot(n,-p)<0.0)n=-n;
        float radius=.18;
        float projectedRadius=clamp(radius/(max(-p.z,.1)*inverseProjection[1][1])*.5,0.0,.035);
        float occlusion=0.0;
        for(int j=0;j<12;j++){
          float angle=float(j)*2.39996323;
          float ring=sqrt((float(j)+.5)/12.0);
          vec2 uv=screenUV+vec2(cos(angle)*resolution.y/resolution.x,sin(angle))*projectedRadius*ring;
          if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))continue;
          vec3 offset=viewPoint(uv)-p;
          float distance=length(offset);
          float horizon=max(dot(n,offset)/max(distance,.0001)-.12,0.0);
          occlusion+=horizon*(1.0-smoothstep(radius*.25,radius,distance));
        }
        return 1.0-clamp(occlusion/12.0*1.3*contactStrength,0.0,.22*contactStrength)*finishAmount;
      }
      void main(){
        vec3 surface=worldPoint(texture2D(sceneDepth,screenUV).r);
        vec3 origin=cameraWorld[3].xyz;
        vec3 delta=surface-origin;
        float distanceToSurface=min(length(delta),18.0);
        vec3 direction=normalize(delta);
        float stride=distanceToSurface/24.0;
        float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
        float opticalDepth=0.0;
        float lampDepth=0.0;
        for(int i=0;i<24;i++){
          vec3 p=origin+direction*(float(i)+jitter)*stride;
          vec3 lampRay=p-lampPosition;
          float lampDistance=length(lampRay);
          float cone=smoothstep(lampOuter,lampInner,dot(lampRay/max(lampDistance,.001),lampDirection));
          vec4 shadowPoint=lampShadowMatrix*vec4(p,1.0);
          vec3 shadowUV=shadowPoint.xyz/shadowPoint.w;
          float lit=0.0;
          if(shadowPoint.w>0.0 && all(greaterThanEqual(shadowUV,vec3(0.0))) && all(lessThanEqual(shadowUV,vec3(1.0)))){
            lit=texture(lampShadow,vec3(shadowUV.xy,shadowUV.z-.001));
          }
          lampDepth+=cone*lit*lampStrength*stride*density*.65/(1.0+lampDistance*lampDistance*.35);
          float travel=(p.x-windowOrigin.x)/lightDirection.x;
          // Trace back toward the window along the moonlight direction.
          vec2 pane=(p-windowOrigin-lightDirection*travel).yz;
          vec2 edge=1.0-smoothstep(vec2(1.02,.80),vec2(1.14,.92),abs(pane));
          vec2 mullion=smoothstep(vec2(.035),vec2(.075),abs(pane));
          float inside=edge.x*edge.y*mullion.x*mullion.y;
          float longitudinal=smoothstep(0.0,.18,travel)*(1.0-smoothstep(7.0,9.0,travel));
          float haze=.86+.14*sin(p.x*2.1+p.y*3.4+sin(p.z*1.7));
          opticalDepth+=inside*longitudinal*haze*exp(-max(travel,0.0)*.08)*stride*density;
        }
        float totalDepth=opticalDepth+lampDepth;
        float transmission=exp(-totalDepth);
        vec3 scattering=(vec3(.22,.34,.54)*opticalDepth+lampColor*lampDepth)/max(totalDepth,.00001);
        vec3 roomColor=texture2D(picture,screenUV).rgb;
        float bright=max(max(roomColor.r,roomColor.g),roomColor.b);
        float contact=mix(contactShade(),1.0,smoothstep(.45,1.5,bright));
        vec3 color=roomColor*contact*transmission+scattering*(1.0-transmission);
        color+=texture2D(bloomPicture,screenUV).rgb*.45;
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        // Finish in display space so grain remains fine and highlights stay clean.
        float luma=dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722));
        vec3 graded=gl_FragColor.rgb;
        graded*=mix(vec3(.97,.995,1.035),vec3(1.025,1.005,.98),smoothstep(.08,.7,luma));
        graded=mix(vec3(luma),graded,.97);
        graded=mix(gl_FragColor.rgb,graded,gradeStrength);
        vec2 edge=(screenUV-.5)*2.0;
        float vignette=1.0-vignetteStrength*smoothstep(.3,1.65,dot(edge,edge));
        float grain=filmNoise(gl_FragCoord.xy);
        graded=graded*vignette+grain*grainStrength*smoothstep(.015,.12,luma);
        gl_FragColor.rgb=mix(gl_FragColor.rgb,graded,finishAmount);
        #include <dithering_fragment>
      }`,
  });
  const scene=new THREE.Scene();scene.name="atmosphere";const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const geometry=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));
  const size=new THREE.Vector2();
  return {
    render(renderer:THREE.WebGLRenderer,room:THREE.Scene,view:THREE.PerspectiveCamera,lamp:THREE.SpotLight,progress=0,time=0){
      const lighting=getLighting();material.uniforms.density.value=lighting.haze;
      material.uniforms.vignetteStrength.value=lighting.vignette;
      material.uniforms.grainStrength.value=lighting.filmGrain;
      material.uniforms.contactStrength.value=lighting.contactShading;
      material.uniforms.gradeStrength.value=lighting.colorGrade;
      renderer.getDrawingBufferSize(size);
      material.uniforms.resolution.value.copy(size);
      material.uniforms.finishAmount.value=1-THREE.MathUtils.smoothstep(progress,0,1);
      material.uniforms.grainTime.value=Math.floor(time*1000)%16777216;
      if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);
      renderer.setRenderTarget(target);renderer.clear();renderer.render(room,view);
      bloom.render(target.texture,target.depthTexture!,view,lamp.position,size.x,size.y);
      material.uniforms.lampPosition.value.copy(lamp.position);
      material.uniforms.lampDirection.value.subVectors(lamp.target.position,lamp.position).normalize();
      material.uniforms.lampColor.value.copy(lamp.color);
      material.uniforms.lampStrength.value=lamp.shadow.map?lamp.intensity/8:0;
      material.uniforms.lampOuter.value=Math.cos(lamp.angle);
      material.uniforms.lampInner.value=Math.cos(lamp.angle*(1-lamp.penumbra));
      material.uniforms.lampShadow.value=lamp.shadow.map?.depthTexture ?? null;
      material.uniforms.lampShadowMatrix.value.copy(lamp.shadow.matrix);
      material.uniforms.inverseProjection.value.copy(view.projectionMatrixInverse);
      material.uniforms.cameraWorld.value.copy(view.matrixWorld);
      const previousToneMapping=renderer.toneMapping,previousExposure=renderer.toneMappingExposure;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=lighting.exposure;
      try { renderer.setRenderTarget(null);renderer.clear();renderer.render(scene,camera); }
      finally { renderer.toneMapping=previousToneMapping;renderer.toneMappingExposure=previousExposure; }
    },
    dispose(){bloom.dispose();target.depthTexture?.dispose();target.dispose();geometry.dispose();material.dispose();},
  };
}
