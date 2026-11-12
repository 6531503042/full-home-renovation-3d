#!/usr/bin/env node
/**
 * Unified E2E Test Runner for full-home-renovation-3d
 *
 * Supports:
 *   --tier 1 | 2 | 3 | 4   (run specific tier)
 *   --filter <pattern>     (run matching tests)
 *   --feature <F1..F21>    (run tests for specific feature)
 *   --port <cdpPort>       (default 9228)
 *   --url <url>            (default http://localhost:8788/)
 */

const { CDPClient } = require('./cdp_client');
const tier1 = require('./suites/tier1').tests;
const tier2 = require('./suites/tier2').tests;
const tier3 = require('./suites/tier3').tests;
const tier4 = require('./suites/tier4').tests;

// Parse command line arguments
const args = process.argv.slice(2);
let selectedTier = null;
let filterPattern = null;
let rawFilter = null;
let selectedFeature = null;
let cdpPort = 9228;
let targetUrl = 'http://localhost:8788/';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tier') {
    if (!args[i + 1]) {
      console.error('\x1b[31m[ERROR] Missing value for --tier argument.\x1b[0m');
      process.exit(1);
    }
    const val = parseInt(args[++i], 10);
    if (![1, 2, 3, 4].includes(val)) {
      console.error(`\x1b[31m[ERROR] Invalid --tier value '${args[i]}'. Valid tiers are 1, 2, 3, or 4.\x1b[0m`);
      process.exit(1);
    }
    selectedTier = val;
  } else if (args[i] === '--filter') {
    if (!args[i + 1]) {
      console.error('\x1b[31m[ERROR] Missing value for --filter argument.\x1b[0m');
      process.exit(1);
    }
    rawFilter = args[++i];
    try {
      filterPattern = new RegExp(rawFilter, 'i');
    } catch (e) {
      // Safely escape special regex characters if an invalid regex string was provided
      const escaped = rawFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filterPattern = new RegExp(escaped, 'i');
    }
  } else if (args[i] === '--feature') {
    if (!args[i + 1]) {
      console.error('\x1b[31m[ERROR] Missing value for --feature argument.\x1b[0m');
      process.exit(1);
    }
    selectedFeature = args[++i].toUpperCase();
  } else if (args[i] === '--port') {
    if (!args[i + 1]) {
      console.error('\x1b[31m[ERROR] Missing value for --port argument.\x1b[0m');
      process.exit(1);
    }
    const parsedPort = parseInt(args[++i], 10);
    if (isNaN(parsedPort) || parsedPort < 1024 || parsedPort > 65535) {
      console.error(`\x1b[31m[ERROR] Invalid --port '${args[i]}'. Must be between 1024 and 65535.\x1b[0m`);
      process.exit(1);
    }
    cdpPort = parsedPort;
  } else if (args[i] === '--url') {
    if (!args[i + 1]) {
      console.error('\x1b[31m[ERROR] Missing value for --url argument.\x1b[0m');
      process.exit(1);
    }
    targetUrl = args[++i];
  }
}

// Assemble test list
let allTests = [];
if (selectedTier === 1) allTests = [...tier1];
else if (selectedTier === 2) allTests = [...tier2];
else if (selectedTier === 3) allTests = [...tier3];
else if (selectedTier === 4) allTests = [...tier4];
else allTests = [...tier1, ...tier2, ...tier3, ...tier4];

if (selectedFeature) {
  allTests = allTests.filter(t => {
    if (t.feature === selectedFeature) return true;
    if (t.feature && t.feature.split('x').includes(selectedFeature)) return true;
    return false;
  });
}

if (filterPattern) {
  allTests = allTests.filter(t => filterPattern.test(t.id) || filterPattern.test(t.name) || filterPattern.test(t.feature));
}

// Prevent empty test runs from falsely passing
if (allTests.length === 0) {
  console.error('\x1b[31m[ERROR] No tests matched the specified criteria.\x1b[0m');
  if (selectedTier) console.error(`  Selected Tier:    Tier ${selectedTier}`);
  if (selectedFeature) console.error(`  Filter Feature:   ${selectedFeature}`);
  if (rawFilter) console.error(`  Filter Pattern:   ${rawFilter}`);
  process.exit(1);
}

