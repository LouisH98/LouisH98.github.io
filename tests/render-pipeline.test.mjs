import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLinearTarget } from '../components/console/renderPipeline.ts';

test('lighting targets preserve HDR precision in linear colour space with a supported fallback', () => {
  for(const supported of [true,false]) {
    const renderer={extensions:{has:name=>name==='EXT_color_buffer_float'&&supported}};
    const target=createLinearTarget(renderer,640,480);
    assert.equal(target.texture.type,supported?THREE.HalfFloatType:THREE.UnsignedByteType);
    assert.equal(target.texture.colorSpace,THREE.LinearSRGBColorSpace);
    assert.equal(target.width,640);assert.equal(target.height,480);
    assert.equal(target.depthBuffer,true);
    target.dispose();
  }
});
