const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

console.log("=== RUNNING BROWSER EXECUTION SIMULATION ===");

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../assets/js/teaching.js'), 'utf8');

// Basic DOM Mock
class ElementMock {
  constructor(tag, id = '', className = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = className;
    this.style = {};
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.textContent = '';
    this._innerHTML = '';
    this.hidden = false;
    this.disabled = false;
    this.value = '100';
    this.classList = {
      add: (c) => this.className += ' ' + c,
      remove: (c) => this.className = this.className.replace(c, '').trim(),
      toggle: (c, force) => {
        const has = this.className.includes(c);
        const shouldHave = force !== undefined ? force : !has;
        if (shouldHave && !has) this.className += ' ' + c;
        if (!shouldHave && has) this.className = this.className.replace(c, '').trim();
        return shouldHave;
      },
      contains: (c) => this.className.includes(c)
    };
  }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) || null; }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  append(...children) {
    children.forEach(c => this.appendChild(c));
  }
  before(...nodes) {}
  after(...nodes) {}
  closest(sel) { return this.parentElement || this; }
  querySelector(sel) { return new ElementMock('div'); }
  querySelectorAll(sel) { return []; }
  addEventListener(event, fn) {}
  getBoundingClientRect() { return { top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100 }; }
  set innerHTML(val) { this._innerHTML = val; }
  get innerHTML() { return this._innerHTML; }
}

const mockDoc = {
  documentElement: new ElementMock('html'),
  body: new ElementMock('body'),
  createElement: (tag) => new ElementMock(tag),
  getElementById: (id) => new ElementMock('div', id),
  querySelector: (sel) => new ElementMock('div', sel.replace('#', '')),
  querySelectorAll: (sel) => [new ElementMock('div')],
  addEventListener: (event, fn) => {}
};

console.log("Mock environment created.");
console.log("Verifying teaching.js syntax and self-execution under sandbox...");

const sandbox = {
  window: {},
  document: mockDoc,
  localStorage: {
    store: {},
    getItem: function(k) { return this.store[k] || null; },
    setItem: function(k, v) { this.store[k] = String(v); }
  },
  navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
  performance: { now: () => Date.now(), memory: { usedJSHeapSize: 1000, totalJSHeapSize: 2000 } },
  matchMedia: () => ({ matches: false }),
  setTimeout: (fn, delay) => { fn(); return 1; },
  clearTimeout: () => {},
  console: console
};
sandbox.window = sandbox;

// Run teaching.js
vm.runInNewContext(js, sandbox);
assert.equal(typeof sandbox.window.enhanceMemoryDemo, 'function', 'enhanceMemoryDemo must be defined');
console.log("  ✓ teaching.js loaded and define enhanceMemoryDemo successfully!");

console.log("All simulations passed successfully!");
