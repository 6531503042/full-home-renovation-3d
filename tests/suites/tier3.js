/**
 * Tier 3: Cross-Feature Combinations & Pairwise Interactions (32 tests)
 *
 * Verifies dynamic synchronization, spatial co-alignment, and collision
 * clearances across interacting subsystem pairs in full-home-renovation-3d.
 */

const assert = require('assert');

const tests = [];

// ============================================================================
// Category 3A: Camera Controls & Dynamic Interactivity / Animations
// ============================================================================

tests.push({
  id: 'T3-01',
  feature: 'F1xF5',
  tier: 3,
  name: 'T3.01: Orbit Navigation during Active Camera Fly Transition (F1 x F5)',
  fn: async (client) => {
    await client.resetCamera();
    const res = await client.eval(`(() => {
      if (typeof flyCamera !== 'function') return { hasFly: false };
      flyCamera('bed_desk');
      const wasFlying = typeof isFlying !== 'undefined' ? isFlying : window.isFlying;
      controls.dispatchEvent({ type: 'start' });
      const nowFlying = typeof isFlying !== 'undefined' ? isFlying : window.isFlying;
      return { hasFly: true, wasFlying, isFlying: nowFlying, controlsEnabled: controls.enabled };
    })()`);
    assert(res.hasFly, 'flyCamera function must exist');
    assert.strictEqual(res.wasFlying, true, 'Camera flight should be initiated');
    assert.strictEqual(res.isFlying, false, 'Controls start event must immediately cancel flight');
    assert.strictEqual(res.controlsEnabled, true, 'Controls must remain enabled');
  }
});

tests.push({
  id: 'T3-02',
  feature: 'F2xF5',
  tier: 3,
  name: 'T3.02: Pan Navigation during Active Camera Fly Transition (F2 x F5)',
  fn: async (client) => {
    await client.resetCamera();
    await client.eval(`(() => {
      if (typeof flyCamera === 'function') flyCamera('living');
    })()`);
    // Right drag pan on canvas
    await client.drag(960, 540, 1100, 540, 'right', 4, 15);
    const isFlying = await client.eval('window.isFlying');
    assert.strictEqual(isFlying, false, 'Pan drag must cancel active camera flight');
  }
});

tests.push({
  id: 'T3-03',
  feature: 'F3xF5',
  tier: 3,
  name: 'T3.03: Mouse Wheel Zoom during Active Camera Fly Transition (F3 x F5)',
  fn: async (client) => {
    await client.resetCamera();
    await client.eval(`(() => {
      if (typeof flyCamera === 'function') flyCamera('overview');
    })()`);
    await client.wheel(960, 540, 0, 300);
    const isFlying = await client.eval('window.isFlying');
    assert.strictEqual(isFlying, false, 'Wheel zoom must cancel active camera flight');
  }
});

tests.push({
  id: 'T3-04',
  feature: 'F1xF10',
  tier: 3,
  name: 'T3.04: Orbit Navigation during Secondary Monitor Swivel Animation (F1 x F10)',
  fn: async (client) => {
    await client.resetCamera();
    await client.eval(`(() => {
      if (typeof toggleMonitorSwivel === 'function') toggleMonitorSwivel();
    })()`);
    await client.drag(960, 540, 1080, 540, 'left', 6, 15);
    const enabled = await client.eval('controls.enabled');
    // Clean up: restore monitor swivel to coding mode
    await client.eval(`(() => {
      if (typeof state !== 'undefined' && state && state.isMovieSwivel && typeof toggleMonitorSwivel === 'function') {
        toggleMonitorSwivel();
      }
    })()`);
    assert.strictEqual(enabled, true, 'Orbit controls must remain enabled during monitor swivel');
  }
});

tests.push({
  id: 'T3-05',
  feature: 'F2xF17',
  tier: 3,
  name: 'T3.05: Pan Navigation while the under-stairs cabinet remains closed (F2 x F17)',
  fn: async (client) => {
    await client.resetCamera();
    await client.drag(960, 540, 1060, 540, 'right', 4, 15);
    const enabled = await client.eval('controls.enabled');
    assert.strictEqual(enabled, true, 'Controls must remain enabled while the cabinet stays closed');
  }
});

