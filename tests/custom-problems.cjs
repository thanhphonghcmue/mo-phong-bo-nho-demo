const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    }),
    errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const snap = (id) => page.evaluate((id) => MemoryTeaching.snapshot(id), id),
    trace = (id) => page.evaluate((id) => MemoryTeaching.trace(id), id);
  async function check(name, fn) {
    await fn();
    checks.push(name);
    console.log("PASS", name);
  }
  async function fill(values) {
    for (const [id, v] of Object.entries(values)) {
      const el = page.locator("#" + id);
      if (await el.evaluate((e) => e.tagName === "SELECT"))
        await el.selectOption(String(v));
      else await el.fill(String(v));
    }
  }
  async function config(id, values) {
    await page.locator("#" + id + "-config").evaluate((el) => (el.open = true));
    await fill(values);
    await page.click("#" + id + "-config-apply");
    const err = await page
      .locator("#" + id + "-config .teach-config-status")
      .innerText();
    assert.ok(
      !(await page
        .locator("#" + id + "-config .teach-config-status")
        .evaluate((e) => e.classList.contains("teach-error"))),
      err,
    );
  }
  async function finish(id) {
    let guard = 0;
    while (
      !(await page.locator("#" + id + "-next").isDisabled()) &&
      guard++ < 1500
    )
      await page.click("#" + id + "-next");
    assert.ok(guard < 1500, "finite " + id);
  }
  async function next(id, n = 1) {
    for (let i = 0; i < n; i++) await page.click("#" + id + "-next");
  }
  try {
    await page.goto("http://127.0.0.1:8080", { waitUntil: "domcontentloaded" });
    await check(
      "Base/Limit: zero values, custom boundaries, draft and rejected input",
      async () => {
        await fill({ "b-base": 0, "b-limit": 4, "b-addr": 0 });
        await page.click("#b-go");
        await finish("b");
        let s = await snap("b");
        assert.equal(s.base, 0);
        assert.doesNotMatch(
          await page.locator("#b-ram-track").innerText(),
          /0\.\.-1/,
        );
        assert.equal(s.addr, 0);
        assert.equal(s.isValid, true);
        assert.ok(await page.locator("#b-pre-under").isDisabled());
        assert.match(await page.locator(".b-ram-legend").innerText(), /4 byte/);
        await page.click("#b-pre-over");
        await finish("b");
        s = await snap("b");
        assert.equal(s.addr, 4);
        assert.equal(s.isValid, false);
        await fill({ "b-base": 512, "b-limit": 128, "b-addr": 639 });
        await page.click("#b-go");
        await finish("b");
        assert.equal((await snap("b")).isValid, true);
        await page.click("#b-pre-high");
        assert.equal((await snap("b")).addr, 639);
        const old = await snap("b");
        await fill({ "b-limit": 0 });
        await page.click("#b-go");
        assert.deepEqual(await snap("b"), old);
        await page.click("#b-sample");
        assert.equal((await snap("b")).base, 300040);
      },
    );
    await page.click("#t2");
    await check(
      "Paging: configurable page size, frame map, warm TLB and LRU refill",
      async () => {
        await fill({ "x-addr": 2200 });
        await config("x", {
          "x-c-size": 1024,
          "x-c-pages": 4,
          "x-c-frames": 6,
          "x-c-tlb": 2,
          "x-c-pt": "4,-,1,3",
          "x-c-other": "0",
          "x-c-cache": "2:1",
        });
        await finish("x");
        let s = await snap("x");
        assert.equal(s.plan.p, 2);
        assert.equal(s.plan.d, 152);
        assert.equal(s.plan.phys, 1176);
        assert.equal(s.hit, 1);
        assert.equal(s.miss, 0);
        assert.ok(
          !(await trace("x")).some(
            (e) => e.title === "Tra bảng trang trong RAM",
          ),
        );
        await fill({ "x-addr": 3840 });
        await page.click("#x-go");
        await finish("x");
        assert.equal((await snap("x")).plan.phys, 3840);
        await fill({ "x-addr": 1536 });
        await page.click("#x-go");
        await finish("x");
        s = await snap("x");
        assert.equal(s.pt[1], 2);
        assert.equal(s.plan.phys, 2560);
        assert.equal(s.faults, 1);
        assert.equal(s.tlb.length, 2);
        assert.ok(!s.tlb.some((e) => e.page === 2));
        await page.click("#x-reset");
        s = await snap("x");
        assert.equal(s.pageSize, 1024);
        assert.equal(s.plan.addr, 2200);
        assert.deepEqual(s.pt, [4, null, 1, 3]);
        assert.deepEqual(
          s.tlb.map((e) => e.page),
          [2],
        );
        assert.equal(s.hit, 0);
      },
    );
    await check(
      "Paging: full RAM stops safely; invalid or unapplied configuration is isolated",
      async () => {
        await fill({ "x-addr": 600 });
        await config("x", {
          "x-c-size": 256,
          "x-c-pages": 3,
          "x-c-frames": 2,
          "x-c-tlb": 1,
          "x-c-pt": "0,1,-",
          "x-c-other": "",
          "x-c-cache": "",
        });
        await finish("x");
        let s = await snap("x");
        assert.equal(s.plan.blocked, true);
        assert.equal(s.faults, 1);
        assert.deepEqual(s.pt, [0, 1, null]);
        assert.equal(s.tlb.length, 0);
        assert.match(await page.locator("#x-cap").innerText(), /chưa thể nạp/);
        assert.doesNotMatch(
          await page.locator("#x-flow").innerText(),
          /NaN|undefined/,
        );
        const old = await snap("x");
        await fill({ "x-c-pt": "0,0,-" });
        assert.deepEqual(await snap("x"), old);
        await page.click("#x-config-apply");
        assert.deepEqual(await snap("x"), old);
        assert.match(
          await page.locator("#x-config .teach-config-status").innerText(),
          /trùng/,
        );
        await page.click("#x-reset");
        assert.equal((await snap("x")).frameCount, 2);
      },
    );
    await page.click("#t4");
    await check(
      "Demand paging: custom FIFO order, dirty page and multiple references",
      async () => {
        await config("v", {
          "v-c-pages": 6,
          "v-c-frames": 2,
          "v-c-ram": "0,1",
          "v-c-dirty": "1",
          "v-c-denied": "",
          "v-c-unmapped": "",
          "v-c-order": "1,0",
          "v-c-recent": "0,1",
          "v-c-bits": "1,0",
          "v-c-hand": 0,
          "v-c-policy": "FIFO",
          "v-c-refs": "2,0,2",
        });
        await finish("v");
        let s = await snap("v");
        assert.deepEqual(s.ram, [0, 2]);
        assert.equal(s.faults, 1);
        assert.equal(s.hits, 2);
        assert.equal(s.reads, 1);
        assert.equal(s.writes, 1);
        assert.equal(s.accesses, 3);
        const ev = await trace("v");
        const j = ev.findIndex((e) => e.kind === "page-out");
        await page
          .locator("#p4 .teach-history button")
          .filter({ hasText: ev[j].title })
          .first()
          .click();
        s = await snap("v");
        assert.equal(s.writes, 1);
        await page.click("#v-prev");
        assert.equal((await snap("v")).writes, 0);
        await page.click("#v-reset");
        s = await snap("v");
        assert.equal(s.policy, "FIFO");
        assert.deepEqual(s.ram, [0, 1]);
        assert.equal(s.pt[1].dirty, true);
        assert.equal(s.faults, 0);
      },
    );
    await check(
      "Demand paging: FIFO / LRU / Clock decisions follow custom state",
      async () => {
        for (const [policy, expected] of [
          ["FIFO", [2, 1]],
          ["LRU", [0, 2]],
          ["CLOCK", [0, 2]],
        ]) {
          await config("v", {
            "v-c-policy": policy,
            "v-c-dirty": "",
            "v-c-order": "0,1",
            "v-c-recent": "0,1",
            "v-c-bits": "1,0",
            "v-c-hand": 0,
            "v-c-refs": "0,2",
          });
          await finish("v");
          const s = await snap("v");
          assert.deepEqual(s.ram, expected, policy);
          assert.equal(s.faults, 1);
          assert.equal(s.hits, 1);
          assert.equal(s.writes, 0);
          if (policy === "CLOCK") {
            const victim = (await trace("v")).find((e) =>
              e.title.includes("chọn victim"),
            );
            assert.equal(
              victim.state.replacement.bit[victim.state.plan.chosenFrame],
              0,
            );
            assert.deepEqual(victim.state.ram, [0, 1]);
          }
        }
      },
    );
    await check(
      "Demand paging: STORE marks dirty; unmapped access stops the sequence",
      async () => {
        await config("v", {
          "v-c-pages": 3,
          "v-c-frames": 1,
          "v-c-ram": "0",
          "v-c-policy": "FIFO",
          "v-c-order": "0",
          "v-c-recent": "0",
          "v-c-bits": "1",
          "v-c-hand": 0,
          "v-c-dirty": "",
          "v-c-denied": "",
          "v-c-unmapped": "",
          "v-c-refs": "0,1",
          "v-op": "write",
        });
        await finish("v");
        let s = await snap("v");
        assert.equal(s.hits, 1);
        assert.equal(s.faults, 1);
        assert.equal(s.writes, 1);
        assert.equal(s.reads, 1);
        assert.equal(s.pt[1].dirty, true);
        await config("v", {
          "v-op": "read",
          "v-c-refs": "2,0",
          "v-c-unmapped": "2",
        });
        await finish("v");
        s = await snap("v");
        assert.equal(s.denied, 1);
        assert.equal(s.accesses, 1);
        assert.equal(s.reads, 0);
        assert.equal(s.faults, 0);
        const old = await snap("v");
        await fill({ "v-c-ram": "0,0" });
        await page.click("#v-config-apply");
        assert.deepEqual(await snap("v"), old);
        assert.match(
          await page.locator("#v-config .teach-config-status").innerText(),
          /mục|trùng/,
        );
      },
    );
    await page.click("#t1");
    await page.click('#a-mode button[data-m="free"]');
    await check(
      "Allocation: capacity, initial segments and custom open/close/compact script",
      async () => {
        await config("f", {
          "f-c-capacity": 2048,
          "f-c-layout": "A:256, -:256, B:512, -:1024",
          "f-c-script": "Mở C 300\nĐóng A\nDồn",
        });
        await finish("f");
        let s = await snap("f");
        assert.equal(s.capacity, 2048);
        assert.deepEqual(s.segs, [
          { start: 0, size: 512, name: "B" },
          { start: 512, size: 300, name: "C" },
          { start: 812, size: 1236, name: null },
        ]);
        assert.match(await page.locator("#f-ruler").innerText(), /2048/);
        assert.match(
          await page.locator("#tele-p1 .tele-sim-box").innerText(),
          /2048/,
        );
        await page.click("#f-reset");
        s = await snap("f");
        assert.equal(s.segs[0].name, "A");
        assert.equal(s.segs[2].name, "B");
        assert.equal(s.capacity, 2048);
        await fill({ "f-c-layout": "A:4096" });
        const before = await snap("f");
        await page.click("#f-config-apply");
        assert.deepEqual(await snap("f"), before);
        assert.match(
          await page.locator("#f-config .teach-config-status").innerText(),
          /vượt/,
        );
      },
    );
    await check(
      "Allocation: manual-only scenario, oversized requests and no false allocation",
      async () => {
        await config("f", {
          "f-c-capacity": 64,
          "f-c-layout": "",
          "f-c-script": "",
        });
        assert.ok(await page.locator("#f-next").isDisabled());
        await fill({ "f-size": 1 });
        await page.click("#f-open");
        await finish("f");
        assert.equal((await snap("f")).segs[0].size, 1);
        await fill({ "f-size": 100 });
        await page.click("#f-open");
        await finish("f");
        let s = await snap("f");
        assert.equal(s.waiting.length, 1);
        assert.equal(
          s.segs.reduce((a, s) => a + s.size, 0),
          64,
        );
        assert.match(
          await page.locator("#f-cap").innerText(),
          /tổng trống 63 KB không đủ/,
        );
      },
    );
    await check(
      "Allocation exercise: arbitrary numbers, zero spacer, reset and unchanged decisions",
      async () => {
        await page.click('#a-mode button[data-m="ex"]');
        await page
          .locator("#e-wrap > details")
          .evaluate((e) => (e.open = true));
        await fill({
          "a-holes": "30,60,40",
          "a-reqs": "40,35,50",
          "a-c-gap": 0,
        });
        await page.click("#a-apply");
        await finish("a");
        const s = await snap("a");
        assert.deepEqual(s.runtime.free, [30, 20, 5]);
        assert.equal(s.gap, 0);
        await page.click("#a-reset");
        assert.deepEqual((await snap("a")).runtime.free, [30, 60, 40]);
      },
    );
    await page.click("#t3");
    await check(
      "Replacement: nonempty, noncontiguous RAM and Clock pointer do not overwrite occupied frames",
      async () => {
        await page.click('#r-alg button[data-a="CLOCK"]');
        await config("r", {
          "r-c-n": 4,
          "r-c-ram": "8,-,3,-",
          "r-c-refs": "9,8,3,9",
          "r-c-order": "8,3",
          "r-c-recent": "3,8",
          "r-c-bits": "1,0,0,0",
          "r-c-hand": 2,
        });
        const ev = await trace("r");
        assert.deepEqual(ev[0].state.runtime.fr, [8, null, 3, null]);
        assert.equal(ev[0].state.runtime.ptr, 2);
        const apply = ev.filter((e) => e.state.runtime.phase === "apply");
        assert.deepEqual(apply[0].state.runtime.fr, [8, null, 3, 9]);
        assert.equal(apply[0].state.runtime.victim, null);
        await finish("r");
        let s = await snap("r");
        assert.equal(s.runtime.faults, 1);
        assert.equal(s.runtime.hits, 3);
        assert.doesNotMatch(
          await page.locator("#r-cap").innerText(),
          /trống →/,
        );
        await page.click("#r-reset");
        s = await snap("r");
        assert.deepEqual(s.runtime.fr, [8, null, 3, null]);
        assert.equal(s.runtime.ptr, 2);
        assert.equal(s.runtime.hits, 0);
      },
    );
    await check(
      "Replacement: custom FIFO / LRU order, OPT future use and one-frame Clock microsteps",
      async () => {
        await config("r", {
          "r-c-n": 3,
          "r-c-ram": "4,2,7",
          "r-c-refs": "8",
          "r-c-order": "2,7,4",
          "r-c-recent": "7,4,2",
          "r-c-bits": "1,1,0",
          "r-c-hand": 0,
        });
        for (const [alg, victim] of [
          ["FIFO", 2],
          ["LRU", 7],
          ["OPT", 4],
        ]) {
          await page.click(`#r-alg button[data-a="${alg}"]`);
          const last = (await trace("r")).at(-1).state.runtime;
          assert.equal(last.victim, victim, alg);
          assert.equal(last.faults, 1);
        }
        await page.click('#r-alg button[data-a="CLOCK"]');
        await config("r", {
          "r-c-n": 1,
          "r-c-ram": "7",
          "r-c-refs": "8,7",
          "r-c-order": "7",
          "r-c-recent": "7",
          "r-c-bits": "1",
          "r-c-hand": 0,
        });
        let ev = await trace("r");
        assert.equal(
          ev.filter((e) => e.title.includes("kiểm tra Frame")).length,
          2,
        );
        await finish("r");
        assert.equal((await snap("r")).runtime.faults, 2);
        const s = await snap("r");
        await fill({ "r-c-bits": "2" });
        await page.click("#r-config-apply");
        assert.deepEqual(await snap("r"), s);
        assert.match(
          await page.locator("#r-config .teach-config-status").innerText(),
          /Bit R/,
        );
      },
    );
    await check(
      "Large valid Base/Limit values remain readable and correct",
      async () => {
        await page.click("#t0");
        await fill({
          "b-base": 1000000000,
          "b-limit": 1000000000,
          "b-addr": 1999999999,
        });
        await page.click("#b-go");
        await finish("b");
        assert.equal((await snap("b")).isValid, true);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.setViewportSize({ width: 1440, height: 1050 });
        await page.click("#b-sample");
      },
    );
    await check(
      "Config editors, concise explanations, snapshots and responsive rendering",
      async () => {
        for (const [tab, id] of [
          [0, "b"],
          [1, "a"],
          [2, "x"],
          [4, "v"],
          [3, "r"],
        ]) {
          await page.click("#t" + tab);
          if (id !== "b") {
            const ev = await trace(id);
            for (const e of ev) {
              assert.ok(e.condition.length < 250, `${id} condition too long`);
              assert.ok(e.change.length < 330, `${id} result too long`);
              assert.doesNotMatch(e.change, /NaN|undefined/);
            }
          }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        for (const tab of [0, 1, 2, 4, 3]) {
          await page.click("#t" + tab);
          const config = page.locator(
            "#" + { 1: "f", 2: "x", 4: "v", 3: "r" }[tab] + "-config",
          );
          if (tab !== 0 && (await config.isVisible()))
            await config.evaluate((e) => (e.open = true));
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            "mobile " + tab,
          );
        }
        assert.deepEqual(errors, []);
      },
    );
    fs.mkdirSync("/workspace/artifacts/memory-demo-custom", {
      recursive: true,
    });
    fs.writeFileSync(
      "/workspace/artifacts/memory-demo-custom/test-results.json",
      JSON.stringify({ passed: checks.length, checks, errors }, null, 2),
    );
    console.log("ALL " + checks.length + " CUSTOM CHECK GROUPS PASSED");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
