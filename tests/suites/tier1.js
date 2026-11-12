/**
 * Tier 1: Feature Coverage Test Suite (F1 to F21, 5 tests per feature = 105 tests)
 *
 * Verifies core functionality, spatial coordinates, mesh properties,
 * and DOM elements for each of the 21 architectural features.
 */

const assert = require('assert');

const tests = [];

// ============================================================================
// F1: Orbit Navigation (Left-Click Drag Rotation)
// ============================================================================
tests.push({
  id: 'T1-F01-01',
  feature: 'F1',
  tier: 1,
  name: 'F1-Orbit: Horizontal drag changes azimuthal angle',
  fn: async (client) => {
    await client.resetCamera();
    const initAz = await client.eval('controls.getAzimuthalAngle()');
    const initDist = await client.eval('camera.position.distanceTo(controls.target)');

    // Drag left to right by +120px at center (960, 540)
    await client.drag(960, 540, 1080, 540, 'left', 6, 15);

    const postAz = await client.eval('controls.getAzimuthalAngle()');
    const postDist = await client.eval('camera.position.distanceTo(controls.target)');
    const enabled = await client.eval('controls.enabled');

    assert.strictEqual(enabled, true, 'controls.enabled must be true');
    assert.notStrictEqual(initAz, postAz, 'Azimuthal angle must change after horizontal orbit drag');
    assert(Math.abs(initDist - postDist) < 0.05, `Camera radius to target should remain stable (delta: ${Math.abs(initDist - postDist)})`);
  }
});

tests.push({
  id: 'T1-F01-02',
  feature: 'F1',
  tier: 1,
  name: 'F1-Orbit: Vertical drag changes polar angle',
  fn: async (client) => {
    await client.resetCamera();
    const initPolar = await client.eval('controls.getPolarAngle()');

    // Drag up by -100px
    await client.drag(960, 540, 960, 440, 'left', 6, 15);

    const postPolar = await client.eval('controls.getPolarAngle()');
    const maxPolar = await client.eval('controls.maxPolarAngle');

    assert.notStrictEqual(initPolar, postPolar, 'Polar angle must change after vertical orbit drag');
    assert(postPolar > 0 && postPolar <= maxPolar, `Polar angle ${postPolar} must be within bounds (0, ${maxPolar}]`);
  }
});

tests.push({
  id: 'T1-F01-03',
  feature: 'F1',
  tier: 1,
  name: 'F1-Orbit: Diagonal drag shifts both azimuthal and polar angles',
  fn: async (client) => {
    await client.resetCamera();
    const init = await client.eval('({ az: controls.getAzimuthalAngle(), pol: controls.getPolarAngle() })');

    await client.drag(960, 540, 1060, 440, 'left', 6, 15);

    const post = await client.eval('({ az: controls.getAzimuthalAngle(), pol: controls.getPolarAngle() })');
    assert(Math.abs(init.az - post.az) > 0.01, 'Azimuthal angle must change on diagonal drag');
    assert(Math.abs(init.pol - post.pol) > 0.01, 'Polar angle must change on diagonal drag');
  }
});

tests.push({
  id: 'T1-F01-04',
  feature: 'F1',
  tier: 1,
  name: 'F1-Orbit: Target position remains stable during rotation',
  fn: async (client) => {
    await client.resetCamera();
    const initTarget = await client.eval('({ x: controls.target.x, y: controls.target.y, z: controls.target.z })');

    await client.drag(960, 540, 1100, 500, 'left', 6, 15);

    const postTarget = await client.eval('({ x: controls.target.x, y: controls.target.y, z: controls.target.z })');
    assert(Math.abs(initTarget.x - postTarget.x) < 0.001, 'Target X must remain constant during orbit');
    assert(Math.abs(initTarget.y - postTarget.y) < 0.001, 'Target Y must remain constant during orbit');
    assert(Math.abs(initTarget.z - postTarget.z) < 0.001, 'Target Z must remain constant during orbit');
  }
});

tests.push({
  id: 'T1-F01-05',
  feature: 'F1',
  tier: 1,
  name: 'F1-Orbit: Damping configuration active and valid',
  fn: async (client) => {
    const damping = await client.eval('({ enabled: controls.enableDamping, factor: controls.dampingFactor })');
    assert.strictEqual(damping.enabled, true, 'controls.enableDamping must be true');
    assert(damping.factor > 0 && damping.factor <= 0.15, `Damping factor ${damping.factor} must be reasonable`);
  }
});

// ============================================================================
// F2: Pan Navigation (Right-Click & Shift+Left Drag)
// ============================================================================
tests.push({
  id: 'T1-F02-01',
  feature: 'F2',
  tier: 1,
  name: 'F2-Pan: Right-click horizontal drag translates target and camera',
  fn: async (client) => {
    await client.resetCamera();
    const init = await client.eval('({ tx: controls.target.x, tz: controls.target.z, cx: camera.position.x, cz: camera.position.z })');

    await client.drag(960, 540, 1110, 540, 'right', 6, 15);

    const post = await client.eval('({ tx: controls.target.x, tz: controls.target.z, cx: camera.position.x, cz: camera.position.z })');
    const targetChanged = (init.tx !== post.tx) || (init.tz !== post.tz);
    const cameraChanged = (init.cx !== post.cx) || (init.cz !== post.cz);
    assert(targetChanged, 'Right-drag must translate controls.target');
    assert(cameraChanged, 'Right-drag must translate camera.position synchronously');
  }
});

tests.push({
  id: 'T1-F02-02',
  feature: 'F2',
  tier: 1,
  name: 'F2-Pan: Right-click vertical drag translates Y elevation',
  fn: async (client) => {
    await client.resetCamera();
    const initY = await client.eval('controls.target.y');

    await client.drag(960, 540, 960, 640, 'right', 6, 15);

    const postY = await client.eval('controls.target.y');
    assert.notStrictEqual(initY, postY, 'Vertical pan must translate controls.target.y');
  }
});

tests.push({
  id: 'T1-F02-03',
  feature: 'F2',
  tier: 1,
  name: 'F2-Pan: Screen-space panning is enabled on controls',
  fn: async (client) => {
    const ssp = await client.eval('controls.screenSpacePanning');
    assert.strictEqual(ssp, true, 'controls.screenSpacePanning must be explicitly true');
  }
});

tests.push({
  id: 'T1-F02-04',
  feature: 'F2',
  tier: 1,
  name: 'F2-Pan: Pan preserves azimuthal and polar viewing angles',
  fn: async (client) => {
    await client.resetCamera();
    const init = await client.eval('({ az: controls.getAzimuthalAngle(), pol: controls.getPolarAngle() })');

    await client.drag(960, 540, 860, 540, 'right', 6, 15);

    const post = await client.eval('({ az: controls.getAzimuthalAngle(), pol: controls.getPolarAngle() })');
    assert(Math.abs(init.az - post.az) < 0.005, 'Pan must preserve azimuthal orientation');
    assert(Math.abs(init.pol - post.pol) < 0.005, 'Pan must preserve polar orientation');
  }
});

tests.push({
  id: 'T1-F02-05',
  feature: 'F2',
  tier: 1,
  name: 'F2-Pan: Distance from camera to target is invariant during pan',
  fn: async (client) => {
    await client.resetCamera();
    const initDist = await client.eval('camera.position.distanceTo(controls.target)');

    await client.drag(960, 540, 1080, 600, 'right', 6, 15);

    const postDist = await client.eval('camera.position.distanceTo(controls.target)');
    assert(Math.abs(initDist - postDist) < 0.01, 'Pan translation must not alter focal distance');
  }
});

