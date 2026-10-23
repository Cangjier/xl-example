// PossibleShapeCache 的 Share 自测：Share 不受 Clear 影响，Values 受 Clear 影响。
// 只依赖编译产物与 node 内置模块；全 PASS 退出 0，任一 FAIL 退出 1。
import { createRequire } from "node:module";
import assert from "node:assert";

const require = createRequire(import.meta.url);
const { PossibleShapeCache } = require("../../build/ts/core/syntax/possible-shape-cache.js");

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
  cache.SetState("形状甲", { Start: 1 });
  assert.notStrictEqual(cache.GetState("形状甲"), null, "SetState 之后应当能取到状态");
  cache.Clear();
  assert.strictEqual(cache.GetState("形状甲"), null, "Clear 之后 GetState 必须返回 null");
});

check("(b) SetShare 后 Clear → GetShare 返回同一个对象（引用相等）", () => {
  const cache = new PossibleShapeCache();
  const shared = { Start: 7, Items: [] };
  cache.SetShare("形状甲", shared);
  cache.Clear();
  assert.strictEqual(cache.GetShare("形状甲"), shared, "Clear 不得清掉 Share，且必须是同一个对象");
});

check("(c) 未写过的键 GetShare 返回 null", () => {
  const cache = new PossibleShapeCache();
  assert.strictEqual(cache.GetShare("没写过的形状"), null);
});

check("(d) 两个不同键的 Share 互不覆盖", () => {
  const cache = new PossibleShapeCache();
  const sharedA = { Start: 1 };
  const sharedB = { Start: 2 };
  cache.SetShare("形状甲", sharedA);
  cache.SetShare("形状乙", sharedB);
  assert.strictEqual(cache.GetShare("形状甲"), sharedA);
  assert.strictEqual(cache.GetShare("形状乙"), sharedB);
  cache.SetShare("形状甲", { Start: 3 });
  assert.deepStrictEqual(cache.GetShare("形状乙"), sharedB, "写形状甲不得覆盖形状乙");
});

check("(e) ClearShare 之后 GetShare 返回 null", () => {
  const cache = new PossibleShapeCache();
  cache.SetShare("形状甲", { Start: 1 });
  cache.SetShare("形状乙", { Start: 2 });
  cache.ClearShare();
  assert.strictEqual(cache.GetShare("形状甲"), null);
  assert.strictEqual(cache.GetShare("形状乙"), null);
});

const failed = results.filter((item) => !item.ok).length;
console.log(`\n${results.length - failed}/${results.length} PASS, ${failed} FAIL`);
process.exit(failed === 0 ? 0 : 1);
