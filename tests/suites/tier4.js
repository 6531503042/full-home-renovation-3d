/**
 * Tier 4: Real-World Application Scenarios Test Suite (15 tests)
 *
 * Simulates complete end-to-end user journeys including buyer walkthroughs,
 * developer work-from-home sessions, contractor spatial audits, lighting
 * transitions, storage access, and anti-drift stress tests.
 */

const assert = require('assert');

const tests = [];

// ============================================================================
// Scenario 1: Prospective Buyer Full-Home Virtual Walkthrough
// ============================================================================
tests.push({
  id: 'T4-01',
  feature: 'Scenario1',
  tier: 4,
  name: 'T4.01 (Scenario 1): Prospective buyer full-home virtual walkthrough',
  fn: async (client) => {
    await client.resetCamera();

    // Step 1: Initial camera and scene loaded
    const initialView = await client.eval(`(() => {
      return {
        hasCamera: typeof camera !== 'undefined',
        hasControls: typeof controls !== 'undefined',
        pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z }
      };
    })()`);
    assert.strictEqual(initialView.hasCamera, true);
    assert.strictEqual(initialView.hasControls, true);

    // Step 2: Traverse camera preset views
    const presets = ['living', 'bedroom', 'stair', 'mezzanine', 'overview'];
    for (const p of presets) {
      await client.eval(`(() => {
        if (typeof flyCamera === 'function') flyCamera('${p}');
      })()`);
      await new Promise(r => setTimeout(r, 100));
      const valid = await client.eval('!isNaN(camera.position.x) && !isNaN(camera.position.z)');
      assert.strictEqual(valid, true, `Camera coords must remain valid at preset ${p}`);
    }

    await client.resetCamera();
  }
});

// ============================================================================
// Scenario 2: Developer Workstation & Bed Cinema Evening Experience
// ============================================================================
tests.push({
  id: 'T4-02',
  feature: 'Scenario2',
  tier: 4,
  name: 'T4.02 (Scenario 2): Developer workstation & bed cinema evening experience',
  fn: async (client) => {
    // Step 1: Workstation items present
    const hasWorkstation = await client.eval(`(() => {
      return !!window.devKeyboardGroup && !!window.devMouseGroup && !!window.swivelPivot;
    })()`);
    assert.strictEqual(hasWorkstation, true, 'Workstation keyboard, mouse, and swivel pivot must exist');

    // Ensure state isolation: start in standard coding mode
    await client.eval(`(() => {
      const isMovie = (typeof state !== 'undefined' && state && state.isMovieSwivel) ||
                      (typeof isMovieSwivel !== 'undefined' && isMovieSwivel);
      if (isMovie && typeof toggleMonitorSwivel === 'function') {
        toggleMonitorSwivel();
      }
    })()`);
    await new Promise(r => setTimeout(r, 100));

    // Step 2: Toggle monitor swivel to cinema mode
    await client.eval(`(() => {
      if (typeof toggleMonitorSwivel === 'function') toggleMonitorSwivel();
    })()`);
    await new Promise(r => setTimeout(r, 450));
    const cinemaRot = await client.eval('swivelPivot ? swivelPivot.rotation.y : 0');
    assert(Math.abs(cinemaRot) > 0.5, 'Swivel monitor should turn toward bed in cinema mode');

    // Step 3: Restore to coding mode
    await client.eval(`(() => {
      if (typeof toggleMonitorSwivel === 'function') toggleMonitorSwivel();
    })()`);
    await new Promise(r => setTimeout(r, 450));
    const codeRot = await client.eval('swivelPivot ? swivelPivot.rotation.y : 0');
    assert(Math.abs(codeRot) < 0.2, 'Swivel monitor should return to coding angle');
  }
});

