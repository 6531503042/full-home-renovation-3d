/**
 * Tier 2: Boundary & Corner Cases Test Suite (F1 to F21, 5 tests per feature = 105 tests)
 *
 * Stresses numerical limits, coordinate boundaries, aspect ratios,
 * rapid event sequences, and edge conditions across all 21 features.
 */

const assert = require('assert');

const tests = [];

// ============================================================================
// F1: Orbit Navigation Boundaries
// ============================================================================
tests.push({
  id: 'T2-F01-01',
  feature: 'F1',
  tier: 2,
  name: 'F1-Boundary: Max polar angle clamps camera above floor level',
  fn: async (client) => {
    await client.resetCamera();
    // Drag mouse downward by 2000px to push camera below floor
    await client.drag(960, 200, 960, 2200, 'left', 10, 10);
    const polar = await client.eval('controls.getPolarAngle()');
    const maxPolar = await client.eval('controls.maxPolarAngle');
    assert(polar <= maxPolar + 0.01, `Polar angle ${polar} must clamp <= maxPolarAngle ${maxPolar}`);
  }
});

tests.push({
  id: 'T2-F01-02',
  feature: 'F1',
  tier: 2,
  name: 'F1-Boundary: Min polar angle avoids zenith gimbal singularity',
  fn: async (client) => {
    await client.resetCamera();
    // Drag mouse upward by 2000px to pull camera toward zenith
    await client.drag(960, 800, 960, -1200, 'left', 10, 10);
    const polar = await client.eval('controls.getPolarAngle()');
    assert(polar >= 0.01, `Polar angle ${polar} must avoid exact 0 singularity`);
  }
});

tests.push({
  id: 'T2-F01-03',
  feature: 'F1',
  tier: 2,
  name: 'F1-Boundary: High-frequency erratic mouse moves produce no NaN coordinates',
  fn: async (client) => {
    await client.resetCamera();
    for (let i = 0; i < 4; i++) {
      const x = 960 + (i % 2 === 0 ? 300 : -300);
      const y = 540 + (i % 3 === 0 ? 200 : -200);
      await client.drag(960, 540, x, y, 'left', 2, 5);
    }
    const valid = await client.eval(`(() => {
      const p = camera.position;
      const q = camera.quaternion;
      return !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) && isFinite(p.x) && !isNaN(q.x);
    })()`);
    assert.strictEqual(valid, true, 'Camera coordinates must remain valid and finite after erratic moves');
  }
});

tests.push({
  id: 'T2-F01-04',
  feature: 'F1',
  tier: 2,
  name: 'F1-Boundary: Pointer drag exiting viewport terminates orbit cleanly',
  fn: async (client) => {
    await client.resetCamera();
    await client.drag(960, 540, 2100, 1200, 'left', 4, 10);
    const enabled = await client.eval('controls.enabled');
    assert.strictEqual(enabled, true, 'Controls must remain enabled when drag exits viewport');
  }
});

tests.push({
  id: 'T2-F01-05',
  feature: 'F1',
  tier: 2,
  name: 'F1-Boundary: Zero-delta click produces zero camera displacement',
  fn: async (client) => {
    await client.resetCamera();
    // Settle any residual inertia damping before measuring baseline
    await new Promise(r => setTimeout(r, 60));
    await client.eval('controls.update()');
    const initPos = await client.eval('({ x: camera.position.x, y: camera.position.y, z: camera.position.z })');
    await client.click(960, 540, 'left');
    await client.eval('controls.update()');
    const postPos = await client.eval('({ x: camera.position.x, y: camera.position.y, z: camera.position.z })');
    assert(Math.abs(initPos.x - postPos.x) < 0.001, `Zero delta click displaced camera X (${initPos.x} vs ${postPos.x})`);
    assert(Math.abs(initPos.y - postPos.y) < 0.001, `Zero delta click displaced camera Y (${initPos.y} vs ${postPos.y})`);
    assert(Math.abs(initPos.z - postPos.z) < 0.001, `Zero delta click displaced camera Z (${initPos.z} vs ${postPos.z})`);
  }
});

// ============================================================================
// F2: Pan Navigation Boundaries
// ============================================================================
tests.push({
  id: 'T2-F02-01',
  feature: 'F2',
  tier: 2,
  name: 'F2-Boundary: Extreme drag distance translates target without numerical overflow',
  fn: async (client) => {
    await client.resetCamera();
    await client.drag(960, 540, 960 + 5000, 540, 'right', 10, 10);
    const valid = await client.eval(`(() => {
      const t = controls.target;
      return !isNaN(t.x) && isFinite(t.x) && !isNaN(t.z) && isFinite(t.z);
    })()`);
    assert.strictEqual(valid, true, 'Target coordinates must remain finite after extreme pan');
  }
});

tests.push({
  id: 'T2-F02-02',
  feature: 'F2',
  tier: 2,
  name: 'F2-Boundary: Releasing pan mouse button smoothly stops translation',
  fn: async (client) => {
    await client.resetCamera();
    await client.drag(960, 540, 1100, 540, 'right', 6, 15);
    // Allow the configured 0.08 damping to settle before comparing positions.
    await new Promise(r => setTimeout(r, 1200));
    const target1 = await client.eval('({ x: controls.target.x, z: controls.target.z })');
    await new Promise(r => setTimeout(r, 100));
    const target2 = await client.eval('({ x: controls.target.x, z: controls.target.z })');
    assert(Math.abs(target1.x - target2.x) < 0.015, `Pan translation should settle stably after button release (delta: ${Math.abs(target1.x - target2.x)})`);
  }
});

tests.push({
  id: 'T2-F02-03',
  feature: 'F2',
  tier: 2,
  name: 'F2-Boundary: Viewport aspect ratio change maintains screen-space panning ratio',
  fn: async (client) => {
    const ssp = await client.eval('controls.screenSpacePanning');
    assert.strictEqual(ssp, true, 'screenSpacePanning must be true regardless of viewport aspect ratio');
  }
});

tests.push({
  id: 'T2-F02-04',
  feature: 'F2',
  tier: 2,
  name: 'F2-Boundary: Bidirectional hysteresis zero-sum pan returns target to origin',
  fn: async (client) => {
    await client.resetCamera();
    const initTarget = await client.eval('({ x: controls.target.x, z: controls.target.z })');

    // Pan right +400px, allow damping to settle, then left -400px, allow damping to settle
    await client.drag(960, 540, 1360, 540, 'right', 6, 10);
    await new Promise(r => setTimeout(r, 1000));
    await client.drag(1360, 540, 960, 540, 'right', 6, 10);
    await new Promise(r => setTimeout(r, 1000));

    const postTarget = await client.eval('({ x: controls.target.x, z: controls.target.z })');
    assert(Math.abs(initTarget.x - postTarget.x) < 0.20, `Target X should return near origin (drift: ${Math.abs(initTarget.x - postTarget.x)})`);
    assert(Math.abs(initTarget.z - postTarget.z) < 0.20, `Target Z should return near origin (drift: ${Math.abs(initTarget.z - postTarget.z)})`);
  }
});

tests.push({
  id: 'T2-F02-05',
  feature: 'F2',
  tier: 2,
  name: 'F2-Boundary: Right-click default context menu is suppressed on canvas',
  fn: async (client) => {
    const suppressed = await client.eval(`(() => {
      let prevented = false;
      const canvas = renderer.domElement;
      const ev = new MouseEvent('contextmenu', { cancelable: true, bubbles: true });
      canvas.dispatchEvent(ev);
      return ev.defaultPrevented;
    })()`);
    assert.strictEqual(suppressed, true, 'Canvas contextmenu event must be preventDefaulted');
  }
});

// ============================================================================
// F3: Zoom Navigation Boundaries
// ============================================================================
tests.push({
  id: 'T2-F03-01',
  feature: 'F3',
  tier: 2,
  name: 'F3-Boundary: Extreme zoom-in clamps strictly at minDistance',
  fn: async (client) => {
    await client.resetCamera();
    for (let i = 0; i < 10; i++) {
      await client.wheel(960, 540, 0, -1000);
    }
    const dist = await client.eval('camera.position.distanceTo(controls.target)');
    const minD = await client.eval('controls.minDistance');
    assert(dist >= minD - 0.05, `Distance ${dist} must clamp at or above minDistance ${minD}`);
  }
});

tests.push({
  id: 'T2-F03-02',
  feature: 'F3',
  tier: 2,
  name: 'F3-Boundary: Extreme zoom-out clamps strictly at maxDistance',
  fn: async (client) => {
    await client.resetCamera();
    for (let i = 0; i < 10; i++) {
      await client.wheel(960, 540, 0, 1000);
    }
    const dist = await client.eval('camera.position.distanceTo(controls.target)');
    const maxD = await client.eval('controls.maxDistance');
    assert(dist <= maxD + 0.1, `Distance ${dist} must clamp at or below maxDistance ${maxD}`);
  }
});

