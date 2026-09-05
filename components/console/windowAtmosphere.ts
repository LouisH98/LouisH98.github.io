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
    uniforms:{bloomPicture:{value:bloom.texture},lampPosition:{value:new THREE.Vector3()},lampDirection:{value:new THREE.Vector3()},lampColor:{value:new THREE.Color()},lampStrength:{value:0},lampOuter:{value:0},lampInner:{value:0},lampShadow:{value:null},lampShadowMatrix:{value:new THREE.Matrix4()},density:{value:.045},windowOrigin:{value:new THREE.Vector3(...Object.values(WINDOW_LIGHT.origin))},lightDirection:{value:new THREE.Vector3(...Object.values(WINDOW_LIGHT.direction))},picture:{value:target.texture},sceneDepth:{value:target.depthTexture},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()}},
    vertexShader:`varying vec2 screenUV;
      void main(){screenUV=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
    fragmentShader:`uniform sampler2D picture;
      uniform sampler2D bloomPicture;
      uniform sampler2D sceneDepth;
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
      vec3 worldPoint(float depth){
        vec4 point=inverseProjection*vec4(screenUV*2.0-1.0,depth*2.0-1.0,1.0);
        return (cameraWorld*vec4(point.xyz/point.w,1.0)).xyz;
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
        vec3 color=texture2D(picture,screenUV).rgb*transmission+scattering*(1.0-transmission);
        color+=texture2D(bloomPicture,screenUV).rgb*.45;
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <dithering_fragment>
      }`,
  });
  const scene=new THREE.Scene();scene.name="atmosphere";const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const geometry=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));
  const size=new THREE.Vector2();
  return {
    render(renderer:THREE.WebGLRenderer,room:THREE.Scene,view:THREE.PerspectiveCamera,lamp:THREE.SpotLight){
      const lighting=getLighting();material.uniforms.density.value=lighting.haze;
      renderer.getDrawingBufferSize(size);
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