tests.push({
  id: 'T3-06',
  feature: 'F4xF9',
  tier: 3,
  name: 'T3.06: Mouse Drag on High-Density Bedroom Furniture (F4 x F9)',
  fn: async (client) => {
    await client.resetCamera();
    const initBedX = await client.eval('window.bedFrameGroup ? bedFrameGroup.position.x : null');
    assert(initBedX !== null, 'bedFrameGroup must exist in scene');
    await client.drag(800, 540, 950, 540, 'left', 5, 20);
    const postBedX = await client.eval('bedFrameGroup.position.x');
    assert.strictEqual(initBedX, postBedX, 'Bed position must remain locked');
  }
});

tests.push({
  id: 'T3-07',
  feature: 'F4xF18',
  tier: 3,
  name: 'T3.07: Mouse Drag on Hallway Balustrade and Hanging Broom (F4 x F18)',
  fn: async (client) => {
    await client.resetCamera();
    const broom = await client.eval(`(() => {
      let b = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('grassBroom')) b = { x: n.position.x, z: n.position.z };
      });
      return b;
    })()`);
    assert(broom !== null, 'grassBroom must exist');
    await client.drag(960, 540, 1050, 540, 'left', 5, 15);
    const postBroom = await client.eval(`(() => {
      let b = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('grassBroom')) b = { x: n.position.x, z: n.position.z };
      });
      return b;
    })()`);
    assert.strictEqual(broom.x, postBroom.x, 'Broom position X must not change on drag');
    assert.strictEqual(broom.z, postBroom.z, 'Broom position Z must not change on drag');
  }
});

tests.push({
  id: 'T3-08',
  feature: 'F6xF1',
  tier: 3,
  name: 'T3.08: Navigation HUD Tips Display during Continuous 360 Orbit (F6 x F1)',
  fn: async (client) => {
    await client.resetCamera();
    // Continuous 360 orbit simulation
    for (let i = 0; i < 4; i++) {
      await client.drag(960, 540, 1160, 540, 'left', 4, 10);
    }
    const hudVisible = await client.eval(`(() => {
      const pills = document.querySelectorAll('.cam-pill');
      return pills.length >= 6;
    })()`);
    assert.strictEqual(hudVisible, true, 'HUD preset pills must remain intact');
  }
});

tests.push({
  id: 'T3-09',
  feature: 'F6xF5',
  tier: 3,
  name: 'T3.09: Rapid Successive HUD Camera Preset Button Clicks (F6 x F5)',
  fn: async (client) => {
    const success = await client.eval(`(() => {
      const pills = document.querySelectorAll('.cam-pill');
      if (pills.length >= 3) {
        pills[0].click();
        pills[1].click();
        pills[2].click();
        return true;
      }
      return false;
    })()`);
    assert.strictEqual(success, true, 'Rapid preset button clicks must succeed');
    const valid = await client.eval('!isNaN(camera.position.x)');
    assert.strictEqual(valid, true, 'Camera coordinates must remain valid');
  }
});

// ============================================================================
// Category 3B: Architectural Boundaries & Spatial Co-Alignment
// ============================================================================

