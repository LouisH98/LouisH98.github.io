import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLighting, LIGHTING_DEFAULTS } from '../lib/console/lighting.ts';

test('stored lighting settings clamp unsafe values and reject invalid data',()=>{
  assert.deepEqual(normalizeLighting(null),LIGHTING_DEFAULTS);
  const value=normalizeLighting({ambient:99,desk:-1,exposure:NaN,window:Infinity,lampColor:'not a colour'});
  assert.equal(value.ambient,1.5);assert.equal(value.desk,0);
  assert.equal(value.exposure,LIGHTING_DEFAULTS.exposure);assert.equal(value.window,LIGHTING_DEFAULTS.window);
  assert.equal(value.lampColor,LIGHTING_DEFAULTS.lampColor);
  assert.deepEqual(normalizeLighting({...LIGHTING_DEFAULTS,desk:12,lampColor:'#abcdef'}),{...LIGHTING_DEFAULTS,desk:12,lampColor:'#abcdef'});
});