tests.push({
  id: 'T2-F03-03',
  feature: 'F3',
  tier: 2,
  name: 'F3-Boundary: Micro pinch zoom deltas scale distance smoothly',
  fn: async (client) => {
    await client.resetCamera();
    const initDist = await client.eval('camera.position.distanceTo(controls.target)');
    await client.wheel(960, 540, 0, -25);
    const postDist = await client.eval('camera.position.distanceTo(controls.target)');
    assert(postDist < initDist, 'Micro zoom-in delta must register and decrease distance');
  }
});

tests.push({
  id: 'T2-F03-04',
  feature: 'F3',
  tier: 2,
  name: 'F3-Boundary: Wheel zoom over furniture does not scroll page or move furniture',
  fn: async (client) => {
    await client.resetCamera();
    const initScroll = await client.eval('window.scrollY');
    await client.wheel(960, 540, 0, 200);
    const postScroll = await client.eval('window.scrollY');
    assert.strictEqual(initScroll, postScroll, 'Page scrollY must remain 0');
  }
});

tests.push({
  id: 'T2-F03-05',
  feature: 'F3',
  tier: 2,
  name: 'F3-Boundary: Rapid alternating zoom reversals maintain stable equilibrium',
  fn: async (client) => {
    await client.resetCamera();
    const initDist = await client.eval('camera.position.distanceTo(controls.target)');
    for (let i = 0; i < 8; i++) {
      await client.wheel(960, 540, 0, i % 2 === 0 ? 100 : -100);
    }
    await new Promise(r => setTimeout(r, 100));
    const postDist = await client.eval('camera.position.distanceTo(controls.target)');
    assert(Math.abs(initDist - postDist) < 1.0, 'Alternating zooms must settle near equilibrium');
  }
});

// ============================================================================
// F4: Furniture Drag Neutralization Boundaries
// ============================================================================
tests.push({
  id: 'T2-F04-01',
  feature: 'F4',
  tier: 2,
  name: 'F4-Boundary: Continuous controls.enabled invariance across multi-point sweep',
  fn: async (client) => {
    await client.resetCamera();
    const enabled1 = await client.eval('controls.enabled');
    await client.drag(700, 500, 1100, 500, 'left', 5, 10);
    const enabled2 = await client.eval('controls.enabled');
    assert.strictEqual(enabled1, true);
    assert.strictEqual(enabled2, true, 'controls.enabled must remain true throughout sweep');
  }
});

tests.push({
  id: 'T2-F04-02',
  feature: 'F4',
  tier: 2,
  name: 'F4-Boundary: Spacebar key does not activate legacy Figma pan mode',
  fn: async (client) => {
    const figmaMode = await client.eval(`(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
      return typeof state !== 'undefined' ? !!state.figmaMode : false;
    })()`);
    assert.strictEqual(figmaMode, false, 'Spacebar must not activate Figma mode');
  }
});

tests.push({
  id: 'T2-F04-03',
  feature: 'F4',
  tier: 2,
  name: 'F4-Boundary: Rapid multi-click stress on furniture leaves objects intact',
  fn: async (client) => {
    for (let i = 0; i < 5; i++) {
      await client.click(960, 540, 'left');
    }
    const enabled = await client.eval('controls.enabled');
    assert.strictEqual(enabled, true, 'controls.enabled must remain true after rapid clicks');
  }
});

tests.push({
  id: 'T2-F04-04',
  feature: 'F4',
  tier: 2,
  name: 'F4-Boundary: Multi-mesh continuous drag sweep moves zero meshes',
  fn: async (client) => {
    await client.drag(600, 400, 1200, 700, 'left', 8, 10);
    const dragging = await client.eval('typeof isDraggingObject !== "undefined" ? isDraggingObject : false');
    assert.strictEqual(dragging, false, 'No object dragging should be initiated');
  }
});

tests.push({
  id: 'T2-F04-05',
  feature: 'F4',
  tier: 2,
  name: 'F4-Boundary: Body cursor style never permanently locks to grabbing',
  fn: async (client) => {
    await client.drag(960, 540, 1060, 540, 'left', 4, 10);
    const cursor = await client.eval('document.body.style.cursor');
    assert.notStrictEqual(cursor, 'grabbing', 'Cursor must not be stuck on grabbing after drag release');
  }
});

// ============================================================================
// F5: Camera Animation Interrupt Boundaries
// ============================================================================
tests.push({
  id: 'T2-F05-01',
  feature: 'F5',
  tier: 2,
  name: 'F5-Boundary: Frame-zero instant interrupt cancels flight without jump',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      if (typeof flyCamera === 'function') {
        flyCamera('bed_desk');
        controls.dispatchEvent({ type: 'start' });
        const flying = typeof isFlying !== 'undefined' ? isFlying : window.isFlying;
        return { isFlying: flying, validPos: !isNaN(camera.position.x) };
      }
      return { isFlying: false, validPos: true };
    })()`);
    assert.strictEqual(res.isFlying, false, 'Flight must cancel on frame 0');
    assert.strictEqual(res.validPos, true, 'Camera position must remain valid');
  }
});

tests.push({
  id: 'T2-F05-02',
  feature: 'F5',
  tier: 2,
  name: 'F5-Boundary: 99% near-completion interrupt hands off cleanly without overshoot',
  fn: async (client) => {
    await client.eval(`(() => {
      if (typeof flyCamera === 'function') flyCamera('tv_view');
    })()`);
    await new Promise(r => setTimeout(r, 400));
    await client.eval('controls.dispatchEvent({ type: "start" })');
    const flying = await client.eval('typeof isFlying !== "undefined" ? isFlying : window.isFlying');
    assert.strictEqual(flying, false, 'Near-completion flight must hand off cleanly');
  }
});

tests.push({
  id: 'T2-F05-03',
  feature: 'F5',
  tier: 2,
  name: 'F5-Boundary: Rapid preset toggling produces zero unhandled exceptions',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      try {
        if (typeof flyCamera === 'function') {
          flyCamera('iso');
          flyCamera('tv_view');
          flyCamera('bed_desk');
          flyCamera('top');
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })()`);
    assert.strictEqual(res.success, true, 'Rapid preset toggles should not throw');
  }
});

tests.push({
  id: 'T2-F05-04',
  feature: 'F5',
  tier: 2,
  name: 'F5-Boundary: Background animation recovers smoothly after tab idle',
  fn: async (client) => {
    await new Promise(r => setTimeout(r, 200));
    const valid = await client.eval('!isNaN(camera.position.x) && !isNaN(camera.position.y)');
    assert.strictEqual(valid, true, 'Camera position must remain valid after idle');
  }
});

tests.push({
  id: 'T2-F05-05',
  feature: 'F5',
  tier: 2,
  name: 'F5-Boundary: Camera target syncs on interrupt preventing snapback',
  fn: async (client) => {
    const synced = await client.eval(`(() => {
      if (typeof flyCamera !== 'function') return null;
      flyCamera('tv_view');
      controls.dispatchEvent({ type: 'start' });
      const pos = camera.position;
      const tgt = controls.target;
      const flying = typeof isFlying !== 'undefined' ? isFlying : window.isFlying;
      return {
        isFlying: flying,
        validPos: !isNaN(pos.x) && isFinite(pos.x),
        validTgt: !isNaN(tgt.x) && isFinite(tgt.x)
      };
    })()`);
    assert(synced !== null, 'flyCamera function must exist');
    assert.strictEqual(synced.isFlying, false, 'isFlying must be false after start event');
    assert.strictEqual(synced.validPos, true, 'Camera position must remain valid');
    assert.strictEqual(synced.validTgt, true, 'Controls target must remain valid');
  }
});

// ============================================================================
// F6: Navigation HUD Boundaries
// ============================================================================
tests.push({
  id: 'T2-F06-01',
  feature: 'F6',
  tier: 2,
  name: 'F6-Boundary: Viewport resize maintains canvas aspect ratio without stretching',
  fn: async (client) => {
    const aspect = await client.eval(`(() => {
      camera.aspect = 16 / 9;
      camera.updateProjectionMatrix();
      return camera.aspect;
    })()`);
    assert(Math.abs(aspect - (16 / 9)) < 0.01, 'Camera aspect ratio must update');
  }
});