// ============================================================================
// Scenario 3: Renovation Contractor Detailed Layout & Dimensions Audit
// ============================================================================
tests.push({
  id: 'T4-03',
  feature: 'Scenario3',
  tier: 4,
  name: 'T4.03 (Scenario 3): Renovation contractor layout & dimensions audit',
  fn: async (client) => {
    // Audit coordinate spaces and total area by measuring actual scene mesh bounds
    const audit = await client.eval(`(() => {
      let minX = Infinity, maxX = -Infinity;
      let minZLiving = Infinity, maxZLiving = -Infinity;
      let minZBed = Infinity, maxZBed = -Infinity;

      scene.traverse(n => {
        if (n.isMesh) {
          const b = new THREE.Box3().setFromObject(n);
          // Measure horizontal envelope within main room corridor
          if (b.min.x >= -0.05 && b.max.x <= 2.85 && b.min.y >= 0.0 && b.max.y <= 2.5) {
            minX = Math.min(minX, b.min.x);
            maxX = Math.max(maxX, b.max.x);
          }
          // Living room objects (Z in [0, 4.20])
          if (b.min.z >= -0.10 && b.max.z <= 4.30) {
            minZLiving = Math.min(minZLiving, Math.max(0, b.min.z));
            maxZLiving = Math.max(maxZLiving, b.max.z);
          }
          // Bedroom objects (Z in [-3.05, 0.10])
          if (b.min.z >= -3.10 && b.max.z <= 0.10) {
            minZBed = Math.min(minZBed, b.min.z);
            maxZBed = Math.max(maxZBed, Math.min(0, b.max.z));
          }
        }
      });

      const spanX = (maxX > minX && isFinite(minX) && isFinite(maxX)) ? (maxX - minX) : 0;
      const spanZLiving = (maxZLiving > minZLiving && isFinite(minZLiving) && isFinite(maxZLiving)) ? (maxZLiving - minZLiving) : 0;
      const spanZBed = (maxZBed > minZBed && isFinite(minZBed) && isFinite(maxZBed)) ? (maxZBed - minZBed) : 0;
      const livingArea = spanX * spanZLiving;
      const bedroomArea = spanX * spanZBed;
      const totalArea = livingArea + bedroomArea;

      return {
        spanX,
        spanZLiving,
        spanZBed,
        livingArea,
        bedroomArea,
        totalArea,
        unmirrored: window.bedroomWorldGroup ? (window.bedroomWorldGroup.scale.x === 1) : false
      };
    })()`);

    assert(audit.spanX >= 2.60 && audit.spanX <= 2.90, `Horizontal room span X ${audit.spanX}m must be ~2.80m`);
    assert(audit.spanZLiving >= 4.00 && audit.spanZLiving <= 4.30, `Living room span Z ${audit.spanZLiving}m must be ~4.20m`);
    assert(audit.spanZBed >= 2.85 && audit.spanZBed <= 3.15, `Bedroom span Z ${audit.spanZBed}m must be ~3.00m`);
    assert(Math.abs(audit.totalArea - 20.16) < 1.0, `Total renovation area ${audit.totalArea} sq.m. must be ~20.16 sq.m.`);
    assert.strictEqual(audit.unmirrored, true, 'Bedroom world group scale must be unmirrored (+1)');
  }
});

// ============================================================================
// Scenario 4: Architectural Staircase & Mezzanine Alcove Deep Dive
// ============================================================================
tests.push({
  id: 'T4-04',
  feature: 'Scenario4',
  tier: 4,
  name: 'T4.04 (Scenario 4): Architectural staircase & mezzanine alcove deep dive',
  fn: async (client) => {
    const stairElements = await client.eval(`(() => {
      let f1Count = 0, f2Count = 0, balusterCount = 0, hasSoffit = false, hasNewel = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('stairF1Tread')) f1Count++;
        if (n.name && n.name.includes('stairF2Tread')) f2Count++;
        if (n.name && n.name.includes('stairBaluster')) balusterCount++;
        if (n.name && n.name.includes('stairSoffit')) hasSoffit = true;
        if (n.name && n.name.includes('stairNewel')) hasNewel = true;
      });
      return { f1Count, f2Count, balusterCount, hasSoffit, hasNewel };
    })()`);
    assert.strictEqual(stairElements.f1Count, 3, 'Flight 1 must have 3 treads');
    assert.strictEqual(stairElements.f2Count, 7, 'Flight 2 must have 7 treads');
    assert.strictEqual(stairElements.balusterCount, 14, 'Must have 14 turned balusters');
    assert.strictEqual(stairElements.hasSoffit, true, 'Soffit slab must exist');
    assert.strictEqual(stairElements.hasNewel, true, 'Turned newel post must exist');
  }
});