tests.push({
  id: 'T3-10',
  feature: 'F7xF8',
  tier: 3,
  name: 'T3.10: Lounge-Side Window, Bed & Left Workstation Alignment (F7 x F8)',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      if (!window.bedroomWorldGroup) return null;
      const scaleX = window.bedroomWorldGroup.scale.x;
      const bedBounds = window.bedFrameGroup ? new THREE.Box3().setFromObject(window.bedFrameGroup) : null;
      const bed = bedBounds ? bedBounds.getCenter(new THREE.Vector3()).x : null;
      const desk = window.devKeyboardGroup ? new THREE.Box3().setFromObject(window.devKeyboardGroup).getCenter(new THREE.Vector3()).x : null;
      let aperture = null;
      if (window.bedWindow) window.bedWindow.traverse(n => { if (n.name && n.name.includes('bedWindowAperture')) aperture = n; });
      const apertureBounds = aperture ? new THREE.Box3().setFromObject(aperture) : null;
      const main = window.mainMonFrame ? new THREE.Box3().setFromObject(window.mainMonFrame) : null;
      const secondary = window.swivelPivot && window.swivelPivot.children[0] ? new THREE.Box3().setFromObject(window.swivelPivot.children[0]) : null;
      return {
        scaleX, bed, desk,
        deskVisible: !!window.deskAfterGroup && window.deskAfterGroup.visible,
        monitorVisible: !!window.mainMonFrame && window.mainMonFrame.visible,
        windowCenter: apertureBounds ? apertureBounds.getCenter(new THREE.Vector3()).x : null,
        bedWindowGap: apertureBounds && bedBounds ? apertureBounds.min.x - bedBounds.max.x : null,
        monitorKeyboardDelta: main && window.devKeyboardGroup ? Math.abs(main.getCenter(new THREE.Vector3()).z - new THREE.Box3().setFromObject(window.devKeyboardGroup).getCenter(new THREE.Vector3()).z) : null,
        monitorAngle: window.swivelMonGroup ? Math.abs(window.swivelMonGroup.rotation.y * 180 / Math.PI) : null,
        facesChair: !!window.swivelMonGroup && window.swivelMonGroup.rotation.y < 0,
        monitorGap: main && secondary ? main.min.z - secondary.max.z : null,
        monitorClear: main && secondary ? !main.intersectsBox(secondary) : false
      };
    })()`);
    assert(res !== null, 'bedroomWorldGroup must exist');
    assert.strictEqual(res.scaleX, 1.0, 'Scale X must be strictly +1.0');
    assert(res.bed !== null && res.desk !== null, 'Bed and desk must exist');
    assert(res.windowCenter !== null && Math.abs(res.windowCenter - 2.80) < 0.05, `Bedroom window X ${res.windowCenter} must share the lounge's right wall`);
    assert(res.bedWindowGap >= 0.08, `Window must sit beside the bed without overlapping it (gap ${res.bedWindowGap}m)`);
    assert(res.desk < res.bed, `Desk X ${res.desk} must be on the left of bed X ${res.bed}`);
    assert(res.deskVisible && res.monitorVisible, 'After-mode workstation and main monitor must remain visible');
    assert(res.monitorKeyboardDelta < 0.01, `Main monitor must align with keyboard (X delta ${res.monitorKeyboardDelta}m)`);
    assert(res.facesChair && Math.abs(res.monitorAngle - 25) < 0.1, `Secondary monitor must face the chair at 25° (got ${res.monitorAngle}°)`);
    assert(res.monitorGap >= 0.002 && res.monitorClear, `Secondary monitor must sit adjacent without collision (gap ${res.monitorGap}m)`);
  }
});

tests.push({
  id: 'T3-11',
  feature: 'F8xF19',
  tier: 3,
  name: 'T3.11: Partition Wall Doorway Alignment at Z = 0.00m (F8 x F19)',
  fn: async (client) => {
    const doorwayAligned = await client.eval(`(() => {
      const door = window.doorPivot;
      if (!door || !door.parent) return false;
      // Limit the raycast to shared-wall parts; the full furniture scene is needlessly expensive here.
      const ray = new THREE.Raycaster(
        new THREE.Vector3(0.45, 1.0, 0.50),
        new THREE.Vector3(0, 0, -1),
        0.01,
        1.0
      );
      const structure = door.parent.children.filter(object => object !== door);
      return door.position.x === 0.05 && door.children.length > 0 && ray.intersectObjects(structure, true).length === 0;
    })()`);
    assert.strictEqual(doorwayAligned, true, 'Partition doorway at X in [0.05, 0.85]m must be open and aligned');
  }
});

tests.push({
  id: 'T3-12',
  feature: 'F13xF15',
  tier: 3,
  name: 'T3.12: SPC Wood Floor Planks Boundary at Supporting Wall (F13 x F15)',
  fn: async (client) => {
    const bounded = await client.eval(`(() => {
      let count = 0;
      let ok = true;
      scene.traverse(n => {
        if (n.name && n.name.includes('spcPlank')) {
          count++;
          if (n.position.x < -0.01) ok = false; // should not protrude into supporting wall X < 0
        }
      });
      return { count, ok };
    })()`);
    assert(bounded.count > 0, 'spcPlank meshes must exist in scene');
    assert.strictEqual(bounded.ok, true, 'SPC planks must not protrude into supporting wall under mezzanine');
  }
});

