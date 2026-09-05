import * as THREE from 'three';

/** Sample 576 texels on the GPU, then asynchronously read just one RGBA pixel. */
export function createScreenLightSampler(renderer:THREE.WebGLRenderer){
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.UnsignedByteType,depthBuffer:false,stencilBuffer:false});
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{picture:{value:null as THREE.Texture|null}},
    vertexShader:'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader:`uniform sampler2D picture;
      void main(){vec3 sum=vec3(0.0);
        for(int y=0;y<18;y++)for(int x=0;x<32;x++){
          sum+=texture2D(picture,(vec2(float(x),float(y))+.5)/vec2(32.0,18.0)).rgb;
        }
        // Encode extra precision near black; no display colour conversion here.
        gl_FragColor=vec4(sqrt(clamp(sum/576.0,0.0,4.0)/4.0),1.0);
      }`,
  });
  const geometry=new THREE.PlaneGeometry(2,2),scene=new THREE.Scene();scene.name='screen light sample';
  scene.add(new THREE.Mesh(geometry,material));
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  // Exercise the shader/target during room setup, not on the power-on frame.
  const previous=renderer.getRenderTarget();
  renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(previous);
  const bytes=new Uint8Array(4),wanted=new THREE.Color(0,0,0),current=new THREE.Color(0,0,0);
  let pending=false,disposed=false,failed=false,lastSample=-Infinity,lastFrame=performance.now();
  const release=()=>{target.dispose();geometry.dispose();material.dispose();};
  return {
    update(picture:THREE.Texture,light:THREE.RectAreaLight,powered:boolean,brightness:number){
      const now=performance.now(),dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;
      if(!powered){wanted.setRGB(0,0,0);current.setRGB(0,0,0);light.intensity=0;return;}
      if(!failed&&!pending&&now-lastSample>=125){
        lastSample=now;pending=true;material.uniforms.picture.value=picture;
        const previous=renderer.getRenderTarget();
        renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(previous);
        void renderer.readRenderTargetPixelsAsync(target,0,0,1,1,bytes).then(()=>{
          if(!disposed)wanted.setRGB(4*(bytes[0]/255)**2,4*(bytes[1]/255)**2,4*(bytes[2]/255)**2);
        }).catch(()=>{failed=true;}).finally(()=>{pending=false;if(disposed)release();});
      }
      current.lerp(wanted,1-Math.exp(-dt/.18));
      const peak=Math.max(current.r,current.g,current.b);
      if(peak>1e-5)light.color.copy(current).multiplyScalar(1/peak);
      light.intensity=Math.min(4,peak*8)*brightness*1.5;
    },
    dispose(){disposed=true;if(!pending)release();},
  };
}
