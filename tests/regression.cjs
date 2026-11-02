// Run against `python3 -m http.server 8080` from the repository root.
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
  const snapshot = (id) =>
    page.evaluate((id) => MemoryTeaching.snapshot(id), id);
  const trace = (id) => page.evaluate((id) => MemoryTeaching.trace(id), id);
  async function step(id, n = 1) {
    for (let i = 0; i < n; i++) await page.click("#" + id + "-next");
  }
  async function finish(id) {
    let i = 0;
    while (!(await page.locator("#" + id + "-next").isDisabled()) && i++ < 400)
      await step(id);
    assert.ok(i < 400, "terminates " + id);
  }
  async function check(name, fn) {
    await fn();
    checks.push(name);
    console.log("PASS", name);
  }
  try {
    await page.goto("http://127.0.0.1:8080", { waitUntil: "domcontentloaded" });
    await check(
      "Demo 1: exact bounds, presets and snapshot restoration",
      async () => {
        for (const [button, valid] of [
          ["low", true],
          ["high", true],
          ["over", false],
          ["under", false],
        ]) {
          await page.click("#b-pre-" + button);
          await page.click("#b-all");
          assert.equal((await snapshot("b")).isValid, valid);
        }
        await page.click("#b-pre-low");
        await step("b");
        const s = await snapshot("b");
        await step("b");
        await page.click("#b-prev");
        assert.deepEqual(await snapshot("b"), s);
      },
    );
    await page.click("#t4");
    await check(
      "Demand paging: all six stages commit actual RAM/PTE independently",
      async () => {
        await page.click("#v-reset");
        assert.equal((await trace("v")).length, 6);
        await step("v", 3);
        let s = await snapshot("v");
        assert.equal(s.ram[1], 3);
        assert.equal(s.pt[3].present, false);
        assert.equal(s.reads, 1);
        const ram = structuredClone(s);
        await step("v");
        s = await snapshot("v");
        assert.equal(s.pt[3].present, true);
        assert.equal(s.pt[3].frame, 1);
        await page.click("#v-prev");
        assert.deepEqual(await snapshot("v"), ram);
        await finish("v");
        s = await snapshot("v");
        assert.equal(s.faults, 1);
        assert.equal(s.hits, 0);
        assert.equal(s.reads, 1);
        assert.equal(s.writes, 0);
        await page.click("#v-pre-fault");
        await finish("v");
        s = await snapshot("v");
        assert.equal(s.hits, 1);
        assert.equal(s.faults, 1);
        assert.equal(s.reads, 1);
      },
    );
    await check(
      "Demand paging: FIFO victim and clean/dirty I/O, denied access",
      async () => {
        for (const dirty of [false, true]) {
          await page.click(dirty ? "#v-full-dirty" : "#v-full-clean");
          await finish("v");
          const s = await snapshot("v");
          assert.equal(s.ram[0], 3);
          assert.equal(s.pt[2].present, false);
          assert.equal(s.pt[3].frame, 0);
          assert.equal(s.reads, 1);
          assert.equal(s.writes, +dirty);
        }
        await page.click("#v-pre-invalid");
        await finish("v");
        let s = await snapshot("v");
        assert.equal(s.denied, 1);
        assert.equal(s.reads, 1);
        assert.equal(s.faults, 1);
        await page.click("#v-permission");
        await finish("v");
        s = await snapshot("v");
        assert.equal(s.denied, 1);
        assert.equal(s.reads, 0);
        assert.equal(s.faults, 0);
      },
    );
    await page.click("#t2");
    await check(
      "Paging: miss ≠ fault, 10000 → 22288, repeat hit and 4 B preset",
      async () => {
        await page.click("#x-default");
        assert.equal((await snapshot("x")).miss, 0);
        await finish("x");
        let s = await snapshot("x");
        assert.equal(s.plan.p, 2);
        assert.equal(s.plan.d, 1808);
        assert.equal(s.plan.phys, 22288);
        assert.equal(s.miss, 1);
        assert.equal(s.faults, 0);
        await page.click("#x-go");
        await finish("x");
        s = await snapshot("x");
        assert.equal(s.hit, 1);
        assert.ok(
          !(await trace("x")).some((e) => e.title.includes("Tra bảng trang")),
        );
        await page.click("#x-textbook");
        await finish("x");
        s = await snapshot("x");
        assert.equal(s.plan.p, 3);
        assert.equal(s.plan.d, 1);
        assert.equal(s.plan.phys, 9);
        await page.click("#x-default");
        await page.click("#x-fault");
        await step("x", 3);
        const old = await snapshot("x");
        await step("x");
        await page.click("#x-prev");
        assert.deepEqual(await snapshot("x"), old);
        await finish("x");
        assert.equal((await snapshot("x")).faults, 1);
      },
    );
    await page.click("#t3");
    // Independent reference simulator, separate algorithms and memory representation.
    function reference(refs, n, alg) {
      let slots = Array(n).fill(null),
        q = [],
        last = new Map(),
        bits = Array(n).fill(0),
        hand = 0;
      return refs.map((p, t) => {
        let i = slots.indexOf(p),
          hit = i >= 0;
        if (!hit) {
          i = slots.indexOf(null);
          if (i < 0) {
            if (alg === "FIFO") i = q.shift();
            if (alg === "LRU")
              i = slots
                .map((x) => last.get(x))
                .indexOf(Math.min(...slots.map((x) => last.get(x))));
            if (alg === "OPT") {
              const next = slots.map((x) => {
                const k = refs.slice(t + 1).indexOf(x);
                return k < 0 ? Infinity : k;
              });
              i = next.indexOf(Math.max(...next));
            }
            if (alg === "CLOCK") {
              while (bits[hand]) {
                bits[hand] = 0;
                hand = (hand + 1) % n;
              }
              i = hand;
            }
          } else if (alg === "CLOCK") i = hand;
          slots[i] = p;
          if (alg === "FIFO") q.push(i);
          if (alg === "CLOCK") hand = (i + 1) % n;
        }
        last.set(p, t);
        bits[i] = 1;
        return { fr: [...slots], hit, bit: [...bits], ptr: hand };
      });
    }
    await check(
      "Replacement: all 20 states and 15/12/9/14 fault counts",
      async () => {
        for (const [alg, count] of [
          ["FIFO", 15],
          ["LRU", 12],
          ["OPT", 9],
          ["CLOCK", 14],
        ]) {
          await page.click(`#r-alg button[data-a="${alg}"]`);
          await page.click("#r-book");
          const ev = await trace("r"),
            refs = (await snapshot("r")).refs;
          const expected = reference(refs, 3, alg);
          const apply = ev.filter((e) => e.state.runtime.phase === "apply");
          assert.equal(apply.length, 20);
          apply.forEach((e, i) => {
            assert.deepEqual(
              e.state.runtime.fr,
              expected[i].fr,
              alg + " RAM at " + i,
            );
            assert.deepEqual(
              e.state.runtime.bit,
              expected[i].bit,
              alg + " bits at " + i,
            );
            assert.equal(e.state.runtime.ptr, expected[i].ptr);
          });
          assert.equal(apply.at(-1).state.runtime.faults, count);
          await finish("r");
          const s = await snapshot("r");
          assert.equal(s.runtime.faults, count);
          assert.equal(s.runtime.hits, 20 - count);
        }
      },
    );
    await check(
      "Clock: microsteps, backward and historical snapshots, no duplicate autoplay",
      async () => {
        await page.click("#r-reset");
        const ev = await trace("r"),
          j = ev.findIndex((e) => e.title.includes("R["));
        await step("r", j);
        const s = await snapshot("r");
        await step("r");
        await page.click("#r-prev");
        assert.deepEqual(await snapshot("r"), s);
        await page.locator('#p3 .teach-history button[data-step="1"]').click();
        assert.deepEqual(await snapshot("r"), ev[1].state);
        await page.locator("#p3 .teach-options select").selectOption("2");
        await page.click("#r-play");
        await page.waitForTimeout(1450);
        await page.click("#r-play");
        const pos = await page.evaluate(() => MemoryTeaching.position("r"));
        await page.waitForTimeout(800);
        assert.deepEqual(
          await page.evaluate(() => MemoryTeaching.position("r")),
          pos,
        );
        const hist = await page.locator("#p3 .teach-history button").count();
        assert.equal(hist, pos.seen + 1);
      },
    );
    await check(
      "Display toggles do not mutate algorithm state; Belady and frame controls remain",
      async () => {
        const s = await snapshot("r");
        for (const key of ["explain", "path", "history", "note", "minimal"])
          await page.locator(`#p3 [data-option="${key}"]`).click();
        assert.deepEqual(await snapshot("r"), s);
        await page.click("#r-bel");
        await finish("r");
        assert.equal((await snapshot("r")).runtime.faults, 9);
        assert.match(await page.locator("#r-belady").innerText(), /10 lỗi/);
        await page.click('#r-n button[data-n="4"]');
        await finish("r");
        assert.equal((await snapshot("r")).runtime.faults, 10);
      },
    );
    await page.click("#t1");
    await page.click('#a-mode button[data-m="ex"]');
    await check(
      "Allocation: textbook scan order and unchanged engine results",
      async () => {
        for (const [alg, hole, rest] of [
          ["first", 1, 288],
          ["best", 3, 88],
          ["worst", 4, 388],
        ]) {
          await page.click(`#a-alg button[data-a="${alg}"]`);
          const ev = await trace("a");
          const placement = ev.find((e) => e.title === "Cập nhật RAM · P1");
          assert.equal(placement.state.runtime.free[hole], rest);
          const scans = ev
            .slice(0, ev.indexOf(placement))
            .filter((e) => e.title.includes("xét Lỗ"));
          assert.equal(scans.length, alg === "first" ? 2 : 5);
          await finish("a");
          const s = await snapshot("a");
          const expected = await page.evaluate(() =>
            MemoryTeaching.engines.simA(
              [100, 500, 200, 300, 600],
              [212, 417, 112, 426],
              MemoryTeaching.snapshot("a").alg,
            ),
          );
          assert.deepEqual(s.runtime.free, expected.free);
          assert.deepEqual(s.runtime.pieces, expected.pieces);
        }
      },
    );
    await check(
      "Free allocation: full scenario, manual close/coalesce, compact and restore",
      async () => {
        await page.click('#a-mode button[data-m="free"]');
        await page.click('#a-alg button[data-a="first"]');
        await page.click("#f-reset");
        await finish("f");
        let s = await snapshot("f");
        assert.equal(
          s.segs.reduce((n, s) => n + s.size, 0),
          1000,
        );
        assert.ok(s.segs.some((s) => s.name === "G"));
        await page.click('#f-ram button[data-n="A"]');
        const before = await snapshot("f");
        await page.click("#f-compact");
        const after = await snapshot("f");
        assert.equal(after.segs.filter((s) => !s.name).length, 1);
        await page.click("#f-prev");
        assert.deepEqual(await snapshot("f"), before);
        await step("f");
        assert.deepEqual(await snapshot("f"), after);
        await page.fill("#f-size", "50");
        await page.click("#f-open");
        await finish("f");
        assert.ok((await snapshot("f")).segs.some((s) => s.name === "H1"));
      },
    );
    await check(
      "Invalid inputs, transaction restart and reset isolation",
      async () => {
        await page.click("#t4");
        await page.locator("#v-config").evaluate((el) => (el.open = true));
        await page.click("#v-config-sample");
        await step("v", 3);
        await page.click("#v-pre-hit");
        await finish("v");
        let state = await snapshot("v");
        assert.equal(
          state.ram[1],
          null,
          "cancel unfinished page-in before new scenario",
        );
        assert.equal(state.pt[3].present, false);
        assert.equal(state.reads, 0);
        await page.fill("#v-page", "");
        await page.click("#v-go");
        assert.match(await page.locator("#v-error").innerText(), /nhập/);
        await page.click("#t2");
        await page.fill("#x-addr", "-1");
        const before = await snapshot("x");
        await page.click("#x-go");
        assert.deepEqual(await snapshot("x"), before);
        await page.click("#t3");
        await page
          .locator("#p3 > details")
          .last()
          .evaluate((el) => (el.open = true));
        await page.fill("#r-str", "");
        const saved = await snapshot("r");
        await page.click("#r-apply");
        assert.deepEqual(await snapshot("r"), saved);
        assert.match(await page.locator("#r-error").innerText(), /Nhập/);
        await page.click("#r-reset");
        assert.equal(
          await page.locator("#p3 .teach-history button").count(),
          1,
        );
        await page.click("#t1");
        await page.click('#a-mode button[data-m="ex"]');
        await page.click("#a-reset");
        await step("a", 4);
        const a = await snapshot("a");
        await step("a");
        await page.click("#a-prev");
        assert.deepEqual(await snapshot("a"), a);
      },
    );
    await check("Responsive, dark mode and no page errors", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const tab of [0, 1, 2, 4, 3]) {
        await page.click("#t" + tab);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "no page overflow tab " + tab,
        );
      }
      const old = await page.locator("html").getAttribute("data-theme");
      await page.click("#theme-toggle");
      assert.notEqual(
        await page.locator("html").getAttribute("data-theme"),
        old,
      );
      assert.deepEqual(errors, []);
    });
    fs.mkdirSync("/workspace/artifacts/memory-demo", { recursive: true });
    fs.writeFileSync(
      "/workspace/artifacts/memory-demo/test-results.json",
      JSON.stringify({ passed: checks.length, checks, errors }, null, 2),
    );
    console.log(`ALL ${checks.length} CHECK GROUPS PASSED`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