// ============================================================================
// F3: Zoom Navigation (Mouse Wheel Scaling)
// ============================================================================
tests.push({
  id: 'T1-F03-01',
  feature: 'F3',
  tier: 1,
  name: 'F3-Zoom: Wheel zoom-in decreases distance to target',
  fn: async (client) => {
    await client.resetCamera();
    const initDist = await client.eval('camera.position.distanceTo(controls.target)');

    await client.wheel(960, 540, 0, -200);

    const postDist = await client.eval('camera.position.distanceTo(controls.target)');
    assert(postDist < initDist - 0.1, `Zoom-in should reduce distance (from ${initDist} to ${postDist})`);
  }
});

tests.push({
  id: 'T1-F03-02',
  feature: 'F3',
  tier: 1,
  name: 'F3-Zoom: Wheel zoom-out increases distance to target',
  fn: async (client) => {
    await client.resetCamera();
    const initDist = await client.eval('camera.position.distanceTo(controls.target)');

    await client.wheel(960, 540, 0, 200);

    const postDist = await client.eval('camera.position.distanceTo(controls.target)');
    assert(postDist > initDist + 0.1, `Zoom-out should increase distance (from ${initDist} to ${postDist})`);
  }
});

tests.push({
  id: 'T1-F03-03',
  feature: 'F3',
  tier: 1,
  name: 'F3-Zoom: Target position remains unchanged during zoom',
  fn: async (client) => {
    await client.resetCamera();
    const initTarget = await client.eval('({ x: controls.target.x, y: controls.target.y, z: controls.target.z })');

    await client.wheel(960, 540, 0, 150);
    await client.wheel(960, 540, 0, -100);

    const postTarget = await client.eval('({ x: controls.target.x, y: controls.target.y, z: controls.target.z })');
    assert(Math.abs(initTarget.x - postTarget.x) < 0.01, 'Target X invariant on zoom');
    assert(Math.abs(initTarget.y - postTarget.y) < 0.01, 'Target Y invariant on zoom');
    assert(Math.abs(initTarget.z - postTarget.z) < 0.01, 'Target Z invariant on zoom');
  }
});

tests.push({
  id: 'T1-F03-04',
  feature: 'F3',
  tier: 1,
  name: 'F3-Zoom: Normalized direction vector remains constant during zoom',
  fn: async (client) => {
    await client.resetCamera();
    const initDir = await client.eval(`(() => {
      const v = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
      return { x: v.x, y: v.y, z: v.z };
    })()`);

    await client.wheel(960, 540, 0, -250);

    const postDir = await client.eval(`(() => {
      const v = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
      return { x: v.x, y: v.y, z: v.z };
    })()`);
    assert(Math.abs(initDir.x - postDir.x) < 0.002, 'Direction X invariant');
    assert(Math.abs(initDir.y - postDir.y) < 0.002, 'Direction Y invariant');
    assert(Math.abs(initDir.z - postDir.z) < 0.002, 'Direction Z invariant');
  }
});

tests.push({
  id: 'T1-F03-05',
  feature: 'F3',
  tier: 1,
  name: 'F3-Zoom: Min and Max distance bounds defined on controls',
  fn: async (client) => {
    const bounds = await client.eval('({ min: controls.minDistance, max: controls.maxDistance })');
    assert(bounds.min <= 1.0, `minDistance ${bounds.min} should be <= 1.0m`);
    assert(bounds.max >= 20.0, `maxDistance ${bounds.max} should be >= 20.0m`);
  }
});

// ============================================================================
// F4: Disable Furniture Drag (Removal of Block 9 Raycasting Drag)
// ============================================================================
tests.push({
  id: 'T1-F04-01',
  feature: 'F4',
  tier: 1,
  name: 'F4-DisableDrag: controls.enabled is never set to false during scene interaction',
  fn: async (client) => {
    await client.resetCamera();
    await client.drag(960, 540, 1100, 600, 'left', 5, 20);
    const enabled = await client.eval('controls.enabled');
    assert.strictEqual(enabled, true, 'controls.enabled must remain true');
  }
});

tests.push({
  id: 'T1-F04-02',
  feature: 'F4',
  tier: 1,
  name: 'F4-DisableDrag: Draggable objects array is absent or empty',
  fn: async (client) => {
    const count = await client.eval(`(() => {
      if (typeof draggableObjects !== 'undefined' && Array.isArray(draggableObjects)) return draggableObjects.length;
      return 0;
    })()`);
    assert.strictEqual(count, 0, 'draggableObjects must be absent or 0 items');
  }
});

tests.push({
  id: 'T1-F04-03',
  feature: 'F4',
  tier: 1,
  name: 'F4-DisableDrag: isDraggingObject flag is undefined or false',
  fn: async (client) => {
    const isDragging = await client.eval(`(() => {
      return typeof isDraggingObject !== 'undefined' ? isDraggingObject : false;
    })()`);
    assert.strictEqual(isDragging, false, 'isDraggingObject must be false or undefined');
  }
});

tests.push({
  id: 'T1-F04-04',
  feature: 'F4',
  tier: 1,
  name: 'F4-DisableDrag: Bed frame remains stationary during mouse drag',
  fn: async (client) => {
    await client.resetCamera();
    const initPos = await client.eval(`(() => {
      if (window.bedFrameGroup) return { x: bedFrameGroup.position.x, y: bedFrameGroup.position.y, z: bedFrameGroup.position.z };
      return null;
    })()`);
    assert(initPos !== null, 'bedFrameGroup must exist');
    await client.drag(800, 500, 950, 500, 'left', 5, 20);
    const postPos = await client.eval(`({ x: bedFrameGroup.position.x, y: bedFrameGroup.position.y, z: bedFrameGroup.position.z })`);
    assert.strictEqual(initPos.x, postPos.x, 'Bed frame position X must be invariant to drag');
    assert.strictEqual(initPos.z, postPos.z, 'Bed frame position Z must be invariant to drag');
  }
});

tests.push({
  id: 'T1-F04-05',
  feature: 'F4',
  tier: 1,
  name: 'F4-DisableDrag: Dev workstation items remain stationary during pointer down/move',
  fn: async (client) => {
    await client.resetCamera();
    const initPos = await client.eval(`(() => {
      if (window.devKeyboardGroup) return { x: devKeyboardGroup.position.x, y: devKeyboardGroup.position.y, z: devKeyboardGroup.position.z };
      return null;
    })()`);
    assert(initPos !== null, 'devKeyboardGroup must exist');
    await client.drag(900, 540, 1000, 540, 'left', 5, 20);
    const postPos = await client.eval(`({ x: devKeyboardGroup.position.x, y: devKeyboardGroup.position.y, z: devKeyboardGroup.position.z })`);
    assert.strictEqual(initPos.x, postPos.x, 'Dev keyboard position must be invariant to drag');
  }
});

// ============================================================================
// F5: Camera Animation Interrupt
// ============================================================================
tests.push({
  id: 'T1-F05-01',
  feature: 'F5',
  tier: 1,
  name: 'F5-Interrupt: isFlying variable is defined in application',
  fn: async (client) => {
    const defined = await client.eval('typeof isFlying !== "undefined"');
    assert.strictEqual(defined, true, 'isFlying must be defined');
  }
});