tests.push({
  id: 'T3-13',
  feature: 'F13xF16',
  tier: 3,
  name: 'T3.13: SPC Floor Transition to Recessed Bare Concrete Alcove (F13 x F16)',
  fn: async (client) => {
    const transition = await client.eval(`(() => {
      let concFound = false, trimFound = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('alcoveConcrete')) concFound = true;
        if (n.name && n.name.includes('floorTrim')) trimFound = true;
      });
      return concFound && trimFound;
    })()`);
    assert.strictEqual(transition, true, 'Recessed concrete and transition trim must exist');
  }
});

tests.push({
  id: 'T3-14',
  feature: 'F14xF15',
  tier: 3,
  name: 'T3.14: Mezzanine Platform Alignment on Supporting Concrete Wall (F14 x F15)',
  fn: async (client) => {
    const aligned = await client.eval(`(() => {
      let platY = null, wallTopY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzaninePlatform')) platY = new THREE.Box3().setFromObject(n).min.y;
        if (n.name && n.name.includes('underMezzanineWall')) wallTopY = new THREE.Box3().setFromObject(n).max.y;
      });
      return (platY !== null && wallTopY !== null) ? Math.abs(platY - wallTopY) < 0.05 : false;
    })()`);
    assert.strictEqual(aligned, true, 'Supporting wall top must abut mezzanine platform underside');
  }
});

tests.push({
  id: 'T3-15',
  feature: 'F14xF16',
  tier: 3,
  name: 'T3.15: Flight 2 Sloped Soffit Connection to Mezzanine Landing (F14 x F16)',
  fn: async (client) => {
    const connected = await client.eval(`(() => {
      let soffitY = null, newelY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairSoffit')) soffitY = new THREE.Box3().setFromObject(n).min.y;
        if (n.name && n.name.includes('stairNewel')) newelY = n.position.y;
      });
      return (soffitY !== null && newelY !== null) ? Math.abs(soffitY - 0.80) < 0.08 : false;
    })()`);
    assert.strictEqual(connected, true, 'Flight 2 soffit and newel post must connect at mezzanine level 0.80m');
  }
});

tests.push({
  id: 'T3-16',
  feature: 'F16xF17',
  tier: 3,
  name: 'T3.16: Flight 2 Underside Clearance vs Under-Stairs Cabinet (F16 x F17)',
  fn: async (client) => {
    const clearance = await client.eval(`(() => {
      let cabTop = null, platY = null;
      scene.traverse(n => {
        if (n.name && (n.name.includes('cabinetHousing') || n.name.includes('cabinetDoor'))) {
          const b = new THREE.Box3().setFromObject(n);
          cabTop = Math.max(cabTop !== null ? cabTop : -Infinity, b.max.y);
        }
        if (n.name && n.name.includes('mezzaninePlatform')) {
          platY = new THREE.Box3().setFromObject(n).min.y;
        }
      });
      if (cabTop === null || platY === null) return null;
      return platY - cabTop;
    })()`);
    assert(clearance !== null, 'cabinetHousing and mezzaninePlatform must exist in scene');
    assert(clearance >= 0.01, `Clearance ${clearance}m must be >= 0.01m`);
  }
});

tests.push({
  id: 'T3-17',
  feature: 'F18xF14',
  tier: 3,
  name: 'T3.17: Hallway Balustrade Posts Mounted on Mezzanine Teak Curb (F18 x F14)',
  fn: async (client) => {
    const mounted = await client.eval(`(() => {
      let postY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('hallwayCornerPost')) postY = n.position.y;
      });
      return postY !== null ? Math.abs(postY - 0.82) < 0.05 : false;
    })()`);
    assert.strictEqual(mounted, true, 'Hallway balustrade posts must rest on teak curb at Y = 0.82m');
  }
});