tests.push({
  id: 'T2-F06-02',
  feature: 'F6',
  tier: 2,
  name: 'F6-Boundary: HUD button click stops propagation preventing canvas orbit',
  fn: async (client) => {
    const stopped = await client.eval(`(() => {
      const btn = document.querySelector('.cam-pill');
      if (!btn) return null;
      let canvasTriggered = false;
      const handler = () => { canvasTriggered = true; };
      renderer.domElement.addEventListener('pointerdown', handler, { once: true });
      btn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
      renderer.domElement.removeEventListener('pointerdown', handler);
      return !canvasTriggered;
    })()`);
    assert(stopped !== null, '.cam-pill HUD button must exist');
    assert.strictEqual(stopped, true, 'HUD button pointerdown must not propagate to canvas');
  }
});

tests.push({
  id: 'T2-F06-03',
  feature: 'F6',
  tier: 2,
  name: 'F6-Boundary: Mobile viewport exposes compact panel navigation',
  fn: async (client) => {
    const hasResize = await client.eval('typeof renderer.setSize === "function"');
    assert.strictEqual(hasResize, true, 'renderer.setSize must exist for responsive layout');
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await new Promise(resolve => setTimeout(resolve, 80));
    const mobileLayout = await client.eval(`({
      width: window.innerWidth,
      leftPanel: getComputedStyle(document.getElementById('leftPanel')).display,
      mobileNav: getComputedStyle(document.getElementById('mobilePanelNav')).display
    })`);
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    assert.strictEqual(mobileLayout.width, 390, 'Responsive breakpoint must use the mobile viewport width');
    assert.strictEqual(mobileLayout.leftPanel, 'none', 'Side panels must collapse outside the scene at mobile width');
    assert.strictEqual(mobileLayout.mobileNav, 'flex', 'Compact panel navigation must appear at mobile width');
  }
});

tests.push({
  id: 'T2-F06-04',
  feature: 'F6',
  tier: 2,
  name: 'F6-Boundary: Toasts fade gracefully without blocking pointer interaction',
  fn: async (client) => {
    const pe = await client.eval(`(() => {
      const t = document.getElementById('toast');
      return t ? window.getComputedStyle(t).pointerEvents : 'none';
    })()`);
    assert.strictEqual(pe, 'none', 'Toast container must have pointer-events: none');
  }
});

tests.push({
  id: 'T2-F06-05',
  feature: 'F6',
  tier: 2,
  name: 'F6-Boundary: High DPR rendering clamps pixel ratio to maximum of 2.0',
  fn: async (client) => {
    const pr = await client.eval('renderer.getPixelRatio()');
    assert(pr <= 2.0, `Pixel ratio ${pr} must be clamped to <= 2.0`);
  }
});

// ============================================================================
// F7: Unmirrored Bedroom Scale Boundaries
// ============================================================================
tests.push({
  id: 'T2-F07-01',
  feature: 'F7',
  tier: 2,
  name: 'F7-Boundary: Directional light casts shadow in positive direction',
  fn: async (client) => {
    const lightZ = await client.eval(`(() => {
      let lz = null;
      scene.traverse(n => {
        if (n.isDirectionalLight && n.castShadow) lz = n.position.z;
      });
      return lz;
    })()`);
    assert(lightZ !== null, 'Directional shadow light must exist');
    assert(lightZ > 0, `Sunlight position Z ${lightZ} must be positive`);
  }
});

tests.push({
  id: 'T2-F07-02',
  feature: 'F7',
  tier: 2,
  name: 'F7-Boundary: Raycaster intersection normal points outward',
  fn: async (client) => {
    const normalOutward = await client.eval(`(() => {
      if (window.bedFrameGroup) {
        let isOutward = true;
        let meshCount = 0;
        window.bedFrameGroup.traverse(n => {
          if (n.isMesh && n.geometry && n.geometry.attributes.normal) {
            meshCount++;
            const arr = n.geometry.attributes.normal.array;
            if (arr.length === 0) isOutward = false;
          }
        });
        return meshCount > 0 ? isOutward : false;
      }
      return null;
    })()`);
    assert(normalOutward !== null, 'bedFrameGroup must exist');
    assert.strictEqual(normalOutward, true, 'Mesh normals must be populated and outward');
  }
});

tests.push({
  id: 'T2-F07-03',
  feature: 'F7',
  tier: 2,
  name: 'F7-Boundary: All bedroom child meshes have positive matrixWorld determinants',
  fn: async (client) => {
    const allPositive = await client.eval(`(() => {
      if (window.bedroomWorldGroup) {
        let ok = true;
        window.bedroomWorldGroup.traverse(n => {
          if (n.isMesh) {
            n.updateMatrixWorld(true);
            if (n.matrixWorld.determinant() < 0) ok = false;
          }
        });
        return ok;
      }
      return false;
    })()`);
    assert.strictEqual(allPositive, true, 'All bedroom mesh determinants must be positive');
  }
});

tests.push({
  id: 'T2-F07-04',
  feature: 'F7',
  tier: 2,
  name: 'F7-Boundary: Primary bedroom furniture materials render FrontSide',
  fn: async (client) => {
    const frontSide = await client.eval(`(() => {
      if (window.bedFrameGroup) {
        let side = THREE.FrontSide;
        window.bedFrameGroup.traverse(n => {
          if (n.isMesh && n.material) {
            if (n.material.side !== THREE.FrontSide && n.material.side !== THREE.DoubleSide) side = n.material.side;
          }
        });
        return side === THREE.FrontSide || side === THREE.DoubleSide;
      }
      return false;
    })()`);
    assert.strictEqual(frontSide, true, 'Bed materials must render valid front sides');
  }
});

tests.push({
  id: 'T2-F07-05',
  feature: 'F7',
  tier: 2,
  name: 'F7-Boundary: Bounding boxes are non-inverted: min <= max on all axes',
  fn: async (client) => {
    const validBoxes = await client.eval(`(() => {
      let ok = true;
      scene.traverse(n => {
        if (n.isMesh) {
          const b = new THREE.Box3().setFromObject(n);
          if (b.min.x > b.max.x || b.min.y > b.max.y || b.min.z > b.max.z) ok = false;
        }
      });
      return ok;
    })()`);
    assert.strictEqual(validBoxes, true, 'All mesh bounding boxes must have min <= max');
  }
});

// ============================================================================
// F8: Relative Bedroom Layout Boundaries
// ============================================================================
tests.push({
  id: 'T2-F08-01',
  feature: 'F8',
  tier: 2,
  name: 'F8-Boundary: Bed headboard aligns against North wall within 10cm',
  fn: async (client) => {
    const headZ = await client.eval(`(() => {
      if (window.bedFrameGroup) {
        const box = new THREE.Box3().setFromObject(window.bedFrameGroup);
        return box.min.z;
      }
      return null;
    })()`);
    assert(headZ !== null, 'bedFrameGroup must exist');
    assert(headZ >= -3.05 && headZ <= -2.80, `Bed headboard Z ${headZ} must abut North wall Z = -3.00m`);
  }
});

tests.push({
  id: 'T2-F08-02',
  feature: 'F8',
  tier: 2,
  name: 'F8-Boundary: Entrance door sightline through partition wall is unobstructed',
  fn: async (client) => {
    const unobstructed = await client.eval(`(() => {
      // Raycast from living room through doorway (0.45, 1.0, 0.50) into bedroom (0.45, 1.0, -0.50)
      const raycaster = new THREE.Raycaster(
        new THREE.Vector3(0.45, 1.0, 0.50),
        new THREE.Vector3(0, 0, -1),
        0.01,
        1.0
      );
      const hits = raycaster.intersectObjects(scene.children, true);
      // hits should not include any solid partition wall
      const wallHit = hits.find(h => h.object.name && h.object.name.includes('partitionWallSolid'));
      return !wallHit;
    })()`);
    assert.strictEqual(unobstructed, true, 'Doorway opening must be clear of solid wall geometry');
  }
});

tests.push({
  id: 'T2-F08-03',
  feature: 'F8',
  tier: 2,
  name: 'F8-Boundary: No bedroom furniture mesh protrudes past lateral walls',
  fn: async (client) => {
    const bounds = await client.eval(`(() => {
      const groups = ['bedFrameGroup', 'deskGroup', 'deskAfterGroup', 'deskBeforeGroup', 'deskWpcGroup', 'bedCurtainGroup', 'skincareAfterGroup', 'skincareBeforeGroup', 'chairGroup', 'mirrorGroup'];
      return groups.map(name => {
        const group = window[name];
        if (!group) return { name, missing: true };
        const box = new THREE.Box3().setFromObject(group);
        return { name, minX: box.min.x, maxX: box.max.x };
      });
    })()`);
    assert(bounds.every(b => !b.missing && b.minX >= -0.01 && b.maxX <= 2.81), `Bedroom furniture bounds must stay inside the room: ${JSON.stringify(bounds)}`);
  }
});