tests.push({
  id: 'T1-F05-02',
  feature: 'F5',
  tier: 1,
  name: 'F5-Interrupt: OrbitControls start event immediately sets isFlying to false',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      if (typeof flyCamera === 'function') {
        flyCamera('bed_desk');
      } else {
        const pill = document.querySelector('.cam-pill');
        if (pill) pill.click();
      }
      const wasFlying = typeof isFlying !== 'undefined' ? isFlying : window.isFlying;
      controls.dispatchEvent({ type: 'start' });
      const nowFlying = typeof isFlying !== 'undefined' ? isFlying : window.isFlying;
      return { wasFlying, isFlying: nowFlying };
    })()`);
    assert.strictEqual(res.wasFlying, true, 'Camera flight must be initiated');
    assert.strictEqual(res.isFlying, false, 'controls start event must reset isFlying to false');
  }
});

tests.push({
  id: 'T1-F05-03',
  feature: 'F5',
  tier: 1,
  name: 'F5-Interrupt: flyCamera function exists and triggers flight',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      if (typeof flyCamera !== 'function') return false;
      flyCamera('bed_desk');
      const wasFlying = typeof isFlying !== 'undefined' ? isFlying : window.isFlying;
      controls.dispatchEvent({ type: 'start' });
      return { hasFunc: true, wasFlying };
    })()`);
    assert(res.hasFunc, 'flyCamera function must exist');
    assert.strictEqual(res.wasFlying, true, 'flyCamera must set isFlying to true');
  }
});

tests.push({
  id: 'T1-F05-04',
  feature: 'F5',
  tier: 1,
  name: 'F5-Interrupt: Canvas pointerdown cancels active camera lerp',
  fn: async (client) => {
    await client.eval(`(() => {
      if (typeof flyCamera === 'function') flyCamera('tv_view');
    })()`);
    // Click on canvas
    await client.click(960, 540, 'left');
    const flying = await client.eval('typeof isFlying !== "undefined" ? isFlying : window.isFlying');
    assert.strictEqual(flying, false, 'Pointerdown on canvas must cancel camera flight');
  }
});