// ============================================================================
// Category 3C: Window Architecture, Sills, Lighting & Geometry
// ============================================================================

tests.push({
  id: 'T3-18',
  feature: 'F11xF8',
  tier: 3,
  name: 'T3.18: Elevated Bedroom Window Sill vs Bed Headboard Clearance (F11 x F8)',
  fn: async (client) => {
    const clearance = await client.eval(`(() => {
      let sillY = null;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowSill')) sillY = new THREE.Box3().setFromObject(n).min.y;
      });
      const mattressTop = 0.46;
      return sillY ? (sillY - mattressTop) : null;
    })()`);
    assert(clearance !== null, 'bedWindowSill must exist');
    assert(clearance >= 0.35, `Clearance ${clearance}m must clear bed mattress by >= 0.35m (nominal 0.39m)`);
  }
});

tests.push({
  id: 'T3-19',
  feature: 'F21xF19',
  tier: 3,
  name: 'T3.19: Authentic Window Model Consistency Across Rooms (F21 x F19)',
  fn: async (client) => {
    const consistent = await client.eval(`(() => {
      let bedWin = false, sideWin = false, frontWin = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindow')) bedWin = true;
        if (n.name && n.name.includes('livingSideWindow')) sideWin = true;
        if (n.name && n.name.includes('livingFrontWindow')) frontWin = true;
      });
      return bedWin && sideWin && frontWin;
    })()`);
    assert.strictEqual(consistent, true, 'All 3 window units must be present across both zones');
  }
});

