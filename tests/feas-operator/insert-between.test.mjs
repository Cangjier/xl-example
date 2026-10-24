// insert-between 原语的单测：Data 顺序 / Parent / MountedUnit / SourceRange / Pos / 嵌套插入。
//
//   node tests/feas-operator/insert-between.test.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);

const { ShapeInsertUtil } = require(path.join(root, "build/ts/typescript/tokens/shape-insert-util.js"));
const { IdentifierShape } = require(path.join(root, "build/ts/typescript/tokens/names/identifier-shape.js"));
const { BinaryExpressionShape } = require(path.join(root, "build/ts/typescript/tokens/expressions/binary-expression-shape.js"));
const { TypescriptTemplate } = require(path.join(root, "build/ts/typescript/run/typescript-template.js"));

const template = TypescriptTemplate.Create();

function leaf(name, start, end) {
  const shape = new IdentifierShape(template);
  shape.SignIn(start);
  shape.SignOut(end);
  shape.Pos = start;
  return shape;
}

function wrapper() {
  return new BinaryExpressionShape(template);
}

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL  ${name}`);
    console.log(`      ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSame(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}：实际 ${String(actual)}，期望 ${String(expected)}`);
  }
}

// 1) Data 顺序：wrapper 原位顶替 child，兄弟顺序不变
check("Data 顺序：wrapper 原位顶替 child", () => {
  const parent = wrapper();
  const a = parent.Add(leaf("a", 0, 1));
  const b = parent.Add(leaf("b", 2, 3));
  const c = parent.Add(leaf("c", 4, 5));
  const w = wrapper();
  ShapeInsertUtil.InsertBetween(parent, b, w);
  assertSame(parent.Data.length, 3, "parent.Data 长度");
  assertSame(parent.Data[0], a, "parent.Data[0]");
  assertSame(parent.Data[1], w, "parent.Data[1]");
  assertSame(parent.Data[2], c, "parent.Data[2]");
});

// 2) Parent 指针：wrapper -> parent，child -> wrapper，兄弟不变
check("Parent 指针：child 被搬进 wrapper", () => {
  const parent = wrapper();
  parent.Add(leaf("a", 0, 1));
  const b = parent.Add(leaf("b", 2, 3));
  const w = wrapper();
  ShapeInsertUtil.InsertBetween(parent, b, w);
  assertSame(w.Parent, parent, "wrapper.Parent");
  assertSame(b.Parent, w, "child.Parent");
  assertSame(w.Data.length, 1, "wrapper.Data 长度");
  assertSame(w.Data[0], b, "wrapper.Data[0]");
});

// 3) MountedUnit 转交：parent 原来挂的是 child 时，挂到 wrapper 上，wrapper 再挂 child
check("MountedUnit 转交（父挂 child）", () => {
  const parent = wrapper();
  parent.Add(leaf("a", 0, 1));
  const b = parent.Add(leaf("b", 2, 3));
  parent.MountedUnit = b;
  const w = wrapper();
  ShapeInsertUtil.InsertBetween(parent, b, w);
  assertSame(parent.MountedUnit, w, "parent.MountedUnit");
  assertSame(w.MountedUnit, b, "wrapper.MountedUnit");
});

// 4) 父没挂 child 时不产生悬空挂载
check("MountedUnit：父没挂 child 时保持 null", () => {
  const parent = wrapper();
  parent.Add(leaf("a", 0, 1));
  const b = parent.Add(leaf("b", 2, 3));
  const w = wrapper();
  ShapeInsertUtil.InsertBetween(parent, b, w);
  assertSame(parent.MountedUnit, null, "parent.MountedUnit");
  assertSame(w.MountedUnit, null, "wrapper.MountedUnit");
});

// 5) SourceRange：sealRange 时 wrapper 继承 child 的范围，child 自己不重签
check("SourceRange：sealRange 继承 child 范围，child 不重签", () => {
  const parent = wrapper();
  parent.Add(leaf("a", 0, 1));
  const b = parent.Add(leaf("b", 2, 3));
  const w = wrapper();
  ShapeInsertUtil.InsertBetween(parent, b, w, true);
  assertSame(w.SourceRange.Start, 2, "wrapper.Start");
  assertSame(w.SourceRange.End, 3, "wrapper.End");
  assertSame(b.SourceRange.Start, 2, "child.Start 不变");
  assertSame(b.SourceRange.End, 3, "child.End 不变");
});

// 6) 未 seal 的 wrapper 只继承起点，终点留给自己关闭时签出
check("SourceRange：未 seal 只继承起点", () => {
  const parent = wrapper();
  parent.Add(leaf("a", 0, 1));
  const b = parent.Add(leaf("b", 2, 3));
  const w = wrapper();
  ShapeInsertUtil.InsertBetween(parent, b, w);
  assertSame(w.SourceRange.Start, 2, "wrapper.Start");
  assertSame(w.SourceRange.End, -1, "wrapper.End 未设置");
});

// 7) Pos / LastIndex 继承
check("Pos / LastIndex 继承", () => {
  const parent = wrapper();
  parent.Add(leaf("a", 0, 1));
  const b = parent.Add(leaf("b", 2, 3));
  b.Pos = 1;
  b.LastIndex = 2;
  const w = wrapper();
  ShapeInsertUtil.InsertBetween(parent, b, w);
  assertSame(w.Pos, 1, "wrapper.Pos");
  assertSame(w.LastIndex, 2, "wrapper.LastIndex");
});

// 8) 嵌套插入：第二次插到 wrapper 与 child 之间
check("嵌套插入：wrapper 套 wrapper", () => {
  const parent = wrapper();
  parent.Add(leaf("a", 0, 1));
  const b = parent.Add(leaf("b", 2, 3));
  const w1 = wrapper();
  ShapeInsertUtil.InsertBetween(parent, b, w1);
  const w2 = wrapper();
  ShapeInsertUtil.InsertBetween(w1, b, w2);
  assertSame(parent.Data.length, 2, "parent.Data 长度");
  assertSame(parent.Data[1], w1, "parent.Data[1]");
  assertSame(w1.Data[0], w2, "w1.Data[0]");
  assertSame(w2.Data[0], b, "w2.Data[0]");
  assertSame(b.Parent, w2, "child.Parent");
  assertSame(w2.Parent, w1, "w2.Parent");
});

// 9) 拒绝非法输入：child 不在 parent 里 / wrapper 已有父单元
check("拒绝非法输入", () => {
  const parent = wrapper();
  const b = parent.Add(leaf("b", 2, 3));
  const other = wrapper();
  const orphan = leaf("x", 8, 9);
  let threw = false;
  try {
    ShapeInsertUtil.InsertBetween(other, b, wrapper());
  } catch (error) {
    threw = true;
  }
  assert(threw, "child 不在 parent 里应抛错");
  const attached = wrapper();
  attached.Parent = parent;
  threw = false;
  try {
    ShapeInsertUtil.InsertBetween(parent, b, attached);
  } catch (error) {
    threw = true;
  }
  assert(threw, "wrapper 已有父单元应抛错");
  ShapeInsertUtil.InsertBetween(parent, b, wrapper());
  assert(orphan.Parent === null, "无关单元不受影响");
});

console.log(`[feas-operator] insert-between tests=${passed + failed} pass=${passed} fail=${failed}`);
if (failed > 0) {
  process.exitCode = 1;
}
