// PossibleShapeCache 的 Share 自测：Share 不受 Clear 影响，Values 受 Clear 影响。
// 缓存的键是**整数槽位**（`PossibleShape.Slot()` 发出来的号），不是名字：
// 这里直接用两个不同的整数当槽，等价于两个不同的形状类。
// 只依赖编译产物与 node 内置模块；全 PASS 退出 0，任一 FAIL 退出 1。
import { createRequire } from "node:module";
import assert from "node:assert";

const require = createRequire(import.meta.url);
const { PossibleShapeCache } = require("../../build/ts/core/syntax/possible-shape-cache.js");

const SLOT_A = 0;
const SLOT_B = 1;

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

check("(a) SetState 后 Clear → GetState 返回 null", () => {
  const cache = new PossibleShapeCache();
  cache.SetState(SLOT_A, { Start: 1 });
  assert.notStrictEqual(cache.GetState(SLOT_A), null, "SetState 之后应当能取到状态");
  cache.Clear();
  assert.strictEqual(cache.GetState(SLOT_A), null, "Clear 之后 GetState 必须返回 null");
});

check("(b) SetShare 后 Clear → GetShare 返回同一个对象（引用相等）", () => {
  const cache = new PossibleShapeCache();
  const shared = { Start: 7, Items: [] };
  cache.SetShare(SLOT_A, shared);
  cache.Clear();
  assert.strictEqual(cache.GetShare(SLOT_A), shared, "Clear 不得清掉 Share，且必须是同一个对象");
});

check("(c) 未写过的槽 GetShare 返回 null", () => {
  const cache = new PossibleShapeCache();
  assert.strictEqual(cache.GetShare(SLOT_B), null);
});

check("(d) 两个不同槽的 Share 互不覆盖", () => {
  const cache = new PossibleShapeCache();
  const sharedA = { Start: 1 };
  const sharedB = { Start: 2 };
  cache.SetShare(SLOT_A, sharedA);
  cache.SetShare(SLOT_B, sharedB);
  assert.strictEqual(cache.GetShare(SLOT_A), sharedA);
  assert.strictEqual(cache.GetShare(SLOT_B), sharedB);
  cache.SetShare(SLOT_A, { Start: 3 });
  assert.deepStrictEqual(cache.GetShare(SLOT_B), sharedB, "写槽 A 不得覆盖槽 B");
});

check("(e) ClearShare 之后 GetShare 返回 null", () => {
  const cache = new PossibleShapeCache();
  cache.SetShare(SLOT_A, { Start: 1 });
  cache.SetShare(SLOT_B, { Start: 2 });
  cache.ClearShare();
  assert.strictEqual(cache.GetShare(SLOT_A), null);
  assert.strictEqual(cache.GetShare(SLOT_B), null);
});

check("(f) 槽位号决定槽：同一槽同一状态，不同槽不同状态", () => {
  const cache = new PossibleShapeCache();
  const stateA = { Start: 1 };
  cache.SetState(SLOT_A, stateA);
  cache.SetState(SLOT_B, { Start: 2 });
  assert.strictEqual(cache.GetState(SLOT_A), stateA, "同一槽必须还是同一个对象");
  assert.notStrictEqual(cache.GetState(SLOT_A), cache.GetState(SLOT_B), "不同槽必须是不同状态");
});

check("(g) Clear 之后同一个槽可以重新写入（槽位号不因清空而变）", () => {
  const cache = new PossibleShapeCache();
  cache.SetState(SLOT_A, { Start: 1 });
  cache.Clear();
  const rebuilt = { Start: 9 };
  cache.SetState(SLOT_A, rebuilt);
  assert.strictEqual(cache.GetState(SLOT_A), rebuilt);
});

const failed = results.filter((item) => !item.ok).length;
console.log(`\n${results.length - failed}/${results.length} PASS, ${failed} FAIL`);
process.exit(failed === 0 ? 0 : 1);