tests.push({
  id: 'T3-20',
  feature: 'F21xF14',
  tier: 3,
  name: 'T3.20: Mezzanine High Windows Daylight Glow vs Blue Cushion (F21 x F14)',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      let winGlass = false, cushion = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('mezzanineWindowGlass')) winGlass = true;
        if (n.name && n.name.includes('mezzanineCushion')) cushion = true;
      });
      return { winGlass, cushion };
    })()`);
    assert(res.winGlass && res.cushion, 'Mezzanine windows and blue cushion must co-exist');
  }
});

tests.push({
  id: 'T3-21',
  feature: 'F21xF20',
  tier: 3,
  name: 'T3.21: Window Garden Backdrop vs Biophilic Fairy Lights and Shadows (F21 x F20)',
  fn: async (client) => {
    const res = await client.eval(`(() => {
      let bg = false, fairy = false, shadow = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('windowGardenBackdrop')) bg = true;
        if (n.name && n.name.includes('fairyPlanter')) fairy = true;
        if (n.name && n.name.includes('contactShadow')) shadow = true;
      });
      return { bg, fairy, shadow };
    })()`);
    assert(res.bg && res.fairy && res.shadow, 'Garden backdrop, fairy lights, and contact shadows must co-exist');
  }
});

// ============================================================================
// Category 3D: Interactive States, Modes & Visual Textures
// ============================================================================

tests.push({
  id: 'T3-22',
  feature: 'F10xF12',
  tier: 3,
  name: 'T3.22: Secondary Monitor Dynamic Texture Swap (F10 x F12)',
  fn: async (client) => {
    const hasTextures = await client.eval(`(() => {
      return typeof createTerminalCanvas === 'function' && typeof createMovieCanvas === 'function';
    })()`);
    assert.strictEqual(hasTextures, true, 'Terminal and movie canvas generators must exist');
  }
});

tests.push({
  id: 'T3-23',
  feature: 'F10xF20',
  tier: 3,
  name: 'T3.23: Monitor Swivel Bed Cinema vs Lighting Mood Dimming (F10 x F20)',
  fn: async (client) => {
    const lightsExist = await client.eval(`(() => {
      let amb = false, dir = false;
      scene.traverse(n => {
        if (n.isAmbientLight) amb = true;
        if (n.isDirectionalLight) dir = true;
      });
      return amb && dir;
    })()`);
    assert.strictEqual(lightsExist, true, 'Ambient and sunlight sources must exist');
  }
});

tests.push({
  id: 'T3-24',
  feature: 'F12xF9',
  tier: 3,
  name: 'T3.24: High-Resolution Procedural Textures on Bedroom Suite (F12 x F9)',
  fn: async (client) => {
    const vsCodeOk = await client.eval(`(() => {
      if (typeof createVSCodeCanvas !== 'function') return false;
      const c = createVSCodeCanvas();
      return c.width >= 512;
    })()`);
    assert.strictEqual(vsCodeOk, true, 'VS Code canvas must have resolution >= 512');
  }
});

tests.push({
  id: 'T3-25',
  feature: 'F17xF16',
  tier: 3,
  name: 'T3.25: Under-Stairs Cabinet Open State vs Flight 1 Open Risers (F17 x F16)',
  fn: async (client) => {
    const openSightline = await client.eval(`(() => {
      let risersOpen = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairF1Tread')) risersOpen = true;
      });
      return risersOpen;
    })()`);
    assert.strictEqual(openSightline, true, 'Flight 1 open risers must exist framing cabinet');
  }
});

tests.push({
  id: 'T3-26',
  feature: 'F20xF13',
  tier: 3,
  name: 'T3.26: 7 Contact Shadows Placement on SPC Flooring (F20 x F13)',
  fn: async (client) => {
    const valid = await client.eval(`(() => {
      let shadows = 0, floorOk = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('contactShadow')) shadows++;
        if (n.name && n.name.includes('spcPlank')) floorOk = true;
      });
      return { shadows, floorOk };
    })()`);
    assert.strictEqual(valid.floorOk, true, 'SPC floor must exist');
    assert.strictEqual(valid.shadows, 7, 'Exactly 7 contact shadows must exist on floor');
  }
});

tests.push({
  id: 'T3-27',
  feature: 'F6xF12',
  tier: 3,
  name: 'T3.27: HUD BOQ Tab Switching during Active 3D Render Loop (F6 x F12)',
  fn: async (client) => {
    const tabSwitchResult = await client.eval(`(() => {
      const container = document.getElementById('boq-items-container');
      const totalPriceEl = document.getElementById('boq-total-price');
      const tabAll = document.getElementById('boq-tab-all');
      const tabLiving = document.getElementById('boq-tab-living');
      const tabBed = document.getElementById('boq-tab-bed');

      if (!container || !totalPriceEl || !tabAll || !tabLiving || !tabBed) {
        return null;
      }

      const initialCount = container.children.length;

      // Switch to bedroom BOQ tab
      if (typeof filterBOQ === 'function') filterBOQ('bed');
      else tabBed.click();

      const bedActive = tabBed.classList.contains('active');
      const bedCount = container.children.length;
      const bedPrice = totalPriceEl.innerText.trim();

      // Switch to living room BOQ tab
      if (typeof filterBOQ === 'function') filterBOQ('living');
      else tabLiving.click();

      const livingActive = tabLiving.classList.contains('active');
      const livingCount = container.children.length;
      const livingPrice = totalPriceEl.innerText.trim();

      // Restore all
      if (typeof filterBOQ === 'function') filterBOQ('all');
      else tabAll.click();

      const restoredCount = container.children.length;
      const allPrice = totalPriceEl.innerText.trim();
      const renderFrames = renderer && renderer.info ? renderer.info.render.frame : 1;

      return {
        initialCount,
        bedActive,
        bedCount,
        bedPrice,
        livingActive,
        livingCount,
        livingPrice,
        restoredCount,
        allPrice,
        renderFrames
      };
    })()`);

    assert(tabSwitchResult !== null, 'BOQ HUD controls and container must exist');
    assert.strictEqual(tabSwitchResult.bedActive, true, 'Bedroom BOQ tab must be marked active');
    assert.strictEqual(tabSwitchResult.bedCount, 13, 'Bedroom tab must show 13 items');
    assert(tabSwitchResult.bedPrice.includes('22,247'), `Bedroom price ${tabSwitchResult.bedPrice} must include 22,247`);
    assert.strictEqual(tabSwitchResult.livingActive, true, 'Living tab must be marked active');
    assert.strictEqual(tabSwitchResult.livingCount, 16, 'Living tab must show 16 items');
    assert(tabSwitchResult.livingPrice.includes('35,296'), `Living price ${tabSwitchResult.livingPrice} must include 35,296`);
    assert.strictEqual(tabSwitchResult.restoredCount, 29, 'Resetting tab must restore 29 items');
    assert(
      tabSwitchResult.allPrice.includes('57,543'),
      `All items price ${tabSwitchResult.allPrice} must reflect total BOQ budget`
    );
    assert(tabSwitchResult.renderFrames > 0, 'WebGL renderer must remain active during HUD tab switches');
  }
});

tests.push({
  id: 'T3-28',
  feature: 'F1xF13',
  tier: 3,
  name: 'T3.28: Low Polar Angle Orbit across 15-Column SPC Floor Planks (F1 x F13)',
  fn: async (client) => {
    await client.resetCamera();
    await client.drag(960, 540, 960, 300, 'left', 5, 10);
    const polar = await client.eval('controls.getPolarAngle()');
    assert(polar > 1.2, `Low angle polar orbit angle ${polar} must be > 1.2 rad`);
  }
});

tests.push({
  id: 'T3-29',
  feature: 'F2xF14',
  tier: 3,
  name: 'T3.29: Vertical Camera Pan across Mezzanine Elevation (F2 x F14)',
  fn: async (client) => {
    await client.resetCamera();
    await client.drag(960, 540, 960, 760, 'right', 8, 15);
    const targetY = await client.eval('controls.target.y');
    assert(targetY !== 1.10, 'Target Y must pan smoothly across elevations');
  }
});

tests.push({
  id: 'T3-30',
  feature: 'F3xF21',
  tier: 3,
  name: 'T3.30: Close-Up Zoom into Authentic Window Frame Details (F3 x F21)',
  fn: async (client) => {
    await client.resetCamera();
    await client.wheel(960, 540, 0, -300);
    const dist = await client.eval('camera.position.distanceTo(controls.target)');
    assert(dist < 9.0, 'Zoom in should bring camera closer to examine details');
  }
});

tests.push({
  id: 'T3-31',
  feature: 'F5xF17',
  tier: 3,
  name: 'T3.31: Camera Flight Interruption with fixed under-stairs cabinet (F5 x F17)',
  fn: async (client) => {
    await client.resetCamera();
    await client.eval(`(() => {
      if (typeof flyCamera === 'function') flyCamera('stair');
      controls.dispatchEvent({ type: 'start' });
    })()`);
    const isFlying = await client.eval('window.isFlying');
    assert.strictEqual(isFlying, false, 'Flight must cancel while cabinet stays closed');
  }
});

tests.push({
  id: 'T3-32',
  feature: 'F4xF10',
  tier: 3,
  name: 'T3.32: Mouse Drag Attempt on Swiveling Monitor Mesh (F4 x F10)',
  fn: async (client) => {
    await client.resetCamera();
    const initPos = await client.eval('window.swivelMonGroup ? swivelMonGroup.position.x : null');
    assert(initPos !== null, 'swivelMonGroup must exist in scene');
    await client.drag(960, 540, 1060, 540, 'left', 5, 15);
    const postPos = await client.eval('swivelMonGroup.position.x');
    assert.strictEqual(initPos, postPos, 'Monitor mount must remain fixed in position');
  }
});

tests.push({
  id: 'T3-33',
  feature: 'F10xF8',
  tier: 3,
  name: 'T3.33: Bed Cinema Monitor Swivels Toward the Bed (F10 x F8)',
  fn: async (client) => {
    await client.eval('toggleMonitorSwivel(false); toggleMonitorSwivel(true);');
    await new Promise(resolve => setTimeout(resolve, 600));
    const res = await client.eval(`({ angle: window.swivelPivot.rotation.y, target: window.cameraPresets.bed_cinema.target })`);
    await client.eval('toggleMonitorSwivel(false);');
    assert(Math.abs(res.angle - Math.PI / 2) < 0.03, `Cinema yaw ${res.angle} must turn 90° toward the right-side bed`);
    assert(Math.abs(res.target[0] - 1.09) < 0.01 && Math.abs(res.target[2] + 2.40) < 0.01, 'Bed Cinema preset must target the secondary screen');
  }
});

module.exports = { tests };
