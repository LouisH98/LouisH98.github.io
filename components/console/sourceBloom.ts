import * as THREE from 'three';
import { createLinearTarget } from './renderPipeline';

/** Blur only visible HDR pixels belonging to the desk lamp, before tone mapping. */
export function createSourceBloom(renderer:THREE.WebGLRenderer) {
  const a=createLinearTarget(renderer),b=createLinearTarget(renderer);
  const vertexShader='varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
  const extract=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{
    picture:{value:a.texture},depth:{value:null as THREE.DepthTexture|null},
    inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},source:{value:new THREE.Vector3()},
  },vertexShader,fragmentShader:`varying vec2 uvScreen;uniform sampler2D picture;uniform sampler2D depth;
    uniform mat4 inverseProjection;uniform mat4 cameraWorld;uniform vec3 source;
    void main(){vec4 v=inverseProjection*vec4(uvScreen*2.0-1.0,texture2D(depth,uvScreen).r*2.0-1.0,1.0);
      vec3 world=(cameraWorld*vec4(v.xyz/v.w,1.0)).xyz;
      vec3 color=texture2D(picture,uvScreen).rgb;
      float peak=max(color.r,max(color.g,color.b));
      float mask=1.0-smoothstep(.32,.43,distance(world,source));
      gl_FragColor=vec4(color*smoothstep(.85,1.5,peak)*mask,1.0);
    }`});
  const blur=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:a.texture},stepUV:{value:new THREE.Vector2()}},vertexShader,
    fragmentShader:`varying vec2 uvScreen;uniform sampler2D picture;uniform vec2 stepUV;
      void main(){vec3 color=vec3(0.0);float total=0.0;
        for(int i=-8;i<=8;i++){float x=float(i);float weight=exp(-x*x/18.0);
          color+=texture2D(picture,clamp(uvScreen+stepUV*x,vec2(0.0),vec2(1.0))).rgb*weight;total+=weight;}
        gl_FragColor=vec4(color/total,1.0);
      }`});
  const geometry=new THREE.PlaneGeometry(2,2),quad=new THREE.Mesh(geometry,extract);
  const scene=new THREE.Scene();scene.name="bloom";const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);scene.add(quad);
  return {
    texture:a.texture,
    render(picture:THREE.Texture,depth:THREE.DepthTexture,view:THREE.PerspectiveCamera,source:THREE.Vector3,width:number,height:number){
      const w=Math.max(1,Math.round(width/2)),h=Math.max(1,Math.round(height/2));
      if(a.width!==w||a.height!==h){a.setSize(w,h);b.setSize(w,h);}
      extract.uniforms.picture.value=picture;extract.uniforms.depth.value=depth;
      extract.uniforms.inverseProjection.value.copy(view.projectionMatrixInverse);
      extract.uniforms.cameraWorld.value.copy(view.matrixWorld);extract.uniforms.source.value.copy(source);
      quad.material=extract;renderer.setRenderTarget(a);renderer.clear();renderer.render(scene,camera);
      quad.material=blur;blur.uniforms.picture.value=a.texture;blur.uniforms.stepUV.value.set(2/w,0);
      renderer.setRenderTarget(b);renderer.clear();renderer.render(scene,camera);
      blur.uniforms.picture.value=b.texture;blur.uniforms.stepUV.value.set(0,2/h);
      renderer.setRenderTarget(a);renderer.clear();renderer.render(scene,camera);
    },
    dispose(){a.dispose();b.dispose();extract.dispose();blur.dispose();geometry.dispose();},
  };
}
