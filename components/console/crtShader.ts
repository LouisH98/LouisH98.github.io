import * as THREE from 'three';

/** One post-process pass over the complete boot picture, including its title. */
export function createCrtShader() {
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { picture: { value: target.texture }, amount: { value: 1 }, time: { value: 0 }, rasterSize: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `varying vec2 screenUV;
      void main() { screenUV = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D picture;
      uniform float amount;
      uniform float time;
      uniform vec2 rasterSize;
      varying vec2 screenUV;
      void main() {
        vec2 point = screenUV * 2.0 - 1.0;
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
        float scanline = 1.0 - amount * 0.38 * (0.5 + 0.5 * sin(uv.y * rasterSize.y * 3.14159265));
        float column = mod(floor(uv.x * rasterSize.x), 3.0);
        vec3 phosphor = column < 1.0 ? vec3(1.0, 0.78, 0.78) : column < 2.0 ? vec3(0.78, 1.0, 0.78) : vec3(0.78, 0.78, 1.0);
        float grain = fract(sin(dot(gl_FragCoord.xy + floor(time * 12.0), vec2(12.9898, 78.233))) * 43758.5453);
        color = color * edge * scanline * mix(vec3(1.0), phosphor, amount) * (1.0 + 0.13 * amount) + (grain - 0.5) * 0.006 * amount;
        gl_FragColor = vec4(max(color, vec3(0.0)) * inside, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));
  return {
    target,
    resize(width: number, height: number) { target.setSize(width, height); material.uniforms.rasterSize.value.set(width, height); },
    render(renderer: THREE.WebGLRenderer, amount: number, time: number) {
      material.uniforms.amount.value = amount; material.uniforms.time.value = time;
      renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera);
    },
    dispose() { target.dispose(); geometry.dispose(); material.dispose(); },
  };
}
