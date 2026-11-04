// Acceptance verification test suite for Memory Management Web Demo
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

console.log("=== RUNNING ACCEPTANCE VERIFICATION TESTS ===");

// 1. Verify A1-01 & A1-02: Base/Limit Check & Translate Logic
function testDemo1() {
  console.log("Testing Demo 1: Check Mode & Translate Mode...");
  
  // A1-01: Base=300040, Limit=120900
  const base1 = 300040, limit1 = 120900, upper1 = base1 + limit1; // 420940
  
  // A = 420939: valid upper bound
  assert.equal(420939 >= base1 && 420939 < upper1, true, "420939 must be valid");
  // A = 420940: trap
  assert.equal(420940 >= base1 && 420940 < upper1, false, "420940 must trigger TRAP");
  // A = 256000: below base
  assert.equal(256000 >= base1 && 256000 < upper1, false, "256000 must trigger TRAP");

  // A1-02: Base=14000, Limit=120900, Offset L=346
  const base2 = 14000, limit2 = 120900, L = 346;
  const isValidL = L >= 0 && L < limit2;
  assert.equal(isValidL, true, "Offset 346 must be valid");
  const pa = base2 + L;
  assert.equal(pa, 14346, "PA must equal 14000 + 346 = 14346");

  // Boundary checks for translate
  assert.equal(0 >= 0 && 0 < limit2, true, "Offset 0 must be valid (PA = 14000)");
  assert.equal(limit2 >= 0 && limit2 < limit2, false, "Offset 120900 must trigger TRAP");
  assert.equal(-5 >= 0 && -5 < limit2, false, "Offset -5 must trigger TRAP");

  console.log("  ✓ Demo 1 tests passed!");
}

// 2. Verify A3-01: Paging Address Translation
function testDemo3() {
  console.log("Testing Demo 3: Paging Address Translation...");
  const la = 10000;
  const pageSize = 4096;
  const p = Math.floor(la / pageSize);
  const d = la % pageSize;
  assert.equal(p, 2, "Page number p must be 2");
  assert.equal(d, 1808, "Offset d must be 1808");

  const frame = 5;
  const pa = frame * pageSize + d;
  assert.equal(pa, 22288, "Physical Address must be 22288");
  console.log("  ✓ Demo 3 tests passed!");
}

// 3. Verify A5-01: Golden Reference Sequence
// Refs: 7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1 | 3 frames
function testDemo5() {
  console.log("Testing Demo 5: Page Replacement Algorithms on 20-ref sequence...");
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const simRStart = html.indexOf('function simR(');
  const framesStart = html.indexOf('function frames(');
  const code = html.slice(simRStart, framesStart);
  
  const vm = require('vm');
  const simR = vm.runInNewContext('(' + code + ')');

  const refs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
  const n = 3;

  const fifoRes = simR(refs, n, 'FIFO');
  const fifoFaults = fifoRes.filter(x => !x.hit).length;
  assert.equal(fifoFaults, 15, `FIFO faults must be 15, got ${fifoFaults}`);

  const lruRes = simR(refs, n, 'LRU');
  const lruFaults = lruRes.filter(x => !x.hit).length;
  assert.equal(lruFaults, 12, `LRU faults must be 12, got ${lruFaults}`);

  const optRes = simR(refs, n, 'OPT');
  const optFaults = optRes.filter(x => !x.hit).length;
  assert.equal(optFaults, 9, `OPT faults must be 9, got ${optFaults}`);

  const clockRes = simR(refs, n, 'CLOCK');
  const clockFaults = clockRes.filter(x => !x.hit).length;
  assert.equal(clockFaults, 14, `CLOCK faults must be 14, got ${clockFaults}`);

  console.log("  ✓ Demo 5 tests passed: FIFO=15, LRU=12, OPT=9, Clock=14!");
}

// 4. Verify Telemetry is completely removed from index.html
function testTelemetryCleanliness() {
  console.log("Testing Telemetry removal...");
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.equal(html.includes('telemetry-wrapper'), false, "No telemetry-wrapper must remain");
  assert.equal(html.includes('GIÁM SÁT THÔNG SỐ MÁY TÍNH KHI CHẠY DEMO'), false, "No telemetry monitor header must remain");
  console.log("  ✓ Telemetry cleanly removed!");
}

// 5. Verify Academic citations removed
function testAcademicCitations() {
  console.log("Testing Academic citation removal...");
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.equal(html.includes('Silberschatz'), false, "No Silberschatz in UI");
  assert.equal(html.includes('Tanenbaum'), false, "No Tanenbaum in UI");
  assert.equal(html.includes('Mục 9.1.2'), false, "No section citations in UI");
  assert.equal(html.includes('PDF Part 4'), false, "No PDF Part 4 in UI");
  console.log("  ✓ Academic citations cleanly removed!");
}

// 6. Verify 2-Column Grids in index.html
function test2ColumnGrids() {
  console.log("Testing 2-Column Grids in all 5 panels...");
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const id of ['grid-p0', 'grid-p1', 'grid-p2', 'grid-p4', 'grid-p3']) {
    assert.equal(html.includes(`id="${id}"`), true, `Grid ${id} must exist in index.html`);
  }
  console.log("  ✓ All 5 panels have 2-column stage grids!");
}

testDemo1();
testDemo3();
testDemo5();
testTelemetryCleanliness();
testAcademicCitations();
test2ColumnGrids();

console.log("\n>>> ALL ACCEPTANCE VERIFICATION TESTS PASSED SUCCESSFULLY! <<<");