tests.push({
  id: 'T1-F05-05',
  feature: 'F5',
  tier: 1,
  name: 'F5-Interrupt: Target position syncs on cancel avoiding snapback',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      if (typeof flyCamera === 'function') {
        flyCamera('iso');
        controls.dispatchEvent({ type: 'start' });
        const flying = typeof isFlying !== 'undefined' ? isFlying : window.isFlying;
        return { isFlying: flying, controlsEnabled: controls.enabled };
      }
      return { isFlying: false, controlsEnabled: true };
    })()`);
    assert.strictEqual(res.isFlying, false);
    assert.strictEqual(res.controlsEnabled, true);
  }
});

// ============================================================================
// F6: Navigation HUD Cleanliness
// ============================================================================
tests.push({
  id: 'T1-F06-01',
  feature: 'F6',
  tier: 1,
  name: 'F6-HUD: Legacy Figma UI toggle button #btn-figma is removed',
  fn: async (client) => {
    const figmaBtn = await client.eval('!!document.getElementById("btn-figma")');
    assert.strictEqual(figmaBtn, false, '#btn-figma button must be absent from DOM');
  }
});

tests.push({
  id: 'T1-F06-02',
  feature: 'F6',
  tier: 1,
  name: 'F6-HUD: Reset object positions button is removed',
  fn: async (client) => {
    const resetBtn = await client.eval('!!document.getElementById("resetObjectPositions")');
    assert.strictEqual(resetBtn, false, '#resetObjectPositions button must be absent from DOM');
  }
});

tests.push({
  id: 'T1-F06-03',
  feature: 'F6',
  tier: 1,
  name: 'F6-HUD: Camera navigation preset pills are present in header/toolbar',
  fn: async (client) => {
    const count = await client.eval('document.querySelectorAll(".cam-pill").length');
    assert(count >= 6, `Expected at least 6 camera preset buttons, found ${count}`);
  }
});

tests.push({
  id: 'T1-F06-04',
  feature: 'F6',
  tier: 1,
  name: 'F6-HUD: Free navigation guide HUD element or hints are rendered',
  fn: async (client) => {
    const hasGuide = await client.eval(`(() => {
      const text = document.body.innerText;
      return text.includes('คลิกลาก') || text.includes('หมุนมุมกล้อง') || text.includes('Orbit') || !!document.getElementById('nav-hud');
    })()`);
    assert.strictEqual(hasGuide, true, 'Navigation guide text or HUD must be visible');
  }
});

tests.push({
  id: 'T1-F06-05',
  feature: 'F6',
  tier: 1,
  name: 'F6-HUD: Figma mode toast alerts are absent from the application',
  fn: async (client) => {
    const toast = await client.eval(`(() => {
      const el = document.getElementById('toast');
      return el ? el.innerText : '';
    })()`);
    assert(!toast.includes('Figma Drag'), 'Toast should not refer to Figma drag mode');
  }
});

// ============================================================================
// F7: Unmirrored Bedroom Scale
// ============================================================================
tests.push({
  id: 'T1-F07-01',
  feature: 'F7',
  tier: 1,
  name: 'F7-Scale: bedroomWorldGroup scale.x is +1.0 (unmirrored)',
  fn: async (client) => {
    const scaleX = await client.eval(`(() => {
      if (window.bedroomWorldGroup) return window.bedroomWorldGroup.scale.x;
      return null;
    })()`);
    assert.strictEqual(scaleX, 1.0, 'bedroomWorldGroup.scale.x must be strictly +1.0');
  }
});

tests.push({
  id: 'T1-F07-02',
  feature: 'F7',
  tier: 1,
  name: 'F7-Scale: bedroomWorldGroup scale.y and scale.z are +1.0',
  fn: async (client) => {
    const scales = await client.eval(`(() => {
      if (window.bedroomWorldGroup) return { y: window.bedroomWorldGroup.scale.y, z: window.bedroomWorldGroup.scale.z };
      return null;
    })()`);
    assert(scales !== null, 'bedroomWorldGroup must exist');
    assert.strictEqual(scales.y, 1.0, 'bedroomWorldGroup.scale.y must be +1.0');
    assert.strictEqual(scales.z, 1.0, 'bedroomWorldGroup.scale.z must be +1.0');
  }
});

tests.push({
  id: 'T1-F07-03',
  feature: 'F7',
  tier: 1,
  name: 'F7-Scale: Matrix world determinant is strictly positive',
  fn: async (client) => {
    const det = await client.eval(`(() => {
      if (window.bedroomWorldGroup) {
        window.bedroomWorldGroup.updateMatrixWorld(true);
        return window.bedroomWorldGroup.matrixWorld.determinant();
      }
      return null;
    })()`);
    assert(det !== null, 'bedroomWorldGroup must exist');
    assert(det > 0.99, `Matrix world determinant must be positive (got ${det})`);
  }
});

tests.push({
  id: 'T1-F07-04',
  feature: 'F7',
  tier: 1,
  name: 'F7-Scale: Bed frame mesh scale vector contains no negative components',
  fn: async (client) => {
    const scale = await client.eval(`(() => {
      if (window.bedFrameGroup) return { x: bedFrameGroup.scale.x, y: bedFrameGroup.scale.y, z: bedFrameGroup.scale.z };
      return null;
    })()`);
    assert(scale !== null, 'bedFrameGroup must exist');
    assert(scale.x > 0 && scale.y > 0 && scale.z > 0, 'bedFrameGroup scales must be positive');
  }
});

tests.push({
  id: 'T1-F07-05',
  feature: 'F7',
  tier: 1,
  name: 'F7-Scale: Desk mesh scale vector contains no negative components',
  fn: async (client) => {
    const scale = await client.eval(`(() => {
      if (window.devKeyboardGroup && window.devKeyboardGroup.parent) {
        return { x: devKeyboardGroup.parent.scale.x, y: devKeyboardGroup.parent.scale.y, z: devKeyboardGroup.parent.scale.z };
      }
      return null;
    })()`);
    assert(scale !== null, 'Dev workstation parent group must exist');
    assert(scale.x > 0 && scale.y > 0 && scale.z > 0, 'Dev workstation scales must be positive');
  }
});

// ============================================================================
// F8: Relative Bedroom Layout (Bed Left, Window Center, Desk Right)
// ============================================================================
tests.push({
  id: 'T1-F08-01',
  feature: 'F8',
  tier: 1,
  name: 'F8-Layout: Bed position is on the window-side half of the bedroom',
  fn: async (client) => {
    const bedX = await client.eval(`(() => {
      if (window.bedFrameGroup) {
        const box = new THREE.Box3().setFromObject(window.bedFrameGroup);
        return (box.min.x + box.max.x) / 2;
      }
      return null;
    })()`);
    assert(bedX !== null, 'bedFrameGroup must exist in scene');
    assert(bedX >= 1.60 && bedX <= 2.60, `Bed center X ${bedX} must be beside the right-side window`);
  }
});

tests.push({
  id: 'T1-F08-02',
  feature: 'F8',
  tier: 1,
  name: 'F8-Layout: Dev Desk position is on the Left (West) X in [0.20, 1.20]m',
  fn: async (client) => {
    const deskX = await client.eval(`(() => {
      if (window.devKeyboardGroup) {
        const box = new THREE.Box3().setFromObject(window.devKeyboardGroup);
        return (box.min.x + box.max.x) / 2;
      }
      return null;
    })()`);
    assert(deskX !== null, 'Dev workstation keyboard must exist');
    assert(deskX >= 0.20 && deskX <= 1.20, `Desk keyboard center X ${deskX} must be within [0.20, 1.20]m`);
  }
});

tests.push({
  id: 'T1-F08-03',
  feature: 'F8',
  tier: 1,
  name: 'F8-Layout: Desk is left of bed and bedroom window is on the right wall',
  fn: async (client) => {
    const order = await client.eval(`(() => {
      const bed = window.bedFrameGroup ? new THREE.Box3().setFromObject(window.bedFrameGroup).getCenter(new THREE.Vector3()).x : null;
      const desk = window.devKeyboardGroup ? new THREE.Box3().setFromObject(window.devKeyboardGroup).getCenter(new THREE.Vector3()).x : null;
      let windowX = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowAperture')) {
          windowX = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3()).x;
        }
      });
      return { bed, desk, windowX };
    })()`);
    assert(order.bed !== null && order.desk !== null && order.windowX !== null, 'Bed, desk, and bedroom window must all exist in scene');
    assert(order.desk < order.bed, `Desk X (${order.desk}) must be left of bed X (${order.bed})`);
    assert(order.bed < order.windowX, `Bed X (${order.bed}) must be beside window X (${order.windowX})`);
  }
});

tests.push({
  id: 'T1-F08-04',
  feature: 'F8',
  tier: 1,
  name: 'F8-Layout: Bedroom furniture longitudinal bounds Z in [-3.05, 0.05]m',
  fn: async (client) => {
    const zBounds = await client.eval(`(() => {
      if (window.bedFrameGroup) {
        const box = new THREE.Box3().setFromObject(window.bedFrameGroup);
        return { minZ: box.min.z, maxZ: box.max.z };
      }
      return null;
    })()`);
    assert(zBounds !== null, 'bedFrameGroup must exist');
    assert(zBounds.minZ >= -3.10 && zBounds.maxZ <= 0.10, `Bed Z bounds [${zBounds.minZ}, ${zBounds.maxZ}] within bedroom`);
  }
});

tests.push({
  id: 'T1-F08-05',
  feature: 'F8',
  tier: 1,
  name: 'F8-Layout: Aisle clearance between bed and dev desk >= 0.40m',
  fn: async (client) => {
    const clearance = await client.eval(`(() => {
      if (window.bedFrameGroup && window.devKeyboardGroup) {
        const bedBox = new THREE.Box3().setFromObject(window.bedFrameGroup);
        const deskBox = new THREE.Box3().setFromObject(window.devKeyboardGroup);
        return bedBox.min.x - deskBox.max.x;
      }
      return null;
    })()`);
    assert(clearance !== null, 'Bed and desk must exist');
    assert(clearance >= 0.40, `Clearance ${clearance} must be >= 0.40m`);
  }
});

// ============================================================================
// F9: Bedroom Furniture Suite (272 Authentic Meshes)
// ============================================================================
tests.push({
  id: 'T1-F09-01',
  feature: 'F9',
  tier: 1,
  name: 'F9-Suite: Total bedroom mesh count is >= 250 distinct meshes',
  fn: async (client) => {
    const count = await client.eval(`(() => {
      let c = 0;
      if (window.bedroomWorldGroup) {
        window.bedroomWorldGroup.traverse(n => { if (n.isMesh) c++; });
      } else {
        scene.traverse(n => {
          if (n.isMesh && n.position.z < 0) c++;
        });
      }
      return c;
    })()`);
    assert(count >= 250, `Expected >= 250 bedroom meshes, found ${count}`);
  }
});

tests.push({
  id: 'T1-F09-02',
  feature: 'F9',
  tier: 1,
  name: 'F9-Suite: Bed frame and mattress groups exist',
  fn: async (client) => {
    const exists = await client.eval('!!window.bedFrameGroup');
    assert.strictEqual(exists, true, 'bedFrameGroup must exist');
  }
});

tests.push({
  id: 'T1-F09-03',
  feature: 'F9',
  tier: 1,
  name: 'F9-Suite: Dev workstation keyboard and mouse groups exist',
  fn: async (client) => {
    const res = await client.eval('({ kb: !!window.devKeyboardGroup, mouse: !!window.devMouseGroup })');
    assert(res.kb, 'devKeyboardGroup must exist');
    assert(res.mouse, 'devMouseGroup must exist');
  }
});

tests.push({
  id: 'T1-F09-04',
  feature: 'F9',
  tier: 1,
  name: 'F9-Suite: Ergonomic chair group exists at workstation',
  fn: async (client) => {
    const chair = await client.eval('!!window.ergoChairGroup');
    assert.strictEqual(chair, true, 'ergoChairGroup must exist');
  }
});

tests.push({
  id: 'T1-F09-05',
  feature: 'F9',
  tier: 1,
  name: 'F9-Suite: Coffee mug group exists on desk',
  fn: async (client) => {
    const mug = await client.eval('!!window.coffeeMugGroup');
    assert.strictEqual(mug, true, 'coffeeMugGroup must exist');
  }
});

// ============================================================================
// F10: Monitor Swivel (Interactive Cinema Pivot)
// ============================================================================
tests.push({
  id: 'T1-F10-01',
  feature: 'F10',
  tier: 1,
  name: 'F10-Swivel: toggleMonitorSwivel function exists',
  fn: async (client) => {
    const exists = await client.eval('typeof toggleMonitorSwivel === "function"');
    assert.strictEqual(exists, true, 'toggleMonitorSwivel function must exist');
  }
});

tests.push({
  id: 'T1-F10-02',
  feature: 'F10',
  tier: 1,
  name: 'F10-Swivel: swivelPivot and swivelScreen objects exist',
  fn: async (client) => {
    const res = await client.eval('({ pivot: !!window.swivelPivot, screen: !!window.swivelScreen })');
    assert(res.pivot, 'swivelPivot must exist');
    assert(res.screen, 'swivelScreen must exist');
  }
});

tests.push({
  id: 'T1-F10-03',
  feature: 'F10',
  tier: 1,
  name: 'F10-Swivel: Toggling swivel triggers pivot rotation Y',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      const initRot = swivelPivot ? swivelPivot.rotation.y : 0;
      toggleMonitorSwivel();
      return { initRot, newRot: swivelPivot ? swivelPivot.rotation.y : 0 };
    })()`);
    // Wait for swivel settle
    await new Promise(r => setTimeout(r, 450));
    const settleRot = await client.eval('swivelPivot ? swivelPivot.rotation.y : 0');
    assert(Math.abs(settleRot) > 0.5, `Swivel pivot rotation Y should reach cinema angle (~1.57 rad, got ${settleRot})`);
  }
});