// ============================================================================
// Scenario 5: Under-Stairs Storage Inspection & Utility Access Workflow
// ============================================================================
tests.push({
  id: 'T4-05',
  feature: 'Scenario5',
  tier: 4,
  name: 'T4.05 (Scenario 5): Under-stairs storage stays closed and clear of the room',
  fn: async (client) => {
    const storageExists = await client.eval('!!window.storageGroup');
    assert.strictEqual(storageExists, true, 'storageGroup must exist');
    const staysClosed = await client.eval(`(() => {
      let left = null, right = null;
      scene.traverse(n => {
        if (n.name === 'cabinetDoorL') left = n.rotation.y;
        if (n.name === 'cabinetDoorR') right = n.rotation.y;
      });
      return left === 0 && right === 0 && !document.getElementById('ctrl-storageOpen');
    })()`);
    assert.strictEqual(staysClosed, true, 'Cabinet doors must stay closed with no open control');

    const broomExists = await client.eval(`(() => {
      let found = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('grassBroom')) found = true;
      });
      return found;
    })()`);
    assert.strictEqual(broomExists, true, 'grassBroom mesh must exist near cabinet');
  }
});

// ============================================================================
// Scenario 6: Natural Daylight & Authentic Window Inspection Tour
// ============================================================================
tests.push({
  id: 'T4-06',
  feature: 'Scenario6',
  tier: 4,
  name: 'T4.06 (Scenario 6): Natural daylight & authentic window inspection tour',
  fn: async (client) => {
    const winAudit = await client.eval(`(() => {
      let bedSillElevated = false;
      let sideWinPresent = false;
      let frontWinPresent = false;
      scene.traverse(n => {
        if (n.name && n.name.includes('bedWindowSill')) {
          const b = new THREE.Box3().setFromObject(n);
          if (b.min.y >= 0.80) bedSillElevated = true;
        }
        if (n.name && n.name.includes('livingSideWindow')) sideWinPresent = true;
        if (n.name && n.name.includes('livingFrontWindow')) frontWinPresent = true;
      });
      return { bedSillElevated, sideWinPresent, frontWinPresent };
    })()`);
    assert.strictEqual(winAudit.bedSillElevated, true, 'Bedroom window sill must be elevated >= 0.80m');
    assert.strictEqual(winAudit.sideWinPresent, true, 'Living side window must be present');
    assert.strictEqual(winAudit.frontWinPresent, true, 'Living front window must be present');
  }
});

// ============================================================================
// Scenario 7: Day-to-Night Lighting Mood & Biophilic Ambiance Transition
// ============================================================================
tests.push({
  id: 'T4-07',
  feature: 'Scenario7',
  tier: 4,
  name: 'T4.07 (Scenario 7): Day-to-night lighting mood & biophilic ambiance transition',
  fn: async (client) => {
    const lighting = await client.eval(`(() => {
      let sun = null, amb = null;
      scene.traverse(n => {
        if (n.isDirectionalLight) sun = n.intensity;
        if (n.isAmbientLight) amb = n.intensity;
      });
      return { sun, amb };
    })()`);
    assert(lighting.sun !== null, 'Sunlight directional light must exist');
    assert(lighting.amb !== null, 'Ambient light must exist');
    assert(lighting.sun > 0.5, 'Daytime sun intensity should be > 0.5');
    assert(lighting.amb > 0.3, 'Daytime ambient intensity should be > 0.3');
  }
});

// ============================================================================
// Scenario 8: Multi-Floor & Hallway Vertical Flow Inspection
// ============================================================================
tests.push({
  id: 'T4-08',
  feature: 'Scenario8',
  tier: 4,
  name: 'T4.08 (Scenario 8): Multi-floor & hallway vertical flow inspection',
  fn: async (client) => {
    const elevations = await client.eval(`(() => {
      let groundFloor = null;
      let mezzanineLevel = null;
      let ceilingLevel = null;
      let balustradeSlats = 0;
      scene.traverse(n => {
        if (n.name && (n.name.includes('spcPlank') || n.name.includes('livingFloor'))) {
          const b = new THREE.Box3().setFromObject(n);
          groundFloor = b.max.y;
        }
        if (n.name && n.name.includes('mezzaninePlatform')) {
          const b = new THREE.Box3().setFromObject(n);
          mezzanineLevel = b.max.y;
        }
        if (n.name && (n.name.includes('tbarCeil') || n.name.includes('livingCeil'))) {
          const b = new THREE.Box3().setFromObject(n);
          ceilingLevel = b.min.y;
        }
        if (n.name && n.name.includes('hallwaySlat')) balustradeSlats++;
      });
      return { groundFloor, mezzanineLevel, ceilingLevel, balustradeSlats };
    })()`);
    assert(elevations.mezzanineLevel !== null, 'mezzaninePlatform mesh must exist in scene');
    assert(Math.abs(elevations.mezzanineLevel - 0.80) < 0.05, `Mezzanine level ${elevations.mezzanineLevel}m must be ~0.80m`);
    assert(elevations.balustradeSlats >= 10, 'Hallway safety balustrade slats must exist');
  }
});