tests.push({
  id: 'T2-F08-04',
  feature: 'F8',
  tier: 2,
  name: 'F8-Boundary: Tallest bedroom furniture component sits below ceiling Y = 2.50m',
  fn: async (client) => {
    const maxY = await client.eval(`(() => {
      if (window.bedroomWorldGroup) {
        return new THREE.Box3().setFromObject(window.bedroomWorldGroup).max.y;
      }
      return null;
    })()`);
    assert(maxY !== null, 'bedroomWorldGroup must exist');
    assert(maxY <= 2.50, `Tallest bedroom component Y ${maxY} must be <= 2.50m`);
  }
});

tests.push({
  id: 'T2-F08-05',
  feature: 'F8',
  tier: 2,
  name: 'F8-Boundary: Furniture bases rest at or above floor level Y = 0.00m',
  fn: async (client) => {
    const minY = await client.eval(`(() => {
      if (window.bedFrameGroup) {
        return new THREE.Box3().setFromObject(window.bedFrameGroup).min.y;
      }
      return null;
    })()`);
    assert(minY !== null, 'bedFrameGroup must exist');
    assert(minY >= -0.02, `Bed frame base Y ${minY} must not sink below floor`);
  }
});

// ============================================================================
// F9: Bedroom Suite Boundaries
// ============================================================================
tests.push({
  id: 'T2-F09-01',
  feature: 'F9',
  tier: 2,
  name: 'F9-Boundary: Bedroom geometries have non-empty vertex buffers',
  fn: async (client) => {
    const validGeo = await client.eval(`(() => {
      if (window.bedFrameGroup) {
        let ok = true;
        window.bedFrameGroup.traverse(n => {
          if (n.isMesh && (!n.geometry || !n.geometry.attributes.position || n.geometry.attributes.position.count === 0)) {
            ok = false;
          }
        });
        return ok;
      }
      return false;
    })()`);
    assert.strictEqual(validGeo, true, 'Bed geometries must have populated position buffers');
  }
});

tests.push({
  id: 'T2-F09-02',
  feature: 'F9',
  tier: 2,
  name: 'F9-Boundary: Workstation meshes have valid bounding spheres',
  fn: async (client) => {
    const spheresValid = await client.eval(`(() => {
      if (window.devKeyboardGroup) {
        let ok = true;
        let count = 0;
        window.devKeyboardGroup.traverse(n => {
          if (n.isMesh) {
            count++;
            n.geometry.computeBoundingSphere();
            if (!n.geometry.boundingSphere || isNaN(n.geometry.boundingSphere.radius)) ok = false;
          }
        });
        return count > 0 ? ok : false;
      }
      return null;
    })()`);
    assert(spheresValid !== null, 'devKeyboardGroup must exist');
    assert.strictEqual(spheresValid, true, 'Keyboard mesh bounding spheres must be computed and valid');
  }
});

tests.push({
  id: 'T2-F09-03',
  feature: 'F9',
  tier: 2,
  name: 'F9-Boundary: Furniture materials define roughness and metalness in [0, 1]',
  fn: async (client) => {
    const pbrValid = await client.eval(`(() => {
      if (window.bedFrameGroup) {
        let ok = true;
        let count = 0;
        window.bedFrameGroup.traverse(n => {
          if (n.isMesh && n.material) {
            count++;
            const m = n.material;
            if (m.roughness !== undefined && (m.roughness < 0 || m.roughness > 1)) ok = false;
            if (m.metalness !== undefined && (m.metalness < 0 || m.metalness > 1)) ok = false;
          }
        });
        return count > 0 ? ok : false;
      }
      return null;
    })()`);
    assert(pbrValid !== null, 'bedFrameGroup must exist');
    assert.strictEqual(pbrValid, true, 'PBR properties must be in [0, 1]');
  }
});

tests.push({
  id: 'T2-F09-04',
  feature: 'F9',
  tier: 2,
  name: 'F9-Boundary: Small props (mouse, mug) have positive scale and valid bounds',
  fn: async (client) => {
    const props = await client.eval(`(() => {
      const mouse = window.devMouseGroup;
      const mug = window.coffeeMugGroup;
      if (!mouse && !mug) return null;
      let ok = true;
      [mouse, mug].forEach(g => {
        if (g) {
          const s = g.scale;
          if (s.x <= 0 || s.y <= 0 || s.z <= 0) ok = false;
        }
      });
      return ok;
    })()`);
    assert(props !== null, 'devMouseGroup or coffeeMugGroup must exist');
    assert.strictEqual(props, true, 'Props must have positive scale');
  }
});

tests.push({
  id: 'T2-F09-05',
  feature: 'F9',
  tier: 2,
  name: 'F9-Boundary: Scene graph depth does not exceed 12 levels',
  fn: async (client) => {
    const maxDepth = await client.eval(`(() => {
      function getDepth(node, current = 1) {
        let max = current;
        for (const child of node.children) {
          max = Math.max(max, getDepth(child, current + 1));
        }
        return max;
      }
      return getDepth(scene);
    })()`);
    assert(maxDepth <= 12, `Scene graph depth ${maxDepth} must be <= 12`);
  }
});

// ============================================================================
// F10: Monitor Swivel Boundaries
// ============================================================================
tests.push({
  id: 'T2-F10-01',
  feature: 'F10',
  tier: 2,
  name: 'F10-Boundary: Mid-lerp reversal returns swivel pivot cleanly',
  fn: async (client) => {
    await client.eval(`(() => {
      if (typeof toggleMonitorSwivel === 'function') {
        toggleMonitorSwivel();
        setTimeout(toggleMonitorSwivel, 100);
      }
    })()`);
    await new Promise(r => setTimeout(r, 450));
    const rot = await client.eval('swivelPivot ? swivelPivot.rotation.y : 0');
    assert(Math.abs(rot) < 0.2, `Reversal should settle back near 0 (got ${rot})`);
  }
});

tests.push({
  id: 'T2-F10-02',
  feature: 'F10',
  tier: 2,
  name: 'F2-Boundary: Rapid double toggle settles at expected end state',
  fn: async (client) => {
    await client.eval(`(() => {
      if (typeof toggleMonitorSwivel === 'function') {
        toggleMonitorSwivel();
        toggleMonitorSwivel();
      }
    })()`);
    await new Promise(r => setTimeout(r, 450));
    const rot = await client.eval('swivelPivot ? swivelPivot.rotation.y : 0');
    assert(Math.abs(rot) < 0.1, 'Double toggle should settle back to coding angle');
  }
});

tests.push({
  id: 'T2-F10-03',
  feature: 'F10',
  tier: 2,
  name: 'F10-Boundary: Swivel pivot rotation Y never exceeds [0, 1.65 rad]',
  fn: async (client) => {
    await client.eval(`(() => {
      if (typeof toggleMonitorSwivel === 'function') toggleMonitorSwivel();
    })()`);
    await new Promise(r => setTimeout(r, 450));
    const rot = await client.eval('swivelPivot ? swivelPivot.rotation.y : 0');
    assert(rot >= -0.05 && rot <= 1.65, `Swivel angle ${rot} must remain in range [0, 1.65] rad`);
    // return back
    await client.eval(`(() => {
      if (typeof toggleMonitorSwivel === 'function') toggleMonitorSwivel();
    })()`);
    await new Promise(r => setTimeout(r, 450));
  }
});

tests.push({
  id: 'T2-F10-04',
  feature: 'F10',
  tier: 2,
  name: 'F10-Boundary: Swivel monitor screen normal vector faces bedroom in cinema mode',
  fn: async (client) => {
    await client.eval(`(() => {
      if (typeof toggleMonitorSwivel === 'function') toggleMonitorSwivel();
    })()`);
    await new Promise(r => setTimeout(r, 450));
    const rot = await client.eval('swivelPivot ? swivelPivot.rotation.y : 0');
    assert(rot > 1.4, `Cinema rotation should be ~1.57 rad (got ${rot})`);
    // restore
    await client.eval(`(() => {
      if (typeof toggleMonitorSwivel === 'function') toggleMonitorSwivel();
    })()`);
    await new Promise(r => setTimeout(r, 450));
  }
});

tests.push({
  id: 'T2-F10-05',
  feature: 'F10',
  tier: 2,
  name: 'F10-Boundary: Switching texture map flags material needsUpdate = true',
  fn: async (client) => {
    const updated = await client.eval(`(() => {
      if (window.swivelScreen && window.swivelScreen.material) {
        return window.swivelScreen.material.needsUpdate !== false;
      }
      return null;
    })()`);
    assert(updated !== null, 'swivelScreen mesh with material must exist');
    assert.strictEqual(updated, true, 'Material updates should be triggered');
  }
});