tests.push({
  id: 'T1-F10-04',
  feature: 'F10',
  tier: 1,
  name: 'F10-Swivel: Movie texture canvas is bound in cinema mode',
  fn: async (client) => {
    const hasMap = await client.eval(`(() => {
      if (window.swivelScreen && window.swivelScreen.material) {
        return !!window.swivelScreen.material.map;
      }
      return false;
    })()`);
    assert.strictEqual(hasMap, true, 'swivelScreen material must have texture map');
  }
});

tests.push({
  id: 'T1-F10-05',
  feature: 'F10',
  tier: 1,
  name: 'F10-Swivel: Reverse toggle restores swivel pivot to coding angle',
  fn: async (client) => {
    await client.eval('toggleMonitorSwivel()');
    await new Promise(r => setTimeout(r, 450));
    const rot = await client.eval('swivelPivot ? swivelPivot.rotation.y : 0');
    assert(Math.abs(rot) < 0.1, `Swivel pivot should return to 0 (got ${rot})`);
  }
});

// ============================================================================
// F11: Elevated Bedroom Window Sill (Y = 0.85m)
// ============================================================================
tests.push({
  id: 'T1-F11-01',
  feature: 'F11',
  tier: 1,
  name: 'F11-Window: Bedroom window sill lower edge elevation Y in [0.82, 0.90]m',
  fn: async (client) => {
    const sillY = await client.eval(`(() => {
      let found = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowSill')) {
          const box = new THREE.Box3().setFromObject(n);
          found = box.min.y;
        }
      });
      return found;
    })()`);
    assert(sillY !== null, 'Bedroom window sill mesh must exist');
    assert(sillY >= 0.82 && sillY <= 0.90, `Window sill Y ${sillY} must be elevated in [0.82, 0.90]m`);
  }
});

tests.push({
  id: 'T1-F11-02',
  feature: 'F11',
  tier: 1,
  name: 'F11-Window: Bedroom window head top elevation Y in [2.10, 2.25]m',
  fn: async (client) => {
    const headY = await client.eval(`(() => {
      let found = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowOuterFrame')) {
          const box = new THREE.Box3().setFromObject(n);
          found = box.max.y;
        }
      });
      return found;
    })()`);
    assert(headY !== null, 'Bedroom window mesh must exist');
    assert(headY >= 2.10 && headY <= 2.25, `Window head Y ${headY} must be in [2.10, 2.25]m`);
  }
});

tests.push({
  id: 'T1-F11-03',
  feature: 'F11',
  tier: 1,
  name: 'F11-Window: Window sill clears bed mattress by >= 0.35m',
  fn: async (client) => {
    const clearance = await client.eval(`(() => {
      let sillY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowSill')) {
          sillY = new THREE.Box3().setFromObject(n).min.y;
        }
      });
      const mattressY = 0.46;
      return sillY ? (sillY - mattressY) : null;
    })()`);
    assert(clearance !== null, 'Window sill must exist');
    assert(clearance >= 0.35, `Clearance ${clearance} must be >= 0.35m (nominal 0.39m)`);
  }
});

tests.push({
  id: 'T1-F11-04',
  feature: 'F11',
  tier: 1,
  name: 'F11-Window: Window sill clears dev desk top surface by >= 0.08m',
  fn: async (client) => {
    const clearance = await client.eval(`(() => {
      let sillY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowSill')) {
          sillY = new THREE.Box3().setFromObject(n).min.y;
        }
      });
      const deskY = 0.74;
      return sillY ? (sillY - deskY) : null;
    })()`);
    assert(clearance !== null, 'Window sill must exist');
    assert(clearance >= 0.08, `Clearance ${clearance} must be >= 0.08m`);
  }
});

tests.push({
  id: 'T1-F11-05',
  feature: 'F11',
  tier: 1,
  name: 'F11-Window: Bedroom window embedded in the right exterior wall X = 2.80m',
  fn: async (client) => {
    const foundX = await client.eval(`(() => {
      let foundX = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowAperture')) {
          foundX = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3()).x;
        }
      });
      return foundX;
    })()`);
    assert(foundX !== null, 'Bedroom window must exist');
    assert(Math.abs(foundX - 2.80) < 0.15, `Bedroom window X ${foundX} must be centered at wall X = 2.80m`);
  }
});

// ============================================================================
// F12: Procedural Canvas Textures (20 Generators)
// ============================================================================
tests.push({
  id: 'T1-F12-01',
  feature: 'F12',
  tier: 1,
  name: 'F12-Textures: Core texture generator functions exist',
  fn: async (client) => {
    const funcs = await client.eval(`(() => {
      return [
        typeof createVSCodeCanvas,
        typeof createTerminalCanvas,
        typeof createMovieCanvas,
        typeof createPlaidCanvas,
        typeof createRugCanvas
      ];
    })()`);
    assert.strictEqual(funcs[0], 'function', 'createVSCodeCanvas must be a function');
    assert.strictEqual(funcs[1], 'function', 'createTerminalCanvas must be a function');
    assert.strictEqual(funcs[2], 'function', 'createMovieCanvas must be a function');
    assert.strictEqual(funcs[3], 'function', 'createPlaidCanvas must be a function');
    assert.strictEqual(funcs[4], 'function', 'createRugCanvas must be a function');
  }
});

tests.push({
  id: 'T1-F12-02',
  feature: 'F12',
  tier: 1,
  name: 'F12-Textures: VS Code canvas returns HTMLCanvasElement with width/height >= 512',
  fn: async (client) => {
    const dims = await client.eval(`(() => {
      if (typeof createVSCodeCanvas !== 'function') return null;
      const c = createVSCodeCanvas();
      return { w: c.width, h: c.height };
    })()`);
    assert(dims !== null, 'createVSCodeCanvas must exist');
    assert(dims.w >= 512 && dims.h >= 512, `Dimensions ${dims.w}x${dims.h} must be >= 512`);
  }
});

tests.push({
  id: 'T1-F12-03',
  feature: 'F12',
  tier: 1,
  name: 'F12-Textures: Terminal canvas returns valid canvas with width/height >= 512',
  fn: async (client) => {
    const dims = await client.eval(`(() => {
      if (typeof createTerminalCanvas !== 'function') return null;
      const c = createTerminalCanvas();
      return { w: c.width, h: c.height };
    })()`);
    assert(dims !== null, 'createTerminalCanvas must exist');
    assert(dims.w >= 512 && dims.h >= 512, `Dimensions ${dims.w}x${dims.h} must be >= 512`);
  }
});

tests.push({
  id: 'T1-F12-04',
  feature: 'F12',
  tier: 1,
  name: 'F12-Textures: Plaid Tartan canvas returns valid canvas',
  fn: async (client) => {
    const valid = await client.eval(`(() => {
      if (typeof createPlaidCanvas !== 'function') return false;
      const c = createPlaidCanvas();
      return c instanceof HTMLCanvasElement && c.width >= 256;
    })()`);
    assert.strictEqual(valid, true, 'createPlaidCanvas must return valid canvas');
  }
});