// ============================================================================
// Scenario 9: Interactive Furniture & Tactile Touch Test (Anti-Drift / No-Drag Guarantee)
// ============================================================================
tests.push({
  id: 'T4-09',
  feature: 'Scenario9',
  tier: 4,
  name: 'T4.09 (Scenario 9): Interactive furniture & tactile touch test (anti-drift guarantee)',
  fn: async (client) => {
    await client.resetCamera();
    // Verify no Figma drag mode or isDraggingObject active
    const figmaActive = await client.eval(`(() => {
      const isDragging = typeof isDraggingObject !== 'undefined' ? isDraggingObject : false;
      const figma = typeof state !== 'undefined' && state ? !!state.figmaMode : false;
      return isDragging || figma;
    })()`);
    assert.strictEqual(figmaActive, false, 'Figma dragging mode must not be active');

    // Drag over center of viewport (where furniture sits)
    await client.drag(960, 540, 1100, 540, 'left', 5, 15);
    const controlsActive = await client.eval('controls.enabled');
    assert.strictEqual(controlsActive, true, 'Controls must remain active and enabled');

    await client.eval("toggleControl('sofaExtended')");
    await new Promise(resolve => setTimeout(resolve, 800));
    const clearance = await client.eval(`({
      tableX: coffeeTableGroup.position.x,
      plant: [sofaSidePlant.position.x, sofaSidePlant.position.z],
      mirrorY: mirrorGroup.position.y,
      outlet: scene.getObjectByName('bedroomWallOutlet') !== undefined,
      beanbag: scene.getObjectByName('bedroomBeanbag').position.toArray(),
      sideTable: scene.getObjectByName('bedroomSideTable').position.toArray()
    })`);
    assert(clearance.tableX < -1.2, 'Coffee table must move beside the sofa bed when it opens');
    assert(clearance.plant[0] < 0.75 && clearance.plant[1] > 2.7, 'Sofa-side plant must move clear of the extended seat');
    assert(Math.abs(clearance.mirrorY - 0.80) < 0.01, 'Full-length mirror base must rest at floor level');
    assert(clearance.outlet, 'Bedroom wall outlet must be restored');
    assert(clearance.beanbag[2] > -0.5 && clearance.sideTable[2] > -0.5, 'Beanbag and side table must sit beyond the bed foot');
    await client.eval("toggleControl('sofaExtended')");
  }
});