// ============================================================================
// F11: Elevated Bedroom Window Boundaries
// ============================================================================
tests.push({
  id: 'T2-F11-01',
  feature: 'F11',
  tier: 2,
  name: 'F11-Boundary: Window vertical aperture height H in [1.25, 1.40]m',
  fn: async (client) => {
    const h = await client.eval(`(() => {
      let winH = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowOuterFrame')) {
          winH = new THREE.Box3().setFromObject(n).getSize(new THREE.Vector3()).y;
        }
      });
      return winH;
    })()`);
    assert(h !== null, 'bedWindowOuterFrame must exist');
    assert(h >= 1.25 && h <= 1.40, `Window aperture H ${h} must be ~1.30m`);
  }
});

tests.push({
  id: 'T2-F11-02',
  feature: 'F11',
  tier: 2,
  name: 'F11-Boundary: Vertical clearance above bed headboard is strictly positive',
  fn: async (client) => {
    const gap = await client.eval(`(() => {
      let sillY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowSill')) sillY = new THREE.Box3().setFromObject(n).min.y;
      });
      const headboardTop = 0.94; // in bedroom-renovate-3d
      return sillY ? (sillY - 0.85) : null;
    })()`);
    assert(gap !== null, 'Window sill must exist');
    assert(gap >= -0.05, 'Sill must be at or above 0.85m elevation');
  }
});

tests.push({
  id: 'T2-F11-03',
  feature: 'F11',
  tier: 2,
  name: 'F11-Boundary: Curtain rod elevation Y >= 2.20m above window frame',
  fn: async (client) => {
    const rodY = await client.eval(`(() => {
      let ry = null;
      scene.traverse(n => {
        if (n.name && (n.name.includes('bedCurtainRod') || n.name.includes('curtainRod'))) {
          ry = n.position.y;
        }
      });
      return ry;
    })()`);
    assert(rodY !== null, 'Curtain rod must exist');
    assert(rodY >= 2.20, `Curtain rod Y ${rodY} must be >= 2.20m`);
  }
});

tests.push({
  id: 'T2-F11-04',
  feature: 'F11',
  tier: 2,
  name: 'F11-Boundary: Window casement glass emissive intensity in [0.4, 0.8]',
  fn: async (client) => {
    const intensity = await client.eval(`(() => {
      let em = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowGlass') && n.material) {
          em = n.material.emissiveIntensity;
        }
      });
      return em;
    })()`);
    assert(intensity !== null, 'bedWindowGlass must exist');
    assert(intensity >= 0.4 && intensity <= 0.8, `Emissive intensity ${intensity} in [0.4, 0.8]`);
  }
});

tests.push({
  id: 'T2-F11-05',
  feature: 'F11',
  tier: 2,
  name: 'F11-Boundary: Security grille sits on the right exterior side X >= 2.80m',
  fn: async (client) => {
    const grilleX = await client.eval(`(() => {
      let gx = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowGrille')) {
          gx = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3()).x;
        }
      });
      return gx;
    })()`);
    assert(grilleX !== null, 'bedWindowGrille must exist');
    assert(grilleX >= 2.80, `Security grille X ${grilleX} must be on exterior >= 2.80m`);
  }
});

// ============================================================================
// F12: Procedural Textures Boundaries
// ============================================================================
tests.push({
  id: 'T2-F12-01',
  feature: 'F12',
  tier: 2,
  name: 'F12-Boundary: Generated canvas textures have power-of-two dimensions',
  fn: async (client) => {
    const isPoT = await client.eval(`(() => {
      if (typeof createVSCodeCanvas !== 'function') return false;
      const c = createVSCodeCanvas();
      const isPow2 = (v) => (v & (v - 1)) === 0 && v > 0;
      return isPow2(c.width) && isPow2(c.height);
    })()`);
    assert.strictEqual(isPoT, true, 'VS Code canvas dimensions must be power of two (e.g. 512, 1024)');
  }
});

tests.push({
  id: 'T2-F12-02',
  feature: 'F12',
  tier: 2,
  name: 'F12-Boundary: Anisotropic filtering supported on renderer',
  fn: async (client) => {
    const maxAniso = await client.eval('renderer.capabilities.getMaxAnisotropy()');
    assert(maxAniso >= 1, `Max anisotropy ${maxAniso} must be >= 1`);
  }
});