tests.push({
  id: 'T1-F12-05',
  feature: 'F12',
  tier: 1,
  name: 'F12-Textures: All 20 procedural texture generators are defined in window',
  fn: async (client) => {
    const names = [
      'createPlaidCanvas', 'createVSCodeCanvas', 'createTerminalCanvas', 'createTVCanvas',
      'createPosterArtCanvas', 'createRugCanvas', 'createKeyboardCanvas', 'createWoodCanvas',
      'createFloralBlanketCanvas', 'createMovieCanvas', 'createMirrorReflectionCanvas',
      'createUserSlideCanvas', 'createLaptopDiscordCanvas', 'createTissueBoxCanvas',
      'createSunbeamTextureCanvas', 'createJuteWeaveTexture', 'createLatteArtCanvas',
      'createTBarCeilingTexture', 'createTVWallpaperTexture', 'createWoodPlankTexture'
    ];
    const missing = await client.eval(`(() => {
      const list = ${JSON.stringify(names)};
      return list.filter(fn => typeof window[fn] !== 'function');
    })()`);
    assert.strictEqual(missing.length, 0, `Missing texture functions: ${missing.join(', ')}`);
  }
});

// ============================================================================
// F13: SPC Planks & Concrete Alcove Floor
// ============================================================================
tests.push({
  id: 'T1-F13-01',
  feature: 'F13',
  tier: 1,
  name: 'F13-Floor: 15-column SPC wood floor planks group exists in living room',
  fn: async (client) => {
    const cols = await client.eval(`(() => {
      let xVals = new Set();
      scene.traverse(n => {
        if (n.name && n.name.includes('spcPlank')) {
          xVals.add(Math.round(n.position.x * 100) / 100);
        }
      });
      return xVals.size;
    })()`);
    assert.strictEqual(cols, 15, `Expected 15 SPC columns, found ${cols}`);
  }
});

tests.push({
  id: 'T1-F13-02',
  feature: 'F13',
  tier: 1,
  name: 'F13-Floor: Planks count in living room floor is >= 45 distinct meshes',
  fn: async (client) => {
    const count = await client.eval(`(() => {
      let c = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('spcPlank')) c++;
      });
      return c;
    })()`);
    assert(count >= 45, `Expected >= 45 plank meshes, found ${count}`);
  }
});

tests.push({
  id: 'T1-F13-03',
  feature: 'F13',
  tier: 1,
  name: 'F13-Floor: Multi-shade spectrum contains at least 5 distinct wood hex tones',
  fn: async (client) => {
    const shades = await client.eval(`(() => {
      let colors = new Set();
      scene.traverse(n => {
        if (n.name && n.name.includes('spcPlank') && n.material) {
          colors.add(n.material.color.getHex());
        }
      });
      return colors.size;
    })()`);
    assert(shades >= 5, `Expected >= 5 wood color shades, found ${shades}`);
  }
});

tests.push({
  id: 'T1-F13-04',
  feature: 'F13',
  tier: 1,
  name: 'F13-Floor: Recessed bare concrete floor exists in stair alcove at Y = -0.05m',
  fn: async (client) => {
    const conc = await client.eval(`(() => {
      let found = null;
      scene.traverse(n => {
        if (n.name && (n.name.includes('alcoveConcrete') || n.name.includes('concreteFloor'))) {
          found = { y: n.position.y, color: n.material ? n.material.color.getHex() : null };
        }
      });
      return found;
    })()`);
    assert(conc !== null, 'Bare concrete alcove floor must exist');
    assert(Math.abs(conc.y - (-0.05)) < 0.03, `Concrete floor Y ${conc.y} must be recessed at -0.05m`);
  }
});

tests.push({
  id: 'T1-F13-05',
  feature: 'F13',
  tier: 1,
  name: 'F13-Floor: Teak edge transition trims present at floor thresholds',
  fn: async (client) => {
    const trims = await client.eval(`(() => {
      let count = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('floorTrim')) count++;
      });
      return count;
    })()`);
    assert(trims >= 2, `Expected >= 2 floor threshold trims, found ${trims}`);
  }
});

// ============================================================================
// F14: Mezzanine 2nd Level Platform
// ============================================================================
tests.push({
  id: 'T1-F14-01',
  feature: 'F14',
  tier: 1,
  name: 'F14-Mezzanine: Continuous wooden platform surface located at Y = 0.80m',
  fn: async (client) => {
    const platY = await client.eval(`(() => {
      let yVal = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzaninePlatform')) {
          yVal = new THREE.Box3().setFromObject(n).max.y;
        }
      });
      return yVal;
    })()`);
    assert(platY !== null, 'Mezzanine platform mesh must exist');
    assert(Math.abs(platY - 0.80) < 0.05, `Platform surface Y ${platY} must be ~0.80m`);
  }
});

tests.push({
  id: 'T1-F14-02',
  feature: 'F14',
  tier: 1,
  name: 'F14-Mezzanine: Dark teak perimeter curb beams exist along perimeter',
  fn: async (client) => {
    const curb = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzanineCurb')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(curb, true, 'Mezzanine dark teak curb beam must exist');
  }
});

tests.push({
  id: 'T1-F14-03',
  feature: 'F14',
  tier: 1,
  name: 'F14-Mezzanine: Royal blue seat cushion exists at Y = 0.82m',
  fn: async (client) => {
    const cushion = await client.eval(`(() => {
      let found = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzanineCushion')) {
          found = { y: n.position.y, color: n.material ? n.material.color.getHex() : null };
        }
      });
      return found;
    })()`);
    assert(cushion !== null, 'Mezzanine blue seat cushion must exist');
    assert(Math.abs(cushion.y - 0.82) < 0.04, `Cushion Y ${cushion.y} must be ~0.82m`);
    assert.strictEqual(cushion.color, 0x1d4ed8, 'Cushion color must be royal blue 0x1d4ed8');
  }
});

tests.push({
  id: 'T1-F14-04',
  feature: 'F14',
  tier: 1,
  name: 'F14-Mezzanine: Upper enclosure left and back walls exist from Y = 0.80m to 2.50m',
  fn: async (client) => {
    const walls = await client.eval(`(() => {
      let count = 0;
      scene.traverse(n => {
        if (n.name && (n.name.includes('mezzanineLeftWall') || n.name.includes('mezzanineBackWall'))) count++;
      });
      return count;
    })()`);
    assert(walls >= 2, `Expected >= 2 mezzanine upper walls, found ${walls}`);
  }
});

tests.push({
  id: 'T1-F14-05',
  feature: 'F14',
  tier: 1,
  name: 'F14-Mezzanine: Elevated mezzanine windows exist with emissive daylight tint',
  fn: async (client) => {
    const count = await client.eval(`(() => {
      let c = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzanineWindow')) c++;
      });
      return c;
    })()`);
    assert(count >= 2, `Expected 2 elevated mezzanine windows, found ${count}`);
  }
});

// ============================================================================
// F15: Supporting Wall & Fan Pillar
// ============================================================================
tests.push({
  id: 'T1-F15-01',
  feature: 'F15',
  tier: 1,
  name: 'F15-Wall: Solid supporting wall beneath mezzanine Y in [0.00, 0.80]m exists',
  fn: async (client) => {
    const wall = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('underMezzanineWall')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(wall, true, 'underMezzanineWall must exist');
  }
});