// ============================================================================
// Scenario 10: Bill of Quantities (BOQ) Audit & Renovation Cost Breakdown Review
// ============================================================================
tests.push({
  id: 'T4-10',
  feature: 'Scenario10',
  tier: 4,
  name: 'T4.10 (Scenario 10): Bill of Quantities (BOQ) audit & renovation cost breakdown review',
  fn: async (client) => {
    const boqAudit = await client.eval(`(() => {
      const panel = document.getElementById('rightPanel');
      const totalPriceEl = document.getElementById('boq-total-price');
      const totalSqmEl = document.getElementById('boq-total-sqm');
      const container = document.getElementById('boq-items-container');
      const tabAll = document.getElementById('boq-tab-all');
      const tabLiving = document.getElementById('boq-tab-living');
      const tabBed = document.getElementById('boq-tab-bed');

      if (!panel || !totalPriceEl || !container || !tabAll || !tabLiving || !tabBed) {
        return null;
      }

      if (container.children.length === 0 && typeof renderBOQ === 'function') {
        renderBOQ();
      }

      const initialCount = container.children.length;
      const initialPriceText = totalPriceEl.innerText.trim();
      const initialSqmText = totalSqmEl ? totalSqmEl.innerText.trim() : '';

      // Verify item cards have title, qty, and price
      let allCardsValid = true;
      for (const card of container.children) {
        if (!card.innerText || !card.innerText.includes('฿')) allCardsValid = false;
      }

      // Filter to living room
      if (typeof filterBOQ === 'function') filterBOQ('living');
      else tabLiving.click();
      const livingCount = container.children.length;
      const livingPriceText = totalPriceEl.innerText.trim();

      // Filter to bedroom
      if (typeof filterBOQ === 'function') filterBOQ('bed');
      else tabBed.click();
      const bedCount = container.children.length;
      const bedPriceText = totalPriceEl.innerText.trim();

      // Reset to all
      if (typeof filterBOQ === 'function') filterBOQ('all');
      else tabAll.click();
      const restoredCount = container.children.length;
      const restoredPriceText = totalPriceEl.innerText.trim();

      return {
        hasPanel: !!panel,
        initialCount,
        allCardsValid,
        livingCount,
        bedCount,
        restoredCount,
        initialPriceText,
        livingPriceText,
        bedPriceText,
        restoredPriceText,
        initialSqmText,
        boqDataLength: typeof boqData !== 'undefined' ? boqData.length : 0
      };
    })()`);

    assert(boqAudit !== null, 'Right BOQ panel and required elements must exist');
    assert.strictEqual(boqAudit.hasPanel, true, 'BOQ aside panel must be rendered');
    assert.strictEqual(boqAudit.boqDataLength, 29, 'boqData must contain 29 renovation items');
    assert.strictEqual(boqAudit.initialCount, 29, 'Initial BOQ container must render 29 item cards');
    assert.strictEqual(boqAudit.allCardsValid, true, 'All BOQ item cards must contain pricing information');
    assert.strictEqual(boqAudit.livingCount, 16, 'Living room filter must show 16 items');
    assert.strictEqual(boqAudit.bedCount, 13, 'Bedroom filter must show 13 items');
    assert.strictEqual(boqAudit.restoredCount, 29, 'Resetting to all must restore 29 items');
    assert(
      boqAudit.initialPriceText.includes('57,543'),
      `Initial price must reflect total BOQ budget (got ${boqAudit.initialPriceText})`
    );
    assert(boqAudit.livingPriceText.includes('35,296'), `Living price must be 35,296 ฿ (got ${boqAudit.livingPriceText})`);
    assert(boqAudit.bedPriceText.includes('22,247'), `Bedroom price must be 22,247 ฿ (got ${boqAudit.bedPriceText})`);
    assert(boqAudit.initialSqmText.includes('20.16'), `Total area must mention 20.16 sq.m. (got ${boqAudit.initialSqmText})`);
  }
});

// ============================================================================
// Scenario 11: Rapid Camera Navigation & In-Flight Interruption Stress Test
// ============================================================================
tests.push({
  id: 'T4-11',
  feature: 'Scenario11',
  tier: 4,
  name: 'T4.11 (Scenario 11): Rapid camera navigation & in-flight interruption stress test',
  fn: async (client) => {
    await client.resetCamera();
    for (let i = 0; i < 5; i++) {
      await client.eval(`(() => {
        if (typeof flyCamera === 'function') flyCamera('overview');
      })()`);
      await client.drag(960, 540, 1050, 540, 'left', 2, 10);
    }
    const isFlying = await client.eval('window.isFlying');
    assert.strictEqual(isFlying, false, 'Flight must cancel cleanly after stress test');
    const valid = await client.eval('!isNaN(camera.position.x)');
    assert.strictEqual(valid, true, 'Camera position must remain valid');
  }
});

// ============================================================================
// Scenario 12: High-Density Material & Canvas Texture Verification Tour
// ============================================================================
tests.push({
  id: 'T4-12',
  feature: 'Scenario12',
  tier: 4,
  name: 'T4.12 (Scenario 12): High-density material & canvas texture verification tour',
  fn: async (client) => {
    const texturesVerified = await client.eval(`(() => {
      let count = 0;
      if (typeof createVSCodeCanvas === 'function') count++;
      if (typeof createTerminalCanvas === 'function') count++;
      if (typeof createMovieCanvas === 'function') count++;
      if (typeof createPlaidCanvas === 'function') count++;
      if (typeof createRugCanvas === 'function') count++;
      return count;
    })()`);
    assert.strictEqual(texturesVerified, 5, 'All core texture generators must be verified');
  }
});

