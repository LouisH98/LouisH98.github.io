import * as THREE from 'three';

/** Average and smooth the picture entirely on the GPU. Even asynchronous pixel
 * readback can stall getBufferSubData for tens of milliseconds on some drivers. */
export function createScreenLightSampler(renderer:THREE.WebGLRenderer){
  const makeTarget=()=>new THREE.WebGLRenderTarget(1,1,{
    type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,
    depthBuffer:false,stencilBuffer:false,
  });
  let previous=makeTarget(),next=makeTarget();
  const spill={value:previous.texture};
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{picture:{value:null as THREE.Texture|null},history:{value:null as THREE.Texture|null},blend:{value:1},powered:{value:false}},
    vertexShader:'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader:`uniform sampler2D picture;uniform sampler2D history;
      uniform float blend;uniform bool powered;
      void main(){
        if(!powered){gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}
        vec3 sum=vec3(0.0);
        for(int y=0;y<18;y++)for(int x=0;x<32;x++){
          sum+=texture2D(picture,(vec2(float(x),float(y))+.5)/vec2(32.0,18.0)).rgb;
        }
        vec3 encoded=texture2D(history,vec2(.5)).rgb;
        vec3 current=mix(4.0*encoded*encoded,clamp(sum/576.0,0.0,4.0),blend);
        // Square-root encoding preserves dark colours on the RGBA8 fallback.
        gl_FragColor=vec4(sqrt(current/4.0),1.0);
      }`,
  });
  const geometry=new THREE.PlaneGeometry(2,2),scene=new THREE.Scene();scene.name='screen light sample';
  scene.add(new THREE.Mesh(geometry,material));
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  // Initialize both histories and compile before the power-on frame.
  const target=renderer.getRenderTarget();
  try {
    for(const history of [previous,next]){renderer.setRenderTarget(history);renderer.render(scene,camera);}
  } finally {renderer.setRenderTarget(target);}
  let lastFrame=performance.now(),disposed=false;
  return {
    /** The room has one RectAreaLight: the TV. Keep its physical geometry and
     * attenuation, replacing only its colour with the GPU-computed spill. */
    configureMaterial(material:THREE.MeshStandardMaterial){
      const compile=material.onBeforeCompile.bind(material),cacheKey=material.customProgramCacheKey();
      material.onBeforeCompile=function(shader,renderer){
        compile(shader,renderer);
        shader.uniforms.screenSpill=spill;
        shader.fragmentShader='uniform sampler2D screenSpill;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',
          THREE.ShaderChunk.lights_fragment_begin.replace('rectAreaLight = rectAreaLights[ i ];',`
            rectAreaLight = rectAreaLights[ i ];
            vec3 encodedSpill = texture2D(screenSpill, vec2(.5)).rgb;
            vec3 spillColor = 4.0 * encodedSpill * encodedSpill;
            float spillPeak = max(spillColor.r, max(spillColor.g, spillColor.b));
            // Most of the console picture is black. Lift sparse colour enough
            // to read on the desk, while keeping black dark and highlights bounded.
            rectAreaLight.color *= spillColor * (min(8.0, spillPeak * 32.0) / max(spillPeak, 0.00001));
          `));
      };
      material.customProgramCacheKey=()=>`${cacheKey}:gpu-screen-spill-v2`;
      material.needsUpdate=true;
    },
    update(picture:THREE.Texture,light:THREE.RectAreaLight,powered:boolean,brightness:number){
      if(disposed)return;
      const now=performance.now(),dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;
      light.color.setRGB(1,1,1);light.intensity=powered?brightness*1.5:0;
      material.uniforms.picture.value=picture;
      material.uniforms.history.value=previous.texture;
      material.uniforms.blend.value=1-Math.exp(-dt/.18);
      material.uniforms.powered.value=powered;
      const target=renderer.getRenderTarget();
      try {renderer.setRenderTarget(next);renderer.render(scene,camera);}
      finally {renderer.setRenderTarget(target);}
      [previous,next]=[next,previous];spill.value=previous.texture;
    },
    dispose(){if(disposed)return;disposed=true;previous.dispose();next.dispose();geometry.dispose();material.dispose();},
  };
}