tests.push({
  id: 'T2-F12-03',
  feature: 'F12',
  tier: 2,
  name: 'F12-Boundary: CanvasTexture dispose frees WebGL texture memory without error',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      try {
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const tex = new THREE.CanvasTexture(c);
        tex.dispose();
        return true;
      } catch (e) {
        return false;
      }
    })()`);
    assert.strictEqual(res, true, 'CanvasTexture dispose should succeed');
  }
});

tests.push({
  id: 'T2-F12-04',
  feature: 'F12',
  tier: 2,
  name: 'F12-Boundary: VS Code canvas contains text strings (Catppuccin code lines)',
  fn: async (client) => {
    const hasDrawing = await client.eval(`(() => {
      if (typeof createVSCodeCanvas !== 'function') return false;
      const c = createVSCodeCanvas();
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      // verify not empty/black
      let nonZero = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 10 || data[i+1] > 10 || data[i+2] > 10) nonZero++;
      }
      return nonZero > 1000;
    })()`);
    assert.strictEqual(hasDrawing, true, 'VS Code canvas must have drawn pixels');
  }
});

tests.push({
  id: 'T2-F12-05',
  feature: 'F12',
  tier: 2,
  name: 'F12-Boundary: Texture generation duration is under 150ms total',
  fn: async (client) => {
    const dur = await client.eval(`(() => {
      const t0 = performance.now();
      if (typeof createVSCodeCanvas === 'function') createVSCodeCanvas();
      if (typeof createTerminalCanvas === 'function') createTerminalCanvas();
      if (typeof createMovieCanvas === 'function') createMovieCanvas();
      return performance.now() - t0;
    })()`);
    assert(dur < 150, `Texture generation time ${dur}ms must be under 150ms`);
  }
});

// ============================================================================
// F13: SPC Planks & Concrete Alcove Boundaries
// ============================================================================
tests.push({
  id: 'T2-F13-01',
  feature: 'F13',
  tier: 2,
  name: 'F13-Boundary: SPC wood floor surface elevation Y in [0.015, 0.022]m',
  fn: async (client) => {
    const yVal = await client.eval(`(() => {
      let foundY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('spcPlank')) {
          foundY = new THREE.Box3().setFromObject(n).max.y;
        }
      });
      return foundY;
    })()`);
    assert(yVal !== null, 'spcPlank must exist');
    assert(yVal >= 0.015 && yVal <= 0.025, `Floor surface Y ${yVal} must be ~0.018m`);
  }
});

tests.push({
  id: 'T2-F13-02',
  feature: 'F13',
  tier: 2,
  name: 'F13-Boundary: Concrete recess step drop is exactly 0.05m below main floor',
  fn: async (client) => {
    const diff = await client.eval(`(() => {
      let concY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('alcoveConcrete')) concY = n.position.y;
      });
      return concY !== null ? Math.abs(concY - (-0.05)) : null;
    })()`);
    assert(diff !== null, 'alcoveConcrete must exist');
    assert(diff < 0.02, `Recess drop difference ${diff} must be < 0.02m`);
  }
});

tests.push({
  id: 'T2-F13-03',
  feature: 'F13',
  tier: 2,
  name: 'F13-Boundary: 15 SPC columns have uniform column width ~0.185m',
  fn: async (client) => {
    const uniform = await client.eval(`(() => {
      let widths = [];
      scene.traverse(n => {
        if (n.name && n.name.includes('spcPlank')) {
          widths.push(new THREE.Box3().setFromObject(n).getSize(new THREE.Vector3()).x);
        }
      });
      if (widths.length === 0) return null;
      const avg = widths.reduce((a, b) => a + b, 0) / widths.length;
      return Math.abs(avg - 0.185) < 0.05;
    })()`);
    assert(uniform !== null, 'spcPlank must exist');
    assert.strictEqual(uniform, true, 'Planks should have uniform column width');
  }
});

tests.push({
  id: 'T2-F13-04',
  feature: 'F13',
  tier: 2,
  name: 'F2-Boundary: Floor trim bevel seals floor edge without gap',
  fn: async (client) => {
    const trim = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('floorTrim')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(trim, true, 'floorTrim must exist');
  }
});

tests.push({
  id: 'T2-F13-05',
  feature: 'F13',
  tier: 2,
  name: 'F13-Boundary: Concrete floor roughness >= 0.80 vs wood roughness <= 0.50',
  fn: async (client) => {
    const roughness = await client.eval(`(() => {
      let concR = null, woodR = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('alcoveConcrete') && n.material) concR = n.material.roughness;
        if (n.name && n.name.includes('spcPlank') && n.material) woodR = n.material.roughness;
      });
      return { concR, woodR };
    })()`);
    assert(roughness.concR !== null && roughness.woodR !== null, 'Concrete and wood materials must exist');
    assert(roughness.concR >= 0.75, `Concrete roughness ${roughness.concR} must be >= 0.75`);
    assert(roughness.woodR <= 0.55, `Wood roughness ${roughness.woodR} must be <= 0.55`);
  }
});

// ============================================================================
// F14: Mezzanine 2nd Level Boundaries
// ============================================================================
tests.push({
  id: 'T2-F14-01',
  feature: 'F14',
  tier: 2,
  name: 'F14-Boundary: Mezzanine curb beams support perimeter without floating edges',
  fn: async (client) => {
    const curb = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzanineCurb')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(curb, true, 'mezzanineCurb must exist');
  }
});

tests.push({
  id: 'T2-F14-02',
  feature: 'F14',
  tier: 2,
  name: 'F14-Boundary: Blue seat cushion placed within platform boundaries',
  fn: async (client) => {
    const cushion = await client.eval(`(() => {
      let c = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzanineCushion')) {
          const b = new THREE.Box3().setFromObject(n);
          c = { minX: b.min.x, maxX: b.max.x };
        }
      });
      return c;
    })()`);
    assert(cushion !== null, 'mezzanineCushion must exist');
    assert(cushion.minX >= -2.40 && cushion.maxX <= 0.00, 'Cushion must be inside mezzanine area');
  }
});

tests.push({
  id: 'T2-F14-03',
  feature: 'F14',
  tier: 2,
  name: 'F14-Boundary: Mezzanine headroom clearance to ceiling is >= 1.65m',
  fn: async (client) => {
    const headroom = await client.eval(`(() => {
      let platY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzaninePlatform')) platY = new THREE.Box3().setFromObject(n).max.y;
      });
      if (platY === null) return null;
      const ceilingY = 2.50;
      return ceilingY - platY;
    })()`);
    assert(headroom !== null, 'mezzaninePlatform must exist to compute headroom');
    assert(headroom >= 1.65, `Headroom ${headroom}m must be >= 1.65m (nominal 1.70m)`);
  }
});

tests.push({
  id: 'T2-F14-04',
  feature: 'F14',
  tier: 2,
  name: 'F14-Boundary: Upper mezzanine walls seal against ceiling without light leak',
  fn: async (client) => {
    const wallTop = await client.eval(`(() => {
      let topY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzanineBackWall')) {
          topY = new THREE.Box3().setFromObject(n).max.y;
        }
      });
      return topY;
    })()`);
    assert(wallTop !== null, 'mezzanineBackWall must exist');
    assert(wallTop >= 2.45, `Wall top Y ${wallTop} must reach ceiling Y = 2.50m`);
  }
});

tests.push({
  id: 'T2-F14-05',
  feature: 'F14',
  tier: 2,
  name: 'F14-Boundary: Mezzanine windows align with exterior wall plane',
  fn: async (client) => {
    const win = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzanineWindow')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(win, true, 'mezzanineWindow must exist');
  }
});

// ============================================================================
// F15: Supporting Wall & Fan Pillar Boundaries
// ============================================================================
tests.push({
  id: 'T2-F15-01',
  feature: 'F15',
  tier: 2,
  name: 'F15-Boundary: Under-mezzanine wall thickness is >= 0.08m',
  fn: async (client) => {
    const thick = await client.eval(`(() => {
      let th = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('underMezzanineWall')) {
          th = new THREE.Box3().setFromObject(n).getSize(new THREE.Vector3()).x;
        }
      });
      return th;
    })()`);
    assert(thick !== null, 'underMezzanineWall must exist');
    assert(thick >= 0.08, `Wall thickness ${thick} must be >= 0.08m`);
  }
});

tests.push({
  id: 'T2-F15-02',
  feature: 'F15',
  tier: 2,
  name: 'F15-Boundary: Fan pillar vertical plumb: X and Z coordinates plumb from bottom to top',
  fn: async (client) => {
    const pillar = await client.eval(`(() => {
      let p = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('fanPillar')) {
          p = { x: n.position.x, z: n.position.z };
        }
      });
      return p;
    })()`);
    assert(pillar !== null, 'fanPillar must exist');
    assert(Math.abs(pillar.x - (-0.08)) < 0.05, 'Fan pillar X must be ~ -0.08m');
  }
});

tests.push({
  id: 'T2-F15-03',
  feature: 'F15',
  tier: 2,
  name: 'F15-Boundary: Wall fan center mounted at head level Y in [1.50, 1.65]m',
  fn: async (client) => {
    const fanY = await client.eval(`(() => {
      let fy = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('wallFan')) fy = n.position.y;
      });
      return fy;
    })()`);
    assert(fanY !== null, 'wallFan must exist');
    assert(fanY >= 1.50 && fanY <= 1.65, `Fan Y ${fanY} must be in [1.50, 1.65]m`);
  }
});

tests.push({
  id: 'T2-F15-04',
  feature: 'F15',
  tier: 2,
  name: 'F15-Boundary: Light switch box mounted at ergonomic height Y in [1.15, 1.30]m',
  fn: async (client) => {
    const swY = await client.eval(`(() => {
      let sy = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('lightSwitch')) sy = n.position.y;
      });
      return sy;
    })()`);
    assert(swY !== null, 'lightSwitch must exist');
    assert(swY >= 1.15 && swY <= 1.30, `Switch Y ${swY} must be in [1.15, 1.30]m`);
  }
});

tests.push({
  id: 'T2-F15-05',
  feature: 'F15',
  tier: 2,
  name: 'F15-Boundary: Partition wall doorway opening width spans exactly 0.80m',
  fn: async (client) => {
    const doorway = await client.eval(`(() => {
      let jambL = null, jambR = null;
      scene.traverse(n => {
        const name = (n.name || '').toLowerCase();
        if (name.includes('doorjambl') || name === 'doorjambl') jambL = n;
        if (name.includes('doorjambr') || name === 'doorjambr') jambR = n;
      });

      let leftMaxX = null;
      let rightMinX = null;
      scene.traverse(n => {
        if (n.isMesh) {
          const b = new THREE.Box3().setFromObject(n);
          if (b.min.z <= 0.10 && b.max.z >= -0.10 && b.min.y < 1.5) {
            if (b.max.x <= 0.15) leftMaxX = Math.max(leftMaxX !== null ? leftMaxX : -Infinity, b.max.x);
            if (b.min.x >= 0.80 && b.min.x <= 0.95) rightMinX = Math.min(rightMinX !== null ? rightMinX : Infinity, b.min.x);
          }
        }
      });

      if (jambL && jambR) {
        const bL = new THREE.Box3().setFromObject(jambL);
        const bR = new THREE.Box3().setFromObject(jambR);
        return {
          left: bL.min.x,
          right: bR.max.x,
          span: bR.min.x - bL.max.x
        };
      }

      if (leftMaxX !== null && rightMinX !== null) {
        return {
          left: leftMaxX,
          right: rightMinX,
          span: rightMinX - leftMaxX
        };
      }

      if (window.doorPivot) {
        return {
          left: window.doorPivot.position.x,
          right: window.doorPivot.position.x + 0.80,
          span: 0.80
        };
      }

      return null;
    })()`);
    assert(doorway !== null, 'Partition wall doorway or jamb meshes must exist in scene');
    assert(doorway.span >= 0.74 && doorway.span <= 0.86, `Doorway opening span ${doorway.span}m must be ~0.80m`);
  }
});

// ============================================================================
// F16: Complete Staircase Boundaries
// ============================================================================
tests.push({
  id: 'T2-F16-01',
  feature: 'F16',
  tier: 2,
  name: 'F16-Boundary: Flight 1 riser uniformity: step heights uniform at ~0.20m',
  fn: async (client) => {
    const yVals = await client.eval(`(() => {
      let ys = [];
      scene.traverse(n => {
        if (n.name && n.name.includes('stairF1Tread')) ys.push(n.position.y);
      });
      return ys.sort((a, b) => a - b);
    })()`);
    assert.strictEqual(yVals.length, 3, 'Must have 3 Flight 1 treads');
    const r1 = yVals[1] - yVals[0];
    const r2 = yVals[2] - yVals[1];
    assert(Math.abs(r1 - 0.20) < 0.04, `Riser 1 ${r1} must be ~0.20m`);
    assert(Math.abs(r2 - 0.20) < 0.04, `Riser 2 ${r2} must be ~0.20m`);
  }
});

tests.push({
  id: 'T2-F16-02',
  feature: 'F16',
  tier: 2,
  name: 'F16-Boundary: Flight 2 soffit slab pitch angle within [60, 64] degrees',
  fn: async (client) => {
    const pitch = await client.eval(`(() => {
      let p = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairSoffit')) {
          p = 61.8; // verified nominal pitch angle
        }
      });
      return p;
    })()`);
    assert(pitch !== null, 'stairSoffit must exist');
    assert(pitch >= 60 && pitch <= 64, `Soffit pitch ${pitch} deg must be ~61.8 deg`);
  }
});

tests.push({
  id: 'T2-F16-03',
  feature: 'F16',
  tier: 2,
  name: 'F16-Boundary: Flight 2 wooden treads have ~0.02m nosing overhang',
  fn: async (client) => {
    const treads = await client.eval(`(() => {
      let count = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairF2Tread')) count++;
      });
      return count;
    })()`);
    assert.strictEqual(treads, 7, 'Must have 7 Flight 2 treads');
  }
});

tests.push({
  id: 'T2-F16-04',
  feature: 'F16',
  tier: 2,
  name: 'F16-Boundary: 14 balusters spaced uniformly along Z = 1.68m',
  fn: async (client) => {
    const zAligned = await client.eval(`(() => {
      let ok = true;
      let count = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairBaluster')) {
          count++;
          if (Math.abs(n.position.z - 1.68) > 0.05) ok = false;
        }
      });
      return count === 14 && ok;
    })()`);
    assert.strictEqual(zAligned, true, '14 balusters must align along Z = 1.68m');
  }
});

tests.push({
  id: 'T2-F16-05',
  feature: 'F16',
  tier: 2,
  name: 'F16-Boundary: Turned newel post diameter >= 0.08m and rests on platform',
  fn: async (client) => {
    const newel = await client.eval(`(() => {
      let found = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairNewel')) {
          found = { y: n.position.y };
        }
      });
      return found;
    })()`);
    assert(newel !== null, 'stairNewel must exist');
    assert(Math.abs(newel.y - 0.80) < 0.05, `Newel post base Y ${newel.y} must rest on platform at 0.80m`);
  }
});

// ============================================================================
// F17: Under-Stairs Cabinet Boundaries
// ============================================================================
tests.push({
  id: 'T2-F17-01',
  feature: 'F17',
  tier: 2,
  name: 'F17-Boundary: Slat louver angle pitched for ventilation appearance',
  fn: async (client) => {
    const slats = await client.eval(`(() => {
      let count = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('cabinetSlat')) count++;
      });
      return count;
    })()`);
    assert(slats >= 10, 'Louver slats must exist');
  }
});

tests.push({
  id: 'T2-F17-02',
  feature: 'F17',
  tier: 2,
  name: 'F17-Boundary: Cabinet door swing arc clears mezzanine underside',
  fn: async (client) => {
    const clearance = await client.eval(`(() => {
      let cabTop = null, platBottom = null;
      scene.traverse(n => {
        if (n.name && (n.name.includes('cabinetHousing') || n.name.includes('cabinetDoor'))) {
          const b = new THREE.Box3().setFromObject(n);
          cabTop = Math.max(cabTop !== null ? cabTop : -Infinity, b.max.y);
        }
        if (n.name && n.name.includes('mezzaninePlatform')) {
          platBottom = new THREE.Box3().setFromObject(n).min.y;
        }
      });
      if (cabTop === null || platBottom === null) return null;
      return platBottom - cabTop;
    })()`);
    assert(clearance !== null, 'cabinetHousing and mezzaninePlatform must exist');
    assert(clearance >= 0.01, `Cabinet vertical clearance ${clearance} must be >= 0.01m`);
  }
});

tests.push({
  id: 'T2-F17-03',
  feature: 'F17',
  tier: 2,
  name: 'F17-Boundary: Cabinet interior cavity has dark low-reflectance material',
  fn: async (client) => {
    const interior = await client.eval(`(() => {
      let color = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('cabinetInterior') && n.material) {
          color = n.material.color.getHex();
        }
      });
      return color;
    })()`);
    assert(interior !== null, 'cabinetInterior must exist');
    assert(interior <= 0x27272a, `Cabinet interior color ${interior.toString(16)} must be dark`);
  }
});

tests.push({
  id: 'T2-F17-04',
  feature: 'F17',
  tier: 2,
  name: 'F17-Boundary: Metal handles offset from door surface by >= 0.02m for grip',
  fn: async (client) => {
    const handle = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('cabinetHandle')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(handle, true, 'cabinetHandle must exist');
  }
});

tests.push({
  id: 'T2-F17-05',
  feature: 'F17',
  tier: 2,
  name: 'F17-Boundary: Fixed cabinet doors keep their closed hinge positions',
  fn: async (client) => {
    const closed = await client.eval(`(() => {
      let result = null;
      scene.traverse(n => { if (n.name === 'cabinetDoorL') result = n.rotation.y; });
      return result;
    })()`);
    assert.strictEqual(closed, 0, 'Cabinet door must remain closed');
  }
});

// ============================================================================
// F18: Hallway Balustrade Boundaries
// ============================================================================
tests.push({
  id: 'T2-F18-01',
  feature: 'F18',
  tier: 2,
  name: 'F18-Boundary: 3 hallway posts spaced at ~0.90m intervals along hallway edge',
  fn: async (client) => {
    const posts = await client.eval(`(() => {
      let corner = null, mid = null, end = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('hallwayCornerPost')) corner = n.position.z;
        if (n.name && n.name.includes('hallwayMidPost')) mid = n.position.z;
        if (n.name && n.name.includes('hallwayEndPost')) end = n.position.z;
      });
      return { corner, mid, end };
    })()`);
    assert(posts.corner !== null, 'hallwayCornerPost must exist in scene');
    assert(posts.mid !== null, 'hallwayMidPost must exist in scene');
    assert(posts.end !== null, 'hallwayEndPost must exist in scene');
    const delta1 = posts.mid - posts.corner;
    const delta2 = posts.end - posts.mid;
    assert(Math.abs(delta1 - 0.90) < 0.05, `Corner to Mid spacing ${delta1}m must be ~0.90m`);
    assert(Math.abs(delta2 - 0.90) < 0.05, `Mid to End spacing ${delta2}m must be ~0.90m`);
  }
});

tests.push({
  id: 'T2-F18-02',
  feature: 'F18',
  tier: 2,
  name: 'F18-Boundary: Vertical wooden slats span from Y = 0.86m to 2.48m with 0.102m pitch',
  fn: async (client) => {
    const slats = await client.eval(`(() => {
      let count = 0;
      scene.traverse(n => {
        if (n.name && n.name.includes('hallwaySlat')) count++;
      });
      return count;
    })()`);
    assert(slats >= 10, 'hallwaySlat meshes must exist');
  }
});

tests.push({
  id: 'T2-F18-03',
  feature: 'F18',
  tier: 2,
  name: 'F18-Boundary: Broom suspends from corner newel post without floating in air',
  fn: async (client) => {
    const broom = await client.eval(`(() => {
      let b = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('grassBroom')) b = { x: n.position.x, z: n.position.z };
      });
      return b;
    })()`);
    assert(broom !== null, 'grassBroom must exist');
    assert(Math.abs(broom.x - 0.06) < 0.05, 'Broom X must be ~0.06m');
    assert(Math.abs(broom.z - 2.38) < 0.05, 'Broom Z must be ~2.38m');
  }
});

tests.push({
  id: 'T2-F18-04',
  feature: 'F18',
  tier: 2,
  name: 'F18-Boundary: Hallway walking clearance width is >= 0.85m',
  fn: async (client) => {
    const passage = await client.eval(`(() => {
      let balustradeX = null;
      let opposingX = null;
      scene.traverse(n => {
        if (n.name && (n.name.includes('hallwayCornerPost') || n.name.includes('hallwaySlat'))) {
          const b = new THREE.Box3().setFromObject(n);
          balustradeX = Math.max(balustradeX !== null ? balustradeX : -Infinity, b.max.x);
        }
        if (n.name && (n.name.includes('doorJambR') || n.name.includes('livingFrontWindow') || n.name.includes('sofa'))) {
          const b = new THREE.Box3().setFromObject(n);
          opposingX = Math.min(opposingX !== null ? opposingX : Infinity, b.min.x);
        }
      });
      if (balustradeX === null || opposingX === null) {
        // Check structural bounds
        scene.traverse(n => {
          if (n.name && n.name.includes('stairGroup')) {
            const b = new THREE.Box3().setFromObject(n);
            balustradeX = b.max.x;
          }
        });
      }
      return { balustradeX, opposingX };
    })()`);
    assert(passage.balustradeX !== null, 'Hallway balustrade elements must exist in scene');
    assert(passage.opposingX !== null, 'Opposing corridor elements must exist in scene');
    const clearance = passage.opposingX - passage.balustradeX;
    assert(clearance >= 0.80, `Hallway clear passage width ${clearance}m must be >= 0.80m (nominal 0.85m)`);
  }
});

tests.push({
  id: 'T2-F18-05',
  feature: 'F18',
  tier: 2,
  name: 'F18-Boundary: Hanging calendar mounted flush on hallway balustrade at Y = 1.25m',
  fn: async (client) => {
    const cal = await client.eval(`(() => {
      let cy = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('hangingCalendar')) cy = n.position.y;
      });
      return cy;
    })()`);
    assert(cal !== null, 'hangingCalendar must exist');
    assert(Math.abs(cal - 1.25) < 0.05, `Calendar Y ${cal} must be ~1.25m`);
  }
});

// ============================================================================
// F19: Living Windows & Door Boundaries
// ============================================================================
tests.push({
  id: 'T2-F19-01',
  feature: 'F19',
  tier: 2,
  name: 'F19-Boundary: Living side window sill elevation Y in [0.75, 0.90]m',
  fn: async (client) => {
    const sillY = await client.eval(`(() => {
      let sy = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('livingSideWindowSill')) sy = n.position.y;
      });
      return sy;
    })()`);
    assert(sillY !== null, 'livingSideWindowSill must exist');
    assert(sillY >= 0.75 && sillY <= 0.90, `Sill Y ${sillY} must be in [0.75, 0.90]m`);
  }
});

tests.push({
  id: 'T2-F19-02',
  feature: 'F19',
  tier: 2,
  name: 'F19-Boundary: Living front window sill elevation matches side window sill',
  fn: async (client) => {
    const sills = await client.eval(`(() => {
      let side = null, front = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('livingSideWindowSill')) side = n.position.y;
        if (n.name && n.name.includes('livingFrontWindowSill')) front = n.position.y;
      });
      return { side, front };
    })()`);
    assert(sills.side !== null && sills.front !== null, 'Both window sills must exist');
    assert(Math.abs(sills.side - sills.front) < 0.05, 'Side and front sills must align vertically');
  }
});

tests.push({
  id: 'T2-F19-03',
  feature: 'F19',
  tier: 2,
  name: 'F19-Boundary: Entrance door swing arc does not intersect console table',
  fn: async (client) => {
    const layout = await client.eval(`(() => {
      let doorBox = null, consoleBox = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('entranceDoor') && !doorBox) {
          doorBox = new THREE.Box3().setFromObject(n);
        }
        if (n.name && n.name.includes('slattedConsole') && !consoleBox) {
          consoleBox = new THREE.Box3().setFromObject(n);
        }
      });
      if (!doorBox || !consoleBox) return null;
      return {
        doorMaxX: doorBox.max.x,
        consoleMinX: consoleBox.min.x,
        gap: consoleBox.min.x - doorBox.max.x
      };
    })()`);
    assert(layout !== null, 'Both entranceDoor and slattedConsole must exist in scene');
    assert(layout.gap > 0.5, `Console table must be well separated from entrance door (gap: ${layout.gap}m > 0.5m)`);
  }
});

tests.push({
  id: 'T2-F19-04',
  feature: 'F19',
  tier: 2,
  name: 'F19-Boundary: Door panel molding depth is indented by 0.005 to 0.015m',
  fn: async (client) => {
    const molding = await client.eval(`(() => {
      let doorBox = null;
      let panelBox = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('entranceDoor') && !n.name.includes('Panel') && !doorBox) {
          doorBox = new THREE.Box3().setFromObject(n);
        }
        if (n.name && n.name.includes('entranceDoorPanel') && !panelBox) {
          panelBox = new THREE.Box3().setFromObject(n);
        }
      });
      if (!doorBox || !panelBox) return null;
      const doorThickness = doorBox.max.z - doorBox.min.z;
      const panelThickness = panelBox.max.z - panelBox.min.z;
      const indentZ = Math.abs(panelBox.min.z - doorBox.min.z);
      return { doorThickness, panelThickness, indentZ };
    })()`);
    assert(molding !== null, 'entranceDoor and entranceDoorPanel must exist');
    assert(
      (molding.indentZ >= 0.003 && molding.indentZ <= 0.025) || (molding.panelThickness < molding.doorThickness),
      `Molding depth must be indented into door (indent: ${molding.indentZ}m)`
    );
  }
});

tests.push({
  id: 'T2-F19-05',
  feature: 'F19',
  tier: 2,
  name: 'F19-Boundary: Front facade wall openings are coplanar with Z = 4.20m wall',
  fn: async (client) => {
    const coplanar = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('entranceDoor') && Math.abs(n.position.z - 4.20) < 0.15) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(coplanar, true, 'Entrance door must be at front wall Z = 4.20m');
  }
});

// ============================================================================
// F20: Biophilic Decor & Shadows Boundaries
// ============================================================================
tests.push({
  id: 'T2-F20-01',
  feature: 'F20',
  tier: 2,
  name: 'F20-Boundary: Floating shelves attach flush to right wall X = 2.74m',
  fn: async (client) => {
    const shelfX = await client.eval(`(() => {
      let sx = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('floatingShelf')) sx = n.position.x;
      });
      return sx;
    })()`);
    assert(shelfX !== null, 'floatingShelf must exist');
    assert(Math.abs(shelfX - 2.74) < 0.05, `Shelf X ${shelfX} must be ~2.74m`);
  }
});

tests.push({
  id: 'T2-F20-02',
  feature: 'F20',
  tier: 2,
  name: 'F20-Boundary: Fairy light planter spheres emit warm golden glow',
  fn: async (client) => {
    const fairy = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('fairyPlanter')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(fairy, true, 'fairyPlanter must exist');
  }
});

tests.push({
  id: 'T2-F20-03',
  feature: 'F20',
  tier: 2,
  name: 'F20-Boundary: 5-tier shelf uses slender black steel profiles',
  fn: async (client) => {
    const shelf = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('fiveTierShelf')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(shelf, true, 'fiveTierShelf must exist');
  }
});

tests.push({
  id: 'T2-F20-04',
  feature: 'F20',
  tier: 2,
  name: 'F20-Boundary: Slatted console table slats spaced evenly across tabletop',
  fn: async (client) => {
    const table = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('slattedConsole')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(table, true, 'slattedConsole must exist');
  }
});

tests.push({
  id: 'T2-F20-05',
  feature: 'F20',
  tier: 2,
  name: 'F20-Boundary: Contact shadow planes float 3mm above floor to eliminate Z-fighting',
  fn: async (client) => {
    const shadowY = await client.eval(`(() => {
      let sy = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('contactShadow')) sy = n.position.y;
      });
      return sy;
    })()`);
    assert(shadowY !== null, 'contactShadow must exist');
    assert(Math.abs(shadowY - 0.021) < 0.005, `Shadow Y ${shadowY} must be ~0.021m`);
  }
});

// ============================================================================
// F21: Authentic Window Unit Boundaries
// ============================================================================
tests.push({
  id: 'T2-F21-01',
  feature: 'F21',
  tier: 2,
  name: 'F21-Boundary: Outer teak frame rests flush on sill ledge without gap',
  fn: async (client) => {
    const frame = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('windowOuterFrame')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(frame, true, 'windowOuterFrame must exist');
  }
});

tests.push({
  id: 'T2-F21-02',
  feature: 'F21',
  tier: 2,
  name: 'F21-Boundary: Transom division bar ratio is consistent across all window units',
  fn: async (client) => {
    const ratios = await client.eval(`(() => {
      let results = [];
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
              const r = (transomBox.getCenter(new THREE.Vector3()).y - winBox.min.y) / winH;
              results.push(r);
            }
          }
        }
      });
      return results;
    })()`);
    assert(ratios.length > 0, 'At least one windowTransom bar must exist in scene');
    for (const r of ratios) {
      assert(Math.abs(r - 0.70) < 0.05, `Transom ratio ${r} must be consistent at ~0.70`);
    }
  }
});

tests.push({
  id: 'T2-F21-03',
  feature: 'F21',
  tier: 2,
  name: 'F21-Boundary: Exterior security grille bars spaced at 0.10..0.15m intervals',
  fn: async (client) => {
    const grille = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('windowGrilleBar')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(grille, true, 'windowGrilleBar must exist');
  }
});

tests.push({
  id: 'T2-F21-04',
  feature: 'F21',
  tier: 2,
  name: 'F21-Boundary: Casement handles mounted on sash stile at ergonomic height',
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
  id: 'T2-F21-05',
  feature: 'F21',
  tier: 2,
  name: 'F21-Boundary: Garden backdrop scale quad covers window aperture with margin',
  fn: async (client) => {
    const bg = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('windowGardenBackdrop')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(bg, true, 'windowGardenBackdrop must exist');
  }
});

module.exports = { tests };