tests.push({
  id: 'T4-13',
  feature: 'AirBarriersAndCurtains',
  tier: 4,
  name: 'T4.13: Sliding air barriers and curtains animate between states',
  fn: async (client) => {
    const initial = await client.eval(`({
      hall: hallwayAirPanels[7].position.z,
      stair: pvcCurtainGroup.children[7].position.z,
      curtain: livingCurtainGroup.children.find(m => m.userData.curtainSide < 0).scale.x
    })`);
    await client.eval("toggleControl('showPlaswood'); toggleControl('pvcClosed'); toggleControl('sideCurtainClosed')");
    await new Promise(resolve => setTimeout(resolve, 900));
    const changed = await client.eval(`({
      hall: hallwayAirPanels[7].position.z,
      stair: pvcCurtainGroup.children[7].position.z,
      curtain: livingCurtainGroup.children.find(m => m.userData.curtainSide < 0).scale.x
    })`);
    await client.eval("toggleControl('showPlaswood'); toggleControl('pvcClosed'); toggleControl('sideCurtainClosed')");
    assert(changed.hall < initial.hall, 'Hallway air partition must gather when opened');
    assert(changed.stair > initial.stair, 'Stair PVC panels must spread when closed');
    assert(changed.curtain > initial.curtain, 'Living curtain panels must widen when closed');
  }
});

tests.push({
  id: 'T4-14',
  feature: 'DeskDimensionsAndMacBookClearance',
  tier: 4,
  name: 'T4.14: 160×60×72cm desk and MacBook dock fit safely in the bedroom',
  fn: async (client) => {
    const audit = await client.eval(`(() => {
      deskGroup.updateMatrixWorld(true);
      const box = obj => obj ? new THREE.Box3().setFromObject(obj) : null;
      const desk = box(window.deskTop), dock = box(window.macBookDock), mac = box(window.macBookClosed);
      const keyboard = window.devKeyboardGroup ? new THREE.Box3().setFromObject(window.devKeyboardGroup) : null;
      const mainScreen = box(window.mainMonFrame);
      const legs = window.deskSupportLegs.map(box);
      const insideXZ = (outer, inner) => outer && inner && inner.min.x >= outer.min.x - 0.001 && inner.max.x <= outer.max.x + 0.001 && inner.min.z >= outer.min.z - 0.001 && inner.max.z <= outer.max.z + 0.001;
      const size = desk ? desk.getSize(new THREE.Vector3()) : null;
      return {
        width: size && size.x, length: size && size.z, surfaceY: desk && desk.max.y,
        deskBounds: desk && { minX: desk.min.x, maxX: desk.max.x, minZ: desk.min.z, maxZ: desk.max.z },
        dockBounds: dock && { minX: dock.min.x, maxX: dock.max.x, minZ: dock.min.z, maxZ: dock.max.z },
        macBounds: mac && { minX: mac.min.x, maxX: mac.max.x, minZ: mac.min.z, maxZ: mac.max.z },
        dockOnDesk: insideXZ(desk, dock), macOnDesk: insideXZ(desk, mac),
        dockTouchesSurface: dock && Math.abs(dock.min.y - desk.max.y) < 0.002,
        keyboardClear: keyboard && mac ? !keyboard.intersectsBox(mac) : false,
        monitorClear: mainScreen && mac ? !mainScreen.intersectsBox(mac) : false,
        fourLegs: legs.length === 4, legsOnFloor: legs.length === 4 && legs.every(leg => Math.abs(leg.min.y) < 0.001)
      };
    })()`);
    assert(audit, 'Desk, laptop, and supports must exist');
    assert(Math.abs(audit.width - 0.60) < 0.002 && Math.abs(audit.length - 1.60) < 0.002, `Desk must measure 0.60×1.60m after rotation (got ${audit.width}×${audit.length})`);
    assert(Math.abs(audit.surfaceY - 0.72) < 0.002, `Desk top must be 0.72m high (got ${audit.surfaceY})`);
    assert(audit.dockOnDesk && audit.macOnDesk && audit.dockTouchesSurface, `Dock and MacBook must sit fully within the tabletop (${JSON.stringify({ desk: audit.deskBounds, dock: audit.dockBounds, mac: audit.macBounds, dockTouchesSurface: audit.dockTouchesSurface })})`);
    assert(audit.keyboardClear && audit.monitorClear, 'MacBook must not intersect keyboard or main monitor');
    assert(audit.fourLegs && audit.legsOnFloor, 'All four desk supports must reach the floor');
  }
});