async function verifyServer(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Active client reference for graceful termination
let activeClient = null;
let isShuttingDown = false;

async function handleSignal(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n\n[runner] Received ${signal}. Cleaning up browser session and temporary files...`);
  if (activeClient) {
    try {
      await activeClient.close();
    } catch (e) {
      console.error('[runner] Error during client shutdown:', e.message);
    }
    activeClient = null;
  }
  const exitCode = 128 + (signal === 'SIGINT' ? 2 : (signal === 'SIGTERM' ? 15 : 1));
  process.exit(exitCode);
}

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));
process.on('SIGHUP', () => handleSignal('SIGHUP'));

async function main() {
  console.log('='.repeat(80));
  console.log(' FULL-HOME-RENOVATION-3D E2E AUTOMATED TEST SUITE');
  console.log('='.repeat(80));
  console.log(` Target URL : ${targetUrl}`);
  console.log(` CDP Port   : ${cdpPort}`);
  console.log(` Tests in Run: ${allTests.length}`);
  if (selectedTier) console.log(` Selected Tier: Tier ${selectedTier}`);
  if (selectedFeature) console.log(` Filter Feature: ${selectedFeature}`);
  if (rawFilter) console.log(` Filter Pattern: ${rawFilter}`);
  console.log('='.repeat(80));

  const serverReady = await verifyServer(targetUrl);
  if (!serverReady) {
    console.error(`[ERROR] Target server at ${targetUrl} is not responding.`);
    console.error('Please ensure `server.py` is running on port 8788.');
    process.exit(1);
  }

  const client = new CDPClient({
    port: cdpPort,
    url: targetUrl,
    width: 1920,
    height: 1080
  });
  activeClient = client;

  const results = [];
  const tierStats = { 1: { pass: 0, fail: 0 }, 2: { pass: 0, fail: 0 }, 3: { pass: 0, fail: 0 }, 4: { pass: 0, fail: 0 } };
  const featureStats = {};
  let fatalError = null;

  const startTime = Date.now();

  try {
    process.stdout.write('Launching headless Chrome and establishing CDP session... ');
    await client.launch();
    console.log('CONNECTED.\n');

    for (let i = 0; i < allTests.length; i++) {
      const test = allTests[i];
      const testStart = Date.now();
      let passed = false;
      let error = null;
      let timeoutHandle = null;
      let timedOut = false;

      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => {
            timedOut = true;
            reject(new Error('Test timed out after 15000ms'));
          }, 15000);
        });

        await Promise.race([test.fn(client), timeoutPromise]);
        passed = true;
      } catch (err) {
        passed = false;
        error = err.message || String(err);
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
      }

      // Recover session if timed out or socket desynchronized to prevent cascading failures
      if (timedOut || !client.isAlive() || (error && (error.includes('WebSocket') || error.includes('timed out')))) {
        console.log('       \x1b[33m--> Resetting/recovering browser session to prevent cascading timeouts...\x1b[0m');
        try {
          await client.recoverSession();
          console.log('       \x1b[32m--> Session recovered successfully.\x1b[0m');
        } catch (recErr) {
          console.error('       \x1b[31m--> Failed to recover browser session:\x1b[0m', recErr.message);
          fatalError = recErr;
          const duration = Date.now() - testStart;
          results.push({ ...test, passed: false, error: `${error} (Unrecoverable harness session: ${recErr.message})`, duration });
          break;
        }
      }

      const duration = Date.now() - testStart;
      results.push({ ...test, passed, error, duration });

      if (test.tier && tierStats[test.tier]) {
        if (passed) tierStats[test.tier].pass++;
        else tierStats[test.tier].fail++;
      }

      const feat = test.feature || 'General';
      if (!featureStats[feat]) featureStats[feat] = { pass: 0, fail: 0 };
      if (passed) featureStats[feat].pass++;
      else featureStats[feat].fail++;

      const mark = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
      const progress = `[${String(i + 1).padStart(3, ' ')}/${allTests.length}]`;
      const idCol = `[${test.id.padEnd(9, ' ')}]`;
      console.log(`${progress} ${mark} ${idCol} ${test.name.padEnd(65, ' ')} (${duration}ms)`);
      if (!passed && error) {
        console.log(`       \x1b[33m--> ${error}\x1b[0m`);
      }
    }
  } catch (fatal) {
    fatalError = fatal;
    console.error('\n\x1b[31m[FATAL HARNESS ERROR]\x1b[0m', fatal);
  } finally {
    activeClient = null;
    await client.close();
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;
  const totalExecuted = results.length;
  const passRate = totalExecuted > 0 ? ((totalPassed / totalExecuted) * 100).toFixed(1) : 0;

  console.log('\n' + '='.repeat(80));
  console.log(' TEST EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(` Total Executed : ${totalExecuted}`);
  console.log(` Passed         : \x1b[32m${totalPassed}\x1b[0m`);
  console.log(` Failed         : \x1b[31m${totalFailed}\x1b[0m`);
  console.log(` Pass Rate      : ${passRate}%`);
  console.log(` Duration       : ${totalDuration}s`);
  console.log('-'.repeat(80));

  console.log(' BREAKDOWN BY TIER:');
  for (const t of [1, 2, 3, 4]) {
    const s = tierStats[t];
    const total = s.pass + s.fail;
    if (total > 0) {
      const rate = ((s.pass / total) * 100).toFixed(1);
      console.log(`   Tier ${t}: ${String(s.pass).padStart(3, ' ')} passed / ${String(total).padStart(3, ' ')} total (${rate}%)`);
    }
  }

  console.log('-'.repeat(80));
  console.log(' BREAKDOWN BY FEATURE:');
  const featKeys = Object.keys(featureStats).sort();
  for (const f of featKeys) {
    const s = featureStats[f];
    const total = s.pass + s.fail;
    const rate = ((s.pass / total) * 100).toFixed(1);
    console.log(`   ${f.padEnd(10, ' ')}: ${String(s.pass).padStart(2, ' ')} / ${String(total).padStart(2, ' ')} passed (${rate}%)`);
  }

  console.log('='.repeat(80));

  // Exit code logic: fail on any failed test, empty execution, or fatal harness error
  if (fatalError !== null || totalFailed > 0 || totalExecuted === 0) {
    if (fatalError) {
      console.log('\n\x1b[31mSUITE TERMINATED WITH FATAL HARNESS ERROR\x1b[0m');
    }
    if (totalFailed > 0) {
      console.log(`\n\x1b[31m[FAILED TESTS SUMMARY (${totalFailed})]\x1b[0m`);
      results.filter(r => !r.passed).forEach(r => {
        console.log(`- [${r.id}] ${r.name}`);
        console.log(`  Reason: ${r.error}`);
      });
    }
    if (totalExecuted === 0 && !fatalError) {
      console.log('\n\x1b[31mNO TESTS WERE EXECUTED.\x1b[0m');
    }
    console.log('\n');
    process.exit(1);
  } else {
    console.log('\n\x1b[32mALL TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unhandled runner error:', err);
  process.exit(1);
});
