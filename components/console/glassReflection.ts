import * as THREE from 'three';

/** Box-projected local probe: each curved-glass fragment gets its own reflection ray.
 * The desk surface is the lower bound, so nearby keycaps don't behave like distant sky.
 * This remains an approximation for objects inside the bounds, not ray tracing.
 */
export function configureGlassReflection(material: THREE.MeshPhysicalMaterial) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vGlassWorldPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\nvGlassWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = 'varying vec3 vGlassWorldPosition;\n' + shader.fragmentShader;
    const projection = `
      vec3 localGlassReflection(vec3 direction) {
        const vec3 probePosition = vec3(0.0, 0.11, 0.83);
        const vec3 boundsMin = vec3(-4.5, -1.53, -5.9);
        const vec3 boundsMax = vec3(8.9, 5.6, 7.0);
        // Avoid infinities for rays parallel to a box face.
        vec3 safeDirection = mix(vec3(-1.0), vec3(1.0), step(vec3(0.0), direction))
          * max(abs(direction), vec3(0.00001));
        vec3 farDistances = max((boundsMin - vGlassWorldPosition) / safeDirection,
                                (boundsMax - vGlassWorldPosition) / safeDirection);
        float distanceToBox = min(min(farDistances.x, farDistances.y), farDistances.z);
        return normalize(vGlassWorldPosition + direction * distanceToBox - probePosition);
      }
    `;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <envmap_physical_pars_fragment>',
      projection + THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
        'envMapRotation * reflectVec, roughness',
        'envMapRotation * localGlassReflection(reflectVec), roughness',
      ),
    );
  };
  material.customProgramCacheKey = () => 'crt-local-box-reflection-v1';
}
