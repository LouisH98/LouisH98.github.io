import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderResolution } from '../lib/console/renderResolution.ts';

test('Retina room resolution increases independently of the PlayStation raster', () => {
  assert.deepEqual(renderResolution(1440,900,2), {
    roomWidth:2880,roomHeight:1800,uiWidth:1440,uiHeight:900,
  });
  assert.deepEqual(renderResolution(390,844,3), {
    roomWidth:780,roomHeight:1688,uiWidth:390,uiHeight:844,
  });
});

test('large displays bound room buffer memory and preserve the UI resolution cap', () => {
  const size=renderResolution(3840,2160,2);
  assert.equal(size.roomWidth,3840);
  assert.equal(size.roomHeight,2160);
  assert.equal(size.uiWidth,1440);
  assert.equal(size.uiHeight,810);
});