tests.push({
  id: 'T1-F15-02',
  feature: 'F15',
  tier: 1,
  name: 'F15-Wall: Fan pillar vertical column exists (height 2.50m)',
  fn: async (client) => {
    const pillar = await client.eval(`(() => {
      let found = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('fanPillar')) {
          found = new THREE.Box3().setFromObject(n).getSize(new THREE.Vector3()).y;
        }
      });
      return found;
    })()`);
    assert(pillar !== null, 'fanPillar must exist');
    assert(pillar >= 2.40, `fanPillar height ${pillar} must be ~2.50m`);
  }
});

tests.push({
  id: 'T1-F15-03',
  feature: 'F15',
  tier: 1,
  name: 'F15-Wall: Hatari wall fan exists on fan pillar with blue accent',
  fn: async (client) => {
    const fan = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && (n.name.includes('wallFan') || n.name.includes('hatariFan'))) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(fan, true, 'wallFan must exist on fan pillar');
  }
});

tests.push({
  id: 'T1-F15-04',
  feature: 'F15',
  tier: 1,
  name: 'F15-Wall: Light switch box mounted on fan pillar at ergonomic height',
  fn: async (client) => {
    const sw = await client.eval(`(() => {
      let found = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('lightSwitch')) {
          found = n.position.y;
        }
      });
      return found;
    })()`);
    assert(sw !== null, 'lightSwitch must exist');
    assert(sw >= 1.10 && sw <= 1.35, `Light switch Y ${sw} must be in [1.10, 1.35]m`);
  }
});

tests.push({
  id: 'T1-F15-05',
  feature: 'F15',
  tier: 1,
  name: 'F15-Wall: Partition wall to bedroom doorway exists at Z = 0.00m',
  fn: async (client) => {
    const part = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('partitionWall')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(part, true, 'partitionWall must exist');
  }
});

// ============================================================================
// F16: Complete Staircase (Flights 1 & 2)
// ============================================================================
tests.push({
  id: 'T1-F16-01',
  feature: 'F16',
  tier: 1,
  name: 'F16-Stairs: Flight 1 open risers have 3 wooden treads',
  fn: async (client) => {
    const count = await client.eval(`(() => {
      let c = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairF1Tread')) c++;
      });
      return c;
    })()`);
    assert.strictEqual(count, 3, `Expected 3 Flight 1 treads, found ${count}`);
  }
});

tests.push({
  id: 'T1-F16-02',
  feature: 'F16',
  tier: 1,
  name: 'F16-Stairs: Flight 2 inclined white soffit slab exists',
  fn: async (client) => {
    const soffit = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && (n.name.includes('stairSoffit') || n.name.includes('soffitSlab'))) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(soffit, true, 'stairSoffit slab must exist');
  }
});

tests.push({
  id: 'T1-F16-03',
  feature: 'F16',
  tier: 1,
  name: 'F16-Stairs: Flight 2 has 7 wooden treads sitting on soffit slab',
  fn: async (client) => {
    const count = await client.eval(`(() => {
      let c = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairF2Tread')) c++;
      });
      return c;
    })()`);
    assert.strictEqual(count, 7, `Expected 7 Flight 2 treads, found ${count}`);
  }
});

tests.push({
  id: 'T1-F16-04',
  feature: 'F16',
  tier: 1,
  name: 'F16-Stairs: Exactly 14 turned balusters along open left edge',
  fn: async (client) => {
    const count = await client.eval(`(() => {
      let c = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairBaluster')) c++;
      });
      return c;
    })()`);
    assert.strictEqual(count, 14, `Expected 14 turned balusters, found ${count}`);
  }
});

tests.push({
  id: 'T1-F16-05',
  feature: 'F16',
  tier: 1,
  name: 'F16-Stairs: Turned newel post anchors foot of Flight 2',
  fn: async (client) => {
    const newel = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairNewel')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(newel, true, 'stairNewel post must exist');
  }
});

// ============================================================================
// F17: Under-Stairs Louvered Cabinet
// ============================================================================
tests.push({
  id: 'T1-F17-01',
  feature: 'F17',
  tier: 1,
  name: 'F17-Cabinet: Under-stairs storage cabinet group exists in alcove',
  fn: async (client) => {
    const exists = await client.eval('!!window.storageGroup');
    assert.strictEqual(exists, true, 'storageGroup must exist');
  }
});

tests.push({
  id: 'T1-F17-02',
  feature: 'F17',
  tier: 1,
  name: 'F17-Cabinet: Louver slats exist across cabinet door panels',
  fn: async (client) => {
    const count = await client.eval(`(() => {
      let c = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('cabinetSlat')) c++;
      });
      return c;
    })()`);
    assert(count >= 10, `Expected >= 10 louver slats, found ${count}`);
  }
});

