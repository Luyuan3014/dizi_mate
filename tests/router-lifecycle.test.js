import test from "node:test";
import assert from "node:assert/strict";
import { Router } from "../src/router.js";

test("router manages mount, unmount and route transitions with lifecycle hooks", () => {
  const container = { innerHTML: "" };
  const lifecycleEvents = [];

  class MockPageA {
    constructor(context) {
      this.context = context;
    }
    mount(container) {
      lifecycleEvents.push("mount:A");
      container.innerHTML = "<div>Page A</div>";
    }
    unmount() {
      lifecycleEvents.push("unmount:A");
    }
    update() {
      lifecycleEvents.push("update:A");
    }
  }

  class MockPageB {
    constructor(context) {
      this.context = context;
    }
    mount(container) {
      lifecycleEvents.push("mount:B");
      container.innerHTML = "<div>Page B</div>";
    }
    unmount() {
      lifecycleEvents.push("unmount:B");
    }
    update() {
      lifecycleEvents.push("update:B");
    }
  }

  const routes = {
    pageA: (ctx) => new MockPageA(ctx),
    pageB: (ctx) => new MockPageB(ctx),
  };

  const beforeNav = [];
  const afterNav = [];

  const router = new Router({
    container,
    context: { name: "test-context" },
    routes,
    onBeforeNavigate: (from, to) => beforeNav.push(`${from}->${to}`),
    onAfterNavigate: (to) => afterNav.push(to),
  });

  // Navigate to Page A
  router.navigate("pageA", { fromHash: true });
  assert.equal(router.getCurrentPageId(), "pageA");
  assert.equal(container.innerHTML, "<div>Page A</div>");
  assert.deepEqual(lifecycleEvents, ["mount:A"]);
  assert.deepEqual(beforeNav, ["null->pageA"]);
  assert.deepEqual(afterNav, ["pageA"]);

  // Navigating to the same page should be a no-op (no unmount/mount)
  router.navigate("pageA", { fromHash: true });
  assert.deepEqual(lifecycleEvents, ["mount:A"]);

  // Navigate to Page B: should unmount A, clean container, mount B
  router.navigate("pageB", { fromHash: true });
  assert.equal(router.getCurrentPageId(), "pageB");
  assert.equal(container.innerHTML, "<div>Page B</div>");
  assert.deepEqual(lifecycleEvents, ["mount:A", "unmount:A", "mount:B"]);
  assert.deepEqual(beforeNav, ["null->pageA", "pageA->pageB"]);
  assert.deepEqual(afterNav, ["pageA", "pageB"]);
});
