import * as THREE from 'three';
import { createLinearTarget } from './renderPipeline';
import { crtPowerFrame, crtPowerOffFrame } from '@/lib/console/crt';

/** One post-process pass over the complete boot picture, including its title. */
export function createCrtShader(renderer: THREE.WebGLRenderer) {
  const target = createLinearTarget(renderer);
  const scene = new THREE.Scene();scene.name="CRT";
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { picture: { value: target.texture }, amount: { value: 1 }, time: { value: 0 }, rasterSize: { value: new THREE.Vector2(1, 1) }, ignition: { value: new THREE.Vector3(0,0,0) }, warming: { value: false }, shutting: { value:false } },
    vertexShader: `varying vec2 screenUV;
      void main() { screenUV = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D picture;
      uniform float amount;
      uniform float time;
      uniform vec2 rasterSize;
      uniform vec3 ignition;
      uniform bool warming;
      uniform bool shutting;
      varying vec2 screenUV;
      void main() {
        vec2 screenPoint = screenUV * 2.0 - 1.0;
        // Compress the complete live picture into the growing electron raster.
        vec2 aperture = warming ? max(ignition.xy, vec2(0.001)) : vec2(1.0);
        vec2 point = screenPoint / aperture;
        // Barrel mapping bends the raster, not just the outline of the screen.
        vec2 curved = point * (1.0 + amount * 0.075 * dot(point, point));
        vec2 uv = curved * 0.5 + 0.5;
        float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        float fringe = amount * 0.0015 * dot(point, point);
        vec3 color;
        color.r = texture2D(picture, uv + vec2(fringe, 0.0)).r;
        color.g = texture2D(picture, uv).g;
        color.b = texture2D(picture, uv - vec2(fringe, 0.0)).b;
        float edge = 1.0 - amount * 0.42 * pow(clamp(length(point) * 0.72, 0.0, 1.0), 2.5);
        // Sine alternates at half-pixel centres; cosine was constant there.
        // Sample the warped UV so horizontal raster lines bend with the glass.
        // Wider, deeper phosphor gaps stay legible on the physical CRT.
        float scanline = 1.0 - amount * 0.48 * (0.5 + 0.5 * sin(uv.y * rasterSize.y * 3.14159265));
        float column = mod(floor(uv.x * rasterSize.x), 3.0);
        vec3 phosphor = column < 1.0 ? vec3(1.0, 0.78, 0.78) : column < 2.0 ? vec3(0.78, 1.0, 0.78) : vec3(0.78, 0.78, 1.0);
        float grain = fract(sin(dot(gl_FragCoord.xy + floor(time * 12.0), vec2(12.9898, 78.233))) * 43758.5453);
        color = color * edge * scanline * mix(vec3(1.0), phosphor, amount) * (1.0 + 0.13 * amount) + (grain - 0.5) * 0.006 * amount * smoothstep(0.0, 0.04, max(color.r, max(color.g, color.b)));
        if (warming) {
          // Concentrated phosphor energy belongs to the same aperture: no
          // independent centre dot or full-screen flash survives the expansion.
          float concentration = 1.0 - smoothstep(0.004, 0.24, ignition.y);
          float beam = exp(-pow(abs(point.y), 2.0) * 2.5);
          color = (color * (1.0 + concentration * 1.5)
            + vec3(0.45, 0.65, 0.85) * concentration * beam) * ignition.z;
        }
        vec3 outputColor=max(color,vec3(0.0))*inside;
        if(shutting){
          // A soft phosphor halo outlives the concentrated raster, in linear light.
          float halo=exp(-dot(screenPoint/vec2(.032,.025),screenPoint/vec2(.032,.025))*2.0);
          outputColor+=vec3(.55,.85,1.0)*halo*ignition.z*(1.0-smoothstep(.006,.05,ignition.x));
        }
        gl_FragColor = vec4(outputColor, warming ? 1.0 : texture2D(picture, uv).a * inside);
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));
  return {
    target,
    resize(width: number, height: number) { target.setSize(width, height); material.uniforms.rasterSize.value.set(width, height); },
    render(renderer: THREE.WebGLRenderer, amount: number, time: number, destination: THREE.WebGLRenderTarget | null = null, powerTime: number | null = null, shutdownTime:number|null=null) {
      material.uniforms.amount.value = amount; material.uniforms.time.value = time;
      // Keep raster structure visible when this texture is viewed on a smaller 3D screen.
      material.uniforms.rasterSize.value.set(destination ? Math.min(target.width,640) : target.width, destination ? Math.min(target.height,240) : target.height);
      material.uniforms.warming.value = powerTime !== null||shutdownTime!==null;
      material.uniforms.shutting.value=shutdownTime!==null;
      if (powerTime !== null||shutdownTime!==null) {
        const ignition=shutdownTime!==null?crtPowerOffFrame(shutdownTime):crtPowerFrame(powerTime!);
        material.uniforms.ignition.value.set(ignition.width,ignition.height,ignition.opacity);
      }
      renderer.setRenderTarget(destination); renderer.clear(); renderer.render(scene, camera);
    },
    dispose() { target.dispose(); geometry.dispose(); material.dispose(); },
  };
}