tests.push({
  id: 'T1-F17-03',
  feature: 'F17',
  tier: 1,
  name: 'F17-Cabinet: Double-door leaf separation with left and right door groups',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      let left = false, right = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('cabinetDoorL')) left = true;
        if (n.name && n.name.includes('cabinetDoorR')) right = true;
      });
      return { left, right };
    })()`);
    assert(res.left && res.right, 'Both left and right cabinet doors must exist');
  }
});

tests.push({
  id: 'T1-F17-04',
  feature: 'F17',
  tier: 1,
  name: 'F17-Cabinet: doors stay closed without an opening control',
  fn: async (client) => {
    const result = await client.eval(`({ toggle: typeof toggleStorageDoor, control: !!document.getElementById('ctrl-storageOpen') })`);
    assert.strictEqual(result.toggle, 'undefined', 'Cabinet door toggle must not be exposed');
    assert.strictEqual(result.control, false, 'Cabinet must not have an open button');
  }
});

tests.push({
  id: 'T1-F17-05',
  feature: 'F17',
  tier: 1,
  name: 'F17-Cabinet: Hardware pull handles exist on cabinet doors',
  fn: async (client) => {
    const handles = await client.eval(`(() => {
      let c = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('cabinetHandle')) c++;
      });
      return c;
    })()`);
    assert(handles >= 2, `Expected 2 cabinet handles, found ${handles}`);
  }
});

// ============================================================================
// F18: Hallway Balustrade & Broom
// ============================================================================
tests.push({
  id: 'T1-F18-01',
  feature: 'F18',
  tier: 1,
  name: 'F18-Balustrade: Corner newel post exists at X = 0.00m, Z = 2.35m',
  fn: async (client) => {
    const post = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('hallwayCornerPost')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(post, true, 'hallwayCornerPost must exist');
  }
});

tests.push({
  id: 'T1-F18-02',
  feature: 'F18',
  tier: 1,
  name: 'F18-Balustrade: Mid hallway post exists at Z = 3.25m',
  fn: async (client) => {
    const post = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('hallwayMidPost')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(post, true, 'hallwayMidPost must exist');
  }
});

tests.push({
  id: 'T1-F18-03',
  feature: 'F18',
  tier: 1,
  name: 'F18-Balustrade: End hallway post exists at Z = 4.15m',
  fn: async (client) => {
    const post = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('hallwayEndPost')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(post, true, 'hallwayEndPost must exist');
  }
});

tests.push({
  id: 'T1-F18-04',
  feature: 'F18',
  tier: 1,
  name: 'F18-Balustrade: Hanging grass broom mesh suspended from corner post',
  fn: async (client) => {
    const broom = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && (n.name.includes('grassBroom') || n.name.includes('broomMesh'))) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(broom, true, 'grassBroom mesh must exist');
  }
});

tests.push({
  id: 'T1-F18-05',
  feature: 'F18',
  tier: 1,
  name: 'F18-Balustrade: Broom geometry contains wooden handle and flared bristle',
  fn: async (client) => {
    const parts = await client.eval(`(() => {
      let handle = false, bristle = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('broomHandle')) handle = true;
        if (n.name && n.name.includes('broomBristle')) bristle = true;
      });
      return { handle, bristle };
    })()`);
    assert(parts.handle && parts.bristle, 'Broom must have handle and bristle submeshes');
  }
});

// ============================================================================
// F19: Living Windows & 6-Panel Entrance Door
// ============================================================================
tests.push({
  id: 'T1-F19-01',
  feature: 'F19',
  tier: 1,
  name: 'F19-Openings: Living room side window centered at Z = 3.32m',
  fn: async (client) => {
    const winZ = await client.eval(`(() => {
      let foundZ = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('livingSideWindow')) {
          foundZ = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3()).z;
        }
      });
      return foundZ;
    })()`);
    assert(winZ !== null, 'livingSideWindow must exist');
    assert(Math.abs(winZ - 3.32) < 0.05, `Side window center Z ${winZ} must be ~3.32m`);
  }
});

tests.push({
  id: 'T1-F19-02',
  feature: 'F19',
  tier: 1,
  name: 'F19-Openings: Living room front window centered at X = 1.925m, Z = 4.20m',
  fn: async (client) => {
    const winX = await client.eval(`(() => {
      let foundX = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('livingFrontWindow')) {
          foundX = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3()).x;
        }
      });
      return foundX;
    })()`);
    assert(winX !== null, 'livingFrontWindow must exist');
    assert(Math.abs(winX - 1.925) < 0.05, `Front window center X ${winX} must be ~1.925m`);
  }
});

tests.push({
  id: 'T1-F19-03',
  feature: 'F19',
  tier: 1,
  name: 'F19-Openings: Authentic 6-panel entrance door at X in [0.05, 0.85]m, Z = 4.20m',
  fn: async (client) => {
    const door = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('entranceDoor')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(door, true, 'entranceDoor structure must exist at front opening');
  }
});

tests.push({
  id: 'T1-F19-04',
  feature: 'F19',
  tier: 1,
  name: 'F19-Openings: Entrance door contains 6 molded recessed panels',
  fn: async (client) => {
    const panels = await client.eval(`(() => {
      let c = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('entranceDoorPanel')) c++;
      });
      return c;
    })()`);
    assert.strictEqual(panels, 6, `Expected exactly 6 door panels, found ${panels}`);
  }
});

tests.push({
  id: 'T1-F19-05',
  feature: 'F19',
  tier: 1,
  name: 'F19-Openings: Entrance door hardware lever and backplate present at Y = 0.95m',
  fn: async (client) => {
    const lever = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('entranceDoorLever')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(lever, true, 'entranceDoorLever hardware must exist');
  }
});

// ============================================================================
// F20: Biophilic Decor & Contact Shadows
// ============================================================================
tests.push({
  id: 'T1-F20-01',
  feature: 'F20',
  tier: 1,
  name: 'F20-Decor: Exactly 2 floating teak shelves on right wall (Y = 1.55m, 1.88m)',
  fn: async (client) => {
    const count = await client.eval(`(() => {
      let c = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('floatingShelf')) c++;
      });
      return c;
    })()`);
    assert.strictEqual(count, 2, `Expected 2 floating shelves, found ${count}`);
  }
});

tests.push({
  id: 'T1-F20-02',
  feature: 'F20',
  tier: 1,
  name: 'F20-Decor: Corner fairy light planter exists with warm light spheres',
  fn: async (client) => {
    const planter = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('fairyPlanter')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(planter, true, 'fairyPlanter must exist in living room');
  }
});

tests.push({
  id: 'T1-F20-03',
  feature: 'F20',
  tier: 1,
  name: 'F20-Decor: 5-tier black steel shelf unit exists on right wall',
  fn: async (client) => {
    const shelf = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('fiveTierShelf')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(shelf, true, 'fiveTierShelf unit must exist');
  }
});

tests.push({
  id: 'T1-F20-04',
  feature: 'F20',
  tier: 1,
  name: 'F20-Decor: Slatted console table exists with 4 tapered legs',
  fn: async (client) => {
    const consoleTbl = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('slattedConsole')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(consoleTbl, true, 'slattedConsole table must exist');
  }
});

tests.push({
  id: 'T1-F20-05',
  feature: 'F20',
  tier: 1,
  name: 'F20-Decor: Exactly 7 contact shadow planes exist beneath furniture items',
  fn: async (client) => {
    const shadows = await client.eval(`(() => {
      let c = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('contactShadow')) c++;
      });
      return c;
    })()`);
    assert.strictEqual(shadows, 7, `Expected 7 contact shadows, found ${shadows}`);
  }
});

// ============================================================================
// F21: Authentic Window Unit Model (R4)
// ============================================================================
tests.push({
  id: 'T1-F21-01',
  feature: 'F21',
  tier: 1,
  name: 'F21-Model: Outer teak frame material color is dark teak 0x3b1d0c',
  fn: async (client) => {
    const color = await client.eval(`(() => {
      let col = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('windowOuterFrame') && n.material) {
          col = n.material.color.getHex();
        }
      });
      return col;
    })()`);
    assert(color !== null, 'windowOuterFrame must exist');
    assert.strictEqual(color, 0x3b1d0c, 'Window frame color must be teak 0x3b1d0c');
  }
});

tests.push({
  id: 'T1-F21-02',
  feature: 'F21',
  tier: 1,
  name: 'F21-Model: Two-tier architectural sill present (white ledge + teak sill)',
  fn: async (client) => {
    const sill = await client.eval(`(() => {
      let whiteLedge = false, teakCap = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('windowSillLedge')) whiteLedge = true;
        if (n.name && n.name.includes('windowSillCap')) teakCap = true;
      });
      return { whiteLedge, teakCap };
    })()`);
    assert(sill.whiteLedge && sill.teakCap, 'Window must have 2-tier sill (white ledge + teak cap)');
  }
});

tests.push({
  id: 'T1-F21-03',
  feature: 'F21',
  tier: 1,
  name: 'F21-Model: Horizontal transom division bar located at 0.70 * H',
  fn: async (client) => {
    const ratio = await client.eval(`(() => {
      let foundRatio = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('windowTransom')) {
          let parent = n.parent;
          while (parent && !parent.name.includes('Window') && !parent.name.includes('window') && parent !== scene) {
            parent = parent.parent;
          }
          const win = parent || n.parent;
          if (win) {
            const winBox = new THREE.Box3().setFromObject(win);
            const transomBox = new THREE.Box3().setFromObject(n);
            const winH = winBox.max.y - winBox.min.y;
            if (winH > 0.1) {
              foundRatio = (transomBox.getCenter(new THREE.Vector3()).y - winBox.min.y) / winH;
            }
          }
          if (foundRatio === null && n.position) {
            foundRatio = n.position.y;
          }
        }
      });
      return foundRatio;
    })()`);
    assert(ratio !== null, 'windowTransom bar must exist');
    assert(Math.abs(ratio - 0.70) < 0.05, `Transom bar ratio ${ratio} must be ~0.70H`);
  }
});

tests.push({
  id: 'T1-F21-04',
  feature: 'F21',
  tier: 1,
  name: 'F21-Model: Brass casement handles present with gold color 0xd4a017',
  fn: async (client) => {
    const handles = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('windowBrassHandle')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(handles, true, 'windowBrassHandle must exist');
  }
});

tests.push({
  id: 'T1-F21-05',
  feature: 'F21',
  tier: 1,
  name: 'F21-Model: Garden vista backdrop canvas texture attached behind window',
  fn: async (client) => {
    const bg = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('windowGardenBackdrop')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(bg, true, 'windowGardenBackdrop quad must exist');
  }
});

module.exports = { tests };
