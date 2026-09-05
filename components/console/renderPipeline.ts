import * as THREE from 'three';

/** Keep light linear and unquantized until the final display pass. */
export function createLinearTarget(renderer: THREE.WebGLRenderer, width=1, height=1) {
  return new THREE.WebGLRenderTarget(width,height,{
    type:renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
    colorSpace:THREE.LinearSRGBColorSpace,
    depthBuffer:true,
  });
}
