import * as THREE from 'three';
import { createLinearTarget } from './renderPipeline';
import { getLighting } from '@/lib/console/lighting';
import { WINDOW_LIGHT } from '@/lib/console/windowLight';

/** Depth-aware scattering through the four window panes, bounded by opaque room geometry. */
export function createWindowAtmosphere(renderer: THREE.WebGLRenderer) {
  const target=createLinearTarget(renderer);
  target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  const material=new THREE.ShaderMaterial({
    depthTest:false,depthWrite:false,dithering:true,
    uniforms:{density:{value:.045},windowOrigin:{value:new THREE.Vector3(...Object.values(WINDOW_LIGHT.origin))},lightDirection:{value:new THREE.Vector3(...Object.values(WINDOW_LIGHT.direction))},picture:{value:target.texture},sceneDepth:{value:target.depthTexture},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()}},
    vertexShader:`varying vec2 screenUV;
      void main(){screenUV=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
    fragmentShader:`uniform sampler2D picture;
      uniform sampler2D sceneDepth;
      uniform mat4 inverseProjection;
      uniform mat4 cameraWorld;
      uniform vec3 windowOrigin;
      uniform vec3 lightDirection;
      uniform float density;
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
        for(int i=0;i<24;i++){
          vec3 p=origin+direction*(float(i)+jitter)*stride;
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
        float transmission=exp(-opticalDepth);
        vec3 color=texture2D(picture,screenUV).rgb*transmission+vec3(.22,.34,.54)*(1.0-transmission);
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <dithering_fragment>
      }`,
  });
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const geometry=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));
  const size=new THREE.Vector2();
  return {
    render(renderer:THREE.WebGLRenderer,room:THREE.Scene,view:THREE.PerspectiveCamera){
      const lighting=getLighting();material.uniforms.density.value=lighting.haze;
      renderer.getDrawingBufferSize(size);
      if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);
      renderer.setRenderTarget(target);renderer.clear();renderer.render(room,view);
      material.uniforms.inverseProjection.value.copy(view.projectionMatrixInverse);
      material.uniforms.cameraWorld.value.copy(view.matrixWorld);
      const previousToneMapping=renderer.toneMapping,previousExposure=renderer.toneMappingExposure;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=lighting.exposure;
      try { renderer.setRenderTarget(null);renderer.clear();renderer.render(scene,camera); }
      finally { renderer.toneMapping=previousToneMapping;renderer.toneMappingExposure=previousExposure; }
    },
    dispose(){target.depthTexture?.dispose();target.dispose();geometry.dispose();material.dispose();},
  };
}