tests.push({
  id: 'T4-15',
  feature: 'WindOnCurtainsAndPlants',
  tier: 4,
  name: 'T4.15: Visible breeze moves curtains and leaves while barriers stay rigid',
  fn: async (client) => {
    const before = await client.eval(`(() => {
      const pivot = scene.getObjectByName('windLeafPivot');
      const airPanel = hallwayAirPanels[0];
      return { leafZ: pivot && pivot.rotation.z, panelScale: airPanel.scale.toArray(), panelPosition: airPanel.position.toArray() };
    })()`);
    await new Promise(resolve => setTimeout(resolve, 700));
    const after = await client.eval(`(() => {
      const curtainSets = [window.livingCurtainGroup, window.bedCurtainGroup];
      let curtainMotion = 0;
      curtainSets.forEach(group => group && group.traverse(mesh => {
        const rest = mesh.geometry && mesh.geometry.userData.restPositions;
        if (!rest) return;
        const pos = mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) curtainMotion = Math.max(curtainMotion, Math.abs(pos.getZ(i) - rest[i * 3 + 2]));
      }));
      const pivot = scene.getObjectByName('windLeafPivot');
      const panel = hallwayAirPanels[0];
      return { curtainMotion, leafZ: pivot && pivot.rotation.z, panelScale: panel.scale.toArray(), panelPosition: panel.position.toArray() };
    })()`);
    assert(after.curtainMotion > 0.045, `Curtains must show a clear wind wave (max ${after.curtainMotion}m)`);
    assert(before.leafZ !== null && Math.abs(after.leafZ - before.leafZ) > 0.015, 'Leaves must sway visibly with the breeze');
    assert.deepStrictEqual(after.panelScale, before.panelScale, 'Rigid air barrier panels must not deform');
    const rails = await client.eval(`({ openX: hallwayAirPanels[0].userData.openX, closedX: hallwayAirPanels[0].userData.closedX, openZ: hallwayAirPanels[0].userData.openZ, closedZ: hallwayAirPanels[0].userData.closedZ })`);
    assert(after.panelPosition[0] >= Math.min(rails.openX, rails.closedX) - 0.001 && after.panelPosition[0] <= Math.max(rails.openX, rails.closedX) + 0.001,
      'Air barrier must remain within its horizontal sliding rail');
    assert(after.panelPosition[2] >= Math.min(rails.openZ, rails.closedZ) - 0.001 && after.panelPosition[2] <= Math.max(rails.openZ, rails.closedZ) + 0.001,
      'Air barrier must remain within its longitudinal sliding rail');
  }
});

tests.push({
  id: 'T4-16',
  feature: 'BedroomWindowSpan',
  tier: 4,
  name: 'T4.16: Bedroom window spans the marked wall length with matching curtain coverage',
  fn: async (client) => {
    const span = await client.eval(`(() => {
      let aperture = null;
      bedWindow.traverse(node => { if (node.name && node.name.includes('bedWindowAperture')) aperture = node; });
      const bounds = aperture && new THREE.Box3().setFromObject(aperture);
      const panels = bedCurtainSet.children.filter(node => node.name.includes('bedCurtainPanelLeft') || node.name.includes('bedCurtainPanelRight'));
      const mullions = [];
      bedWindow.traverse(node => { if (node.name && node.name.includes('bedWindowMullion')) mullions.push(node); });
      return {
        width: bounds && bounds.getSize(new THREE.Vector3()).z,
        center: bounds && bounds.getCenter(new THREE.Vector3()).z,
        curtainWidth: panels.reduce((total, node) => total + node.geometry.parameters.width, 0),
        mullions: mullions.length
      };
    })()`);
    assert(Math.abs(span.width - 2.60) < 0.01, `Bedroom window must span 2.60m (got ${span.width})`);
    assert(Math.abs(span.center + 1.50) < 0.01, `Bedroom window must center at Z=-1.50m (got ${span.center})`);
    assert(span.curtainWidth >= span.width && span.curtainWidth <= span.width + 0.40, `Bedroom curtain must cover the extended opening with modest overlap (${JSON.stringify(span)})`);
    assert.strictEqual(span.mullions, 4, 'Wide window must use five framed sash sections');
  }
});

module.exports = { tests };
