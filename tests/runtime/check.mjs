// 执行层的判据：值模型（`runtime/value.xl.md`）、堆（`runtime/heap.xl.md`）、
// 回收器（`runtime/gc.xl.md`）与程序表示（`runtime/ir.xl.md`）。
//
//   node tests/runtime/check.mjs
//
// 它与解析侧那些尺子的分工：那些量**树对不对**（Shape 与 TS 逐节点对拍），这一把量
// **地基对不对**——标签与载荷、句柄的合法边界、洞与显式 `undefined` 的区别、空闲链复用、
// **账本**（计费字节）、垃圾与活对象的边界，以及 **IR 的文本形态**（dump 是四个目标之间
// 差分的那把尺子，所以它逐字节钉在这里）。
//
// 全程只用库 API（`build/ts/runtime/*.js`），不开进程——所以它快到可以每步都跑。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);

// **先验「规范 → dist → build」这条链没有断。**
//
// 判据读的是 `build/**/*.js`，所以少跑一步就是在**量上一版的产物**——结论看着全绿、
// 其实与刚改的规范无关。这个坑连着栽过四次，所以两道闸门都做成**硬失败**：
//
//   - `runtime/*.xl.md` 比 `dist/ts/runtime/*.ts` 新 → 还没跑 `xl_build`
//     （消息里指名 `--force`：`xl_build` 说 `skipped` 时产物其实是对的，但**这里不猜**）；
//   - `dist/ts/runtime/*.ts` 比 `build/ts/runtime/*.js` 新 → 还没跑 `tsc`。
{
  const specDir = path.join(root, "runtime");
  const distDir = path.join(root, "dist", "ts", "runtime");
  const buildDir = path.join(root, "build", "ts", "runtime");
  const stale = [];
  if (fs.existsSync(distDir) && fs.existsSync(buildDir)) {
    for (const dir of ["runtime", "typescript-exec"]) {
      const specDir2 = path.join(root, dir);
      const distDir2 = path.join(root, "dist", "ts", dir);
      if (!fs.existsSync(specDir2) || !fs.existsSync(distDir2)) continue;
      for (const name of fs.readdirSync(specDir2).filter((n) => n.endsWith(".xl.md"))) {
        const spec = path.join(specDir2, name);
        const generated = path.join(distDir2, name.replace(/\.xl\.md$/, ".ts"));
        if (!fs.existsSync(generated)) {
          stale.push(`${dir}/${name} → 还没有产物，跑 xl_build --force`);
          continue;
        }
        if (fs.statSync(spec).mtimeMs > fs.statSync(generated).mtimeMs) {
          stale.push(`${dir}/${name} 比产物新 → 跑 xl_build --force`);
        }
      }
      for (const name of fs.readdirSync(distDir2).filter((n) => n.endsWith(".ts"))) {
        const built = path.join(root, "build", "ts", dir, name.replace(/\.ts$/, ".js"));
        if (!fs.existsSync(built) || fs.statSync(path.join(distDir2, name)).mtimeMs > fs.statSync(built).mtimeMs) {
          stale.push(`dist/ts/${dir}/${name} → 还没跑 npm run compile`);
        }
      }
    }
  }
  if (stale.length > 0) {
    console.log("产物不是最新的，先跑 xl_build --force（插件工具）与 npm run compile：");
    for (const line of stale) console.log(`  ${line}`);
    process.exit(1);
  }
}

const { Value, ValueTag } = require(path.join(root, "build", "ts", "runtime", "value.js"));
const heapMod = require(path.join(root, "build", "ts", "runtime", "heap.js"));
const { HeapTable, Property, PropertyKind, ObjectCharge, PropertyCharge, ValueCharge, CodeUnitCharge, HoleCharge, PromiseState } = heapMod;
const gcMod = require(path.join(root, "build", "ts", "runtime", "gc.js"));
const { Collector, RootSet, DefaultHeadroom, MinHeapLimit } = gcMod;
const irMod = require(path.join(root, "build", "ts", "runtime", "ir.js"));
const { Program, Instruction, Op, RtOp, RtOpName, Constant, SourceSpan, Handler, FunctionInfo, BuiltinBase } = irMod;
const { PadLeft, PadRight, PadZero, Hex4 } = irMod;
const verifyMod = require(path.join(root, "build", "ts", "runtime", "ir-verify.js"));
const { IdTable, Encode, Decode, Verify, Load, LoadIssue, LoadedProgram } = verifyMod;
const { IsKnownOp, WindowOk, FallsThrough, IssueVersion, IssueIdTable, IssueEmpty, IssueUnknownOp } = verifyMod;
const { IssueOperand, IssueTarget, IssueFallThrough, IssueHandler, IssueFunction, IssueConst } = verifyMod;
const vmMod = require(path.join(root, "build", "ts", "runtime", "vm.js"));
const { Vm, VmStatus } = vmMod;
const rtMod = require(path.join(root, "build", "ts", "runtime", "rt.js"));
const { RtAdd, RtCmpEqStrict, RtCmpEqLoose } = rtMod;
const propsMod = require(path.join(root, "build", "ts", "runtime", "props.js"));
const { InitProtos, NewPlainObject, NewPlainArray, GetProperty, SetProperty, DeleteProperty } = propsMod;
const hostMod = require(path.join(root, "build", "ts", "runtime", "host-abi.js"));
const { Host, HostResult, HostOutcome, Limits, Capability } = hostMod;
const loweringMod = require(path.join(root, "build", "ts", "typescript-exec", "lowering.js"));
const { Lowering, LoweredModule } = loweringMod;
const arrayBuiltins = require(path.join(root, "build", "ts", "typescript-exec", "builtins", "array.js"));
const { InstallArray, InvokeArray } = arrayBuiltins;
const installBuiltins = require(path.join(root, "build", "ts", "typescript-exec", "builtins", "install.js"));
const { InstallBuiltins, InvokeBuiltin, InvokeWithSink } = installBuiltins;
const globalsBuiltins = require(path.join(root, "build", "ts", "typescript-exec", "builtins", "globals.js"));
const { GlobalNames, BuildGlobals } = globalsBuiltins;
const bindingsMod = require(path.join(root, "build", "ts", "typescript-exec", "bindings.js"));
const { Bindings, LookupOf } = bindingsMod;
const { HasProperty, GetIndex, SetIndex, TypeOfName } = propsMod;

/** TypeScript 的数字枚举有反向映射，所以成员名 = 不是数字的那些键。 */
function enumMembers(enumObject) {
  return Object.keys(enumObject).filter((key) => Number.isNaN(Number(key))).length;
}

let failed = 0;
let passed = 0;

function check(name, body) {
  try {
    body();
    passed++;
    console.log(`ok       ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL     ${name}: ${error.message}`);
  }
}

function eq(actual, expected, what) {
  if (actual !== expected) {
    throw new Error(`${what}: 期望 ${describeValue(expected)}，实际 ${describeValue(actual)}`);
  }
}

/** 失败了要说清楚是什么——验证问题对象直接 `String()` 是 `[object Object]`，等于没说。 */
function describeValue(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object" && typeof value.Message === "string") {
    return `验证问题(code=${value.Code}, pc=${value.Pc})：${value.Message}`;
  }
  return String(value);
}

function ok(condition, what) {
  if (!condition) throw new Error(what);
}

/** 造一段码元序列（只取 ASCII，测试里好读）。 */
function units(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i));
  return out;
}

console.log("=== 值模型：标签与载荷 ===");

check("默认构造是 undefined，且不碰别的载荷", () => {
  const v = new Value();
  eq(v.Tag, ValueTag.Undefined, "Tag");
  eq(v.IsUndefined(), true, "IsUndefined");
  eq(v.IsNullish(), true, "IsNullish");
  eq(v.IsRef(), false, "IsRef");
});

check("null 与 undefined 是两档", () => {
  const n = Value.Null();
  eq(n.IsNull(), true, "IsNull");
  eq(n.IsUndefined(), false, "IsUndefined");
  eq(n.IsNullish(), true, "IsNullish");
});

check("AsBool 是 JS 的 ToBoolean（含 NaN 与 -0）", () => {
  eq(Value.FromBool(false).AsBool(), false, "false");
  eq(Value.FromBool(true).AsBool(), true, "true");
  eq(Value.FromInt(0).AsBool(), false, "0");
  eq(Value.FromInt(-0).AsBool(), false, "-0");
  eq(Value.FromInt(-1).AsBool(), true, "-1");
  eq(Value.FromDouble(0).AsBool(), false, "0.0");
  eq(Value.FromDouble(0.5).AsBool(), true, "0.5");
  eq(Value.FromDouble(NaN).AsBool(), false, "NaN");
  eq(Value.FromDouble(Infinity).AsBool(), true, "Infinity");
  eq(Value.FromDouble(-Infinity).AsBool(), true, "-Infinity");
  eq(Value.Undefined().AsBool(), false, "undefined");
  eq(Value.Null().AsBool(), false, "null");
});

check("AsInt 只认 Bool 与 Int32", () => {
  eq(Value.FromBool(true).AsInt(), 1, "true");
  eq(Value.FromBool(false).AsInt(), 0, "false");
  eq(Value.FromInt(-7).AsInt(), -7, "int32");
  eq(Value.FromDouble(3.5).AsInt(), 0, "float64 不是整数载荷");
  eq(Value.Null().AsInt(), 0, "null");
});

check("AsDouble 把 Int32 提升成 f64", () => {
  eq(Value.FromInt(5).AsDouble(), 5, "int32");
  eq(Value.FromDouble(2.5).AsDouble(), 2.5, "float64");
  eq(Value.Undefined().AsDouble(), 0, "undefined");
});

check("Clone 四个载荷一起抄（只抄 Tag 会在目标间换掉载荷）", () => {
  const v = new Value();
  v.Tag = ValueTag.Bool;
  v.Int = 1;
  v.Dbl = 42.5;
  v.Ref = 99;
  const copy = v.Clone();
  eq(copy.Tag, ValueTag.Bool, "Tag");
  eq(copy.Int, 1, "Int");
  eq(copy.Dbl, 42.5, "Dbl");
  eq(copy.Ref, 99, "Ref");
});

check("七档引用型与三个分类判据", () => {
  const refs = [ValueTag.String, ValueTag.Symbol, ValueTag.Object, ValueTag.Array, ValueTag.Function, ValueTag.Closure, ValueTag.HostRef];
  for (const tag of refs) eq(Value.FromRef(tag, 1).IsRef(), true, `IsRef(${tag})`);
  eq(Value.FromRef(ValueTag.Symbol, 1).IsObject(), false, "符号不是对象");
  eq(Value.FromRef(ValueTag.String, 1).IsObject(), false, "字符串不是对象");
  eq(Value.FromRef(ValueTag.HostRef, 1).IsObject(), false, "宿主句柄不是对象");
  eq(Value.FromRef(ValueTag.Array, 1).IsObject(), true, "数组是对象");
  eq(Value.FromRef(ValueTag.Closure, 1).IsCallable(), true, "闭包可调用");
  eq(Value.FromRef(ValueTag.Function, 1).IsCallable(), true, "函数可调用");
  eq(Value.FromRef(ValueTag.Object, 1).IsCallable(), false, "普通对象不可调用");
  eq(Value.FromRef(ValueTag.Symbol, 1).IsSymbol(), true, "IsSymbol");
  eq(Value.FromRef(ValueTag.Symbol, 1).IsNumber(), false, "符号不是数值");
});

check("TagName 覆盖全部标签（dump 与报错要靠它）", () => {
  const names = new Map([
    [ValueTag.Undefined, "undefined"], [ValueTag.Null, "null"], [ValueTag.Bool, "bool"],
    [ValueTag.Int32, "int32"], [ValueTag.Float64, "float64"], [ValueTag.String, "string"],
    [ValueTag.Object, "object"], [ValueTag.Array, "array"], [ValueTag.Function, "function"],
    [ValueTag.Closure, "closure"], [ValueTag.HostRef, "hostref"], [ValueTag.Symbol, "symbol"],
  ]);
  for (const [tag, name] of names) eq(Value.FromRef(tag, 0).TagName(), name, `TagName(${tag})`);
});

console.log("");
console.log("=== 堆：句柄的边界 ===");

check("新表只有哨兵，句柄 0 永远不合法", () => {
  const table = new HeapTable();
  eq(table.Capacity(), 1, "容量（只有哨兵）");
  eq(table.LiveCount, 0, "活对象数");
  eq(table.Charged, 0, "已计费");
  eq(table.IsValid(0), false, "哨兵");
  eq(table.IsValid(-1), false, "负数");
  eq(table.IsValid(1), false, "越界");
  let threw = false;
  try { table.Get(0); } catch { threw = true; }
  eq(threw, true, "取哨兵要抛");
});

check("创建工厂给出正确的标签与载荷", () => {
  const table = new HeapTable();
  const s = table.CreateString(units("ab"));
  const y = table.CreateSymbol(7, 0);
  const o = table.CreateObject();
  const a = table.CreateArray();
  const c = table.CreateClosure(3, 0, 2, 0);
  const f = table.CreateFunction(5, 1, 0);
  const h = table.CreateHostRef(9, 11);
  eq(table.Get(s).Tag, ValueTag.String, "字符串");
  eq(table.Get(y).Tag, ValueTag.Symbol, "符号");
  eq(table.Get(o).Tag, ValueTag.Object, "对象");
  eq(table.Get(a).Tag, ValueTag.Array, "数组");
  eq(table.Get(c).Tag, ValueTag.Closure, "闭包");
  eq(table.Get(f).Tag, ValueTag.Function, "函数");
  eq(table.Get(h).Tag, ValueTag.HostRef, "宿主句柄");
  eq(table.LiveCount, 7, "活对象数");
  eq(table.Get(c).AsClosure().Arity, 2, "闭包形参个数");
  eq(table.Get(f).AsFunction().HostId, 5, "函数目标号");
  eq(table.Get(h).AsHost().Opaque, 11, "宿主不透明载荷");
  eq(table.Get(y).AsSymbol().Id, 7, "符号身份");
});

check("取错载荷要抛（内部不变式被破坏 = 引擎的 bug）", () => {
  const table = new HeapTable();
  const o = table.CreateObject();
  for (const call of ["AsString", "AsSymbol", "AsArray", "AsClosure", "AsFunction", "AsHost"]) {
    let threw = false;
    try { table.Get(o)[call](); } catch { threw = true; }
    eq(threw, true, `${call} 对普通对象要抛`);
  }
});

console.log("");
console.log("=== 堆：字符串按内容、符号按身份 ===");

check("字符串按内容比，哈希只看内容", () => {
  const table = new HeapTable();
  const a = table.Get(table.CreateString(units("hello"))).AsString();
  const b = table.Get(table.CreateString(units("hello"))).AsString();
  const c = table.Get(table.CreateString(units("hellp"))).AsString();
  eq(a.Equals(b), true, "内容相同");
  eq(a.Equals(c), false, "内容不同");
  eq(a.Hash(), b.Hash(), "哈希相同");
  ok(a.Hash() !== c.Hash(), "不同内容的哈希撞了（换模或换基数）");
  eq(a.GetLength(), 5, "长度按码元数");
  eq(a.CodeAt(0), 104, "码元");
});

check("符号身份由 Id 决定，不看描述", () => {
  const table = new HeapTable();
  const d = table.CreateString(units("same"));
  const x = table.Get(table.CreateSymbol(1, d)).AsSymbol();
  const y = table.Get(table.CreateSymbol(2, d)).AsSymbol();
  eq(x.Id === y.Id, false, "两个符号的 Id 不同");
  eq(x.Description === y.Description, true, "描述可以相同");
});

console.log("");
console.log("=== 堆：数组的洞 ===");

check("越界与洞都读成 undefined", () => {
  const table = new HeapTable();
  const arr = table.Get(table.CreateArray()).AsArray();
  eq(arr.GetLength(), 0, "初始长度");
  eq(arr.GetAt(0).IsUndefined(), true, "空数组读第 0 格");
  eq(arr.GetAt(-1).IsUndefined(), true, "负下标");
  eq(arr.IsHole(0), false, "没有洞标记");
});

check("SetAt 超长要补洞（a[3] = 1 让长度变 4，前 3 格是洞）", () => {
  const table = new HeapTable();
  const arr = table.Get(table.CreateArray()).AsArray();
  arr.SetAt(3, Value.FromInt(9));
  eq(arr.GetLength(), 4, "长度");
  eq(arr.IsHole(0), true, "第 0 格是洞");
  eq(arr.IsHole(2), true, "第 2 格是洞");
  eq(arr.IsHole(3), false, "第 3 格是值");
  eq(arr.GetAt(3).AsInt(), 9, "值");
  eq(arr.GetAt(0).IsUndefined(), true, "洞读成 undefined");
});

check("洞与显式 undefined 可分辨（0 in a 与 a[0] === undefined）", () => {
  const table = new HeapTable();
  const arr = table.Get(table.CreateArray()).AsArray();
  arr.Push(Value.Undefined());
  eq(arr.IsHole(0), false, "显式的 undefined 不是洞");
  eq(arr.GetAt(0).IsUndefined(), true, "但它读出来也是 undefined");
  arr.SetHole(0);
  eq(arr.IsHole(0), true, "SetHole 之后才是洞");
  eq(arr.GetAt(0).IsUndefined(), true, "读出来仍然 undefined");
  eq(arr.GetLength(), 1, "delete 不缩长度");
});

check("Push 在全密数组上不引入洞", () => {
  const table = new HeapTable();
  const arr = table.Get(table.CreateArray()).AsArray();
  arr.Push(Value.FromInt(1));
  arr.Push(Value.FromInt(2));
  eq(arr.GetLength(), 2, "长度");
  eq(arr.IsHole(0), false, "第 0 格");
  eq(arr.IsHole(1), false, "第 1 格");
});

console.log("");
console.log("=== 堆：回收与空闲链 ===");

check("Retire 之后句柄不合法，活对象数下降", () => {
  const table = new HeapTable();
  const o = table.CreateObject();
  eq(table.IsValid(o), true, "活着");
  table.Retire(o);
  eq(table.IsValid(o), false, "回收后");
  eq(table.LiveCount, 0, "活对象数");
  eq(table.Objects[o].Tag, ValueTag.Undefined, "空格标签");
  eq(table.Objects[o].Props.length, 0, "空格属性表");
});

check("空闲链是后进先出（最近回收的先复用）", () => {
  const table = new HeapTable();
  const a = table.CreateObject();
  const b = table.CreateObject();
  table.Retire(a);
  table.Retire(b);
  eq(table.CreateObject(), b, "先拿 b");
  eq(table.CreateObject(), a, "再拿 a");
});

check("重复 Retire 与非法句柄都静默（清扫阶段会扫过空格）", () => {
  const table = new HeapTable();
  const o = table.CreateObject();
  table.Retire(o);
  table.Retire(o);
  table.Retire(0);
  table.Retire(-1);
  table.Retire(999);
  eq(table.LiveCount, 0, "活对象数");
  eq(table.Charged, 0, "账回到 0");
  eq(table.FreeList.length, 1, "空闲链里只有一格");
});

console.log("");
console.log("=== 堆：账本（计费字节）===");

check("分配即结账：一个字符串的账是 ObjectCharge + 码元数 × CodeUnitCharge", () => {
  const table = new HeapTable();
  table.CreateString(units("abc"));
  eq(table.Charged, ObjectCharge + 3 * CodeUnitCharge, "字符串的账");
});

check("对象 + 属性的账逐项相加", () => {
  const table = new HeapTable();
  const o = table.CreateObject();
  const key = table.CreateString(units("k"));
  table.Get(o).Props.push(new Property(key, Value.FromInt(1)));
  table.Recount(o);
  eq(table.Charged, (ObjectCharge + 1 * CodeUnitCharge) + (ObjectCharge + PropertyCharge), "两格的账");
});

check("全部退回后账归零（分配与回收对称）", () => {
  const table = new HeapTable();
  const handles = [];
  for (let i = 0; i < 50; i++) handles.push(table.CreateString(units("ab")));
  ok(table.Charged > 0, "分配之后账为正");
  const peak = table.Charged;
  for (const handle of handles) table.Retire(handle);
  eq(table.Charged, 0, "回收之后账为 0");
  ok(peak > 0, "峰值");
});

check("两次回收之间会少记：改载荷不结账，RecountAll 修回来", () => {
  const table = new HeapTable();
  const arr = table.CreateArray();
  const before = table.Charged;
  const heapArray = table.Get(arr).AsArray();
  for (let i = 0; i < 10; i++) heapArray.Push(Value.FromInt(i));
  eq(table.Charged, before, "push 不结账（这是约定的少记）");
  table.RecountAll();
  eq(table.Charged, before + 10 * ValueCharge, "全量重算补上 10 个元素的账");
});

check("稀疏数组按实际长度记洞的账（规范口径，不是测量值）", () => {
  const table = new HeapTable();
  const arr = table.CreateArray();
  const before = table.Charged;
  table.Get(arr).AsArray().SetAt(4, Value.FromInt(1));
  table.RecountAll();
  eq(table.Charged, before + 5 * ValueCharge + 5 * HoleCharge, "5 格元素 + 5 个洞");
});

check("增量记账与全量重算必须一致（账本的判据）", () => {
  const table = new HeapTable();
  const o = table.CreateObject();
  table.CreateString(units("xyz"));
  table.CreateArray();
  const keep = table.CreateFunction(1, 0, 0);
  table.Get(o).Props.push(new Property(keep, Value.FromInt(1)));
  table.Recount(o);
  const incremental = table.Charged;
  table.RecountAll();
  eq(table.Charged, incremental, "增量账与全量账");
});

console.log("");
console.log("=== 堆：属性 ===");

check("数据属性默认三个标志全开", () => {
  const key = new Value();
  const property = new Property(1, key);
  eq(property.Kind, PropertyKind.Data, "种类");
  eq(property.Flags, 7, "标志");
  eq(property.IsEnumerable(), true, "可枚举");
  eq(property.IsAccessor(), false, "不是访问器");
});

check("访问器属性的值无意义，getter / setter 有效", () => {
  const property = Property.Accessor(2, Value.FromRef(ValueTag.Closure, 5), Value.FromRef(ValueTag.Closure, 6));
  eq(property.IsAccessor(), true, "是访问器");
  eq(property.Getter.Ref, 5, "getter");
  eq(property.Setter.Ref, 6, "setter");
});

check("属性 Clone 抄五个载荷（含标志）", () => {
  const property = Property.Accessor(3, Value.FromInt(1), Value.FromInt(2));
  property.Flags = 3;
  const copy = property.Clone();
  eq(copy.Key, 3, "键");
  eq(copy.Kind, PropertyKind.Accessor, "种类");
  eq(copy.Getter.AsInt(), 1, "getter");
  eq(copy.Setter.AsInt(), 2, "setter");
  eq(copy.Flags, 3, "标志");
});

check("Clear 之后这一格完全干净（回收之后不能再指向别的对象）", () => {
  const table = new HeapTable();
  const s = table.CreateString(units("gone"));
  const item = table.Get(s);
  item.Proto = 3;
  item.Mark = true;
  item.Clear();
  eq(item.Tag, ValueTag.Undefined, "标签");
  eq(item.Proto, 0, "原型");
  eq(item.Mark, false, "标记位");
  eq(item.ChargedBytes, 0, "上次记账");
  eq(item.Str, null, "字符串载荷");
});

console.log("");
console.log("=== 回收器：垃圾与活对象 ===");

/** 造一个字符串键。 */
function key(table, text) {
  return table.CreateString(units(text));
}

check("哨兵永不被回收（空堆收 0 格，高水位不动）", () => {
  const table = new HeapTable();
  const gc = new Collector(table, 1 << 20);
  eq(gc.Collect(new RootSet()), 0, "空堆");
  eq(table.Capacity(), 1, "高水位");
  eq(table.LiveCount, 0, "活对象数");
});

check("无环垃圾：没有根就全收，账回 0", () => {
  const table = new HeapTable();
  const gc = new Collector(table, 1 << 20);
  for (let i = 0; i < 20; i++) table.CreateObject();
  const freed = gc.Collect(new RootSet());
  eq(freed, 20, "收掉的格数");
  eq(table.LiveCount, 0, "活对象数");
  eq(table.Charged, 0, "账");
  eq(gc.Cycles, 1, "回收轮数");
});

check("有环垃圾也收得掉（这就是精确 mark-sweep 相对引用计数的存在理由）", () => {
  const table = new HeapTable();
  const gc = new Collector(table, 1 << 20);
  const a = table.CreateObject();
  const b = table.CreateObject();
  const keyA = key(table, "b");
  const keyB = key(table, "a");
  table.Get(a).Props.push(new Property(keyB, Value.FromRef(ValueTag.Object, b)));
  table.Get(b).Props.push(new Property(keyA, Value.FromRef(ValueTag.Object, a)));
  eq(gc.Collect(new RootSet()), 4, "两格对象 + 两个键串");
  eq(table.LiveCount, 0, "环被整个收掉");
});

check("活对象必须活下来：七条可达路径逐条钉", () => {
  const table = new HeapTable();
  const gc = new Collector(table, 1 << 20);
  const roots = new RootSet();

  const direct = table.CreateObject();
  roots.AddValue(Value.FromRef(ValueTag.Object, direct));

  const holder = table.CreateObject();
  const propKey = key(table, "p");
  const viaProp = table.CreateObject();
  table.Get(holder).Props.push(new Property(propKey, Value.FromRef(ValueTag.Object, viaProp)));
  roots.AddValue(Value.FromRef(ValueTag.Object, holder));

  const arrHolder = table.CreateObject();
  const arr = table.CreateArray();
  const inArray = table.CreateObject();
  table.Get(arr).AsArray().Push(Value.FromRef(ValueTag.Object, inArray));
  table.Get(arrHolder).Props.push(new Property(key(table, "a"), Value.FromRef(ValueTag.Array, arr)));
  roots.AddValue(Value.FromRef(ValueTag.Object, arrHolder));

  const proto = table.CreateObject();
  const child = table.CreateObject();
  table.Get(child).Proto = proto;
  roots.AddValue(Value.FromRef(ValueTag.Object, child));

  const envObj = table.CreateObject();
  const closureName = key(table, "n");
  const closure = table.CreateClosure(0, envObj, 0, closureName);
  roots.AddValue(Value.FromRef(ValueTag.Closure, closure));

  const description = key(table, "s");
  const symbol = table.CreateSymbol(1, description);
  roots.AddValue(Value.FromRef(ValueTag.Symbol, symbol));

  const before = table.LiveCount;
  eq(gc.Collect(roots), 0, "一格都不该收");
  const survivors = [direct, holder, propKey, viaProp, arrHolder, arr, inArray, proto, child, envObj, closureName, closure, description, symbol];
  for (const handle of survivors) eq(table.IsValid(handle), true, `句柄 ${handle} 应活着`);
  eq(table.LiveCount, before, "活对象数不变");
});

check("连着回收两轮，活对象还在（一位标记位必须被清干净）", () => {
  const table = new HeapTable();
  const gc = new Collector(table, 1 << 20);
  const roots = new RootSet();
  const live = table.CreateObject();
  roots.AddValue(Value.FromRef(ValueTag.Object, live));
  gc.Collect(roots);
  eq(table.IsValid(live), true, "第一轮之后");
  gc.Collect(roots);
  eq(table.IsValid(live), true, "第二轮之后");
  eq(table.LiveCount, 1, "活对象数");
  eq(table.Get(live).Mark, false, "标记位回到 false");
});

console.log("");
console.log("=== 回收器：根集的边界 ===");

check("根里的 0 句柄是「没有」，跳过不崩", () => {
  const table = new HeapTable();
  const gc = new Collector(table, 1 << 20);
  const roots = new RootSet();
  roots.AddHandle(0);
  roots.AddHandle(-1);
  roots.AddValue(Value.FromRef(ValueTag.Object, 0));
  roots.AddValue(Value.Undefined());
  roots.AddValue(Value.FromInt(7));
  eq(roots.Count(), 5, "根数");
  eq(gc.Collect(roots), 0, "没有垃圾可收");
});

check("根里有过期句柄要抛（它只能来自 bug，不能悄悄放过）", () => {
  const table = new HeapTable();
  const gc = new Collector(table, 1 << 20);
  const dead = table.CreateObject();
  table.Retire(dead);

  const pointedAtFree = new RootSet();
  pointedAtFree.AddHandle(dead);
  let threw = false;
  try { gc.Collect(pointedAtFree); } catch { threw = true; }
  eq(threw, true, "指向空格的根");

  const outOfRange = new RootSet();
  outOfRange.AddHandle(table.Capacity() + 5);
  let threw2 = false;
  try { gc.Collect(outOfRange); } catch { threw2 = true; }
  eq(threw2, true, "越界的根");
});

console.log("");
console.log("=== 回收器：阈值与上限 ===");

check("回收之后：LiveBytes 是重算过的账，阈值按存活量重设", () => {
  const table = new HeapTable();
  const gc = new Collector(table, 8 << 20);
  const roots = new RootSet();
  const live = table.CreateString(units("abc"));
  roots.AddValue(Value.FromString(live));
  const garbage = table.CreateString(units("defg"));
  gc.Collect(roots);
  eq(gc.LiveBytes, table.Charged, "LiveBytes 与账一致");
  eq(table.Charged, ObjectCharge + 3 * CodeUnitCharge, "只剩活的那一串");
  eq(table.IsValid(garbage), false, "垃圾被收");
  eq(gc.NextThreshold, table.Charged + DefaultHeadroom, "阈值 = 存活 + 余量");
});

check("上限闸门：活对象填满时挡住，而不是无限回收", () => {
  const table = new HeapTable();
  const gc = new Collector(table, MinHeapLimit);
  const roots = new RootSet();
  let blocked = false;
  for (let i = 0; i < 4000; i++) {
    if (!gc.BeforeAllocate(roots, ObjectCharge)) {
      blocked = true;
      break;
    }
    const handle = table.CreateObject();
    roots.AddValue(Value.FromRef(ValueTag.Object, handle));
  }
  eq(blocked, true, "活对象填满时要挡住");
  ok(gc.Cycles > 0, "挡住之前至少回收过一次");
  ok(table.Charged <= gc.HeapLimit, "挡住时账在上限以内");

  const cyclesBefore = gc.Cycles;
  roots.Clear();
  eq(gc.BeforeAllocate(roots, ObjectCharge), true, "垃圾一丢就放行");
  eq(table.Charged, 0, "重算之后账回 0");
  ok(gc.Cycles > cyclesBefore, "又收了一轮");
});

check("上限不会低于最小值（配置成必然立刻 OOM 的上限是 bug，不是配置）", () => {
  const table = new HeapTable();
  const gc = new Collector(table, 16);
  eq(gc.HeapLimit, MinHeapLimit, "抬到最小值");
});

console.log("");
console.log("=== IR：算子表与编号（跨目标的握手）===");

check("编号只追加：成员顺序就是跨目标的约定", () => {
  eq(enumMembers(Op), 22, "指令条数");
  eq(Op.Halt, 0, "第一条");
  eq(Op.Const, 1, "第二条");
  eq(Op.Resume, 18, "生成器用的那两条之前");
  eq(Op.LoadThis, 19, "读 this 的那条");
  eq(Op.Await, 20, "承诺那条");
  eq(Op.Caught, 21, "这一轮追加的那条");
  eq(enumMembers(RtOp), 37, "通用算子条数");
  eq(RtOp.Add, 0, "第一个算子");
  eq(RtOp.HostCall, 36, "最后一个通用算子");
  ok(enumMembers(RtOp) <= BuiltinBase, "内建段必须留在通用算子之后");
});

check("每个 id 都有名字（加了成员忘了加名字要被抓住）", () => {
  for (let id = 0; id < enumMembers(Op); id++) {
    const name = new Instruction(id, -1, -1, -1, -1).OpName();
    ok(name !== "unknown", `指令 ${id} 没有名字`);
  }
  for (let id = 0; id < enumMembers(RtOp); id++) {
    eq(RtOpName(id) !== "unknown", true, `算子 ${id} 没有名字`);
  }
  eq(RtOpName(BuiltinBase), "unknown", "内建段不在这张名表里");
});

console.log("");
console.log("=== IR：文本形态（判据的一部分）===");

/** 一个钉死的小程序：常量 + 跳转落点 + 两种补注 + 两段源码区间。 */
function sampleProgram() {
  const program = new Program();
  const seven = program.AddConst(Constant.OfInt(7));
  const spanConst = program.AddSpan(new SourceSpan(0, 1));
  const spanAdd = program.AddSpan(new SourceSpan(4, 9));
  const at0 = program.Emit(new Instruction(Op.Const, 0, seven, -1, -1));
  program.Instrs[at0].Src = spanConst;
  const at1 = program.Emit(new Instruction(Op.RtCall, RtOp.Add, 1, 0, 2));
  program.Instrs[at1].Src = spanAdd;
  program.Emit(new Instruction(Op.JumpIfFalse, 1, 0, -1, -1));
  program.Emit(Instruction.Simple(Op.Halt));
  return program;
}

check("dump 逐字节（形态钉死，四个目标的 dump 必须一样）", () => {
  const expected = [
    "program version=1 consts=1 instrs=4 functions=0 handlers=0 spans=2",
    "0000>  const           0, 0, -1, -1  ; #0 = 7  [0-1]",
    "0001   rt_call         0, 1, 0, 2  ; add  [4-9]",
    "0002   jump_if_false   1, 0, -1, -1",
    "0003   halt            -1, -1, -1, -1",
    "",
  ].join("\n");
  const actual = sampleProgram().Dump();
  if (actual !== expected) {
    throw new Error(`dump 不一致\n期望: ${JSON.stringify(expected)}\n实际: ${JSON.stringify(actual)}`);
  }
});

check("跳转落点的 > 在固定列（第 5 列，grep 得到）", () => {
  const lines = sampleProgram().Dump().split("\n");
  eq(lines[1].charAt(4), ">", "PC 0 是落点");
  eq(lines[2].charAt(4), " ", "PC 1 不是落点");
  eq(lines[3].charAt(4), " ", "PC 2 不是落点");
  eq(lines[4].charAt(4), " ", "PC 3 不是落点");
});

check("常量按档描述：字符串走码元十六进制", () => {
  eq(Constant.OfInt(-3).Describe(), "-3", "整数");
  eq(Constant.OfBool(true).Describe(), "true", "布尔");
  eq(Constant.OfString(units("abc")).Describe(), "0061 0062 0063", "字符串");
  eq(new Constant().Describe(), "undefined", "默认档");
});

check("常量落进堆，句柄稳定可复用", () => {
  const table = new HeapTable();
  const text = Constant.OfString(units("hi"));
  const first = text.Materialize(table);
  eq(first.Tag, ValueTag.String, "标签");
  eq(table.IsValid(first.Ref), true, "句柄合法");
  eq(table.Get(first.Ref).AsString().GetLength(), 2, "码元数");
  eq(Constant.OfInt(5).Materialize(table).AsInt(), 5, "整数");
  eq(Constant.OfBool(false).Materialize(table).AsBool(), false, "布尔");
  eq(new Constant().Materialize(table).IsUndefined(), true, "默认档");
});

console.log("");
console.log("=== IR：程序表 ===");

check("At 越界要抛", () => {
  const program = sampleProgram();
  eq(program.Count(), 4, "指令条数");
  let threw = false;
  try { program.At(4); } catch { threw = true; }
  eq(threw, true, "越界");
});

check("JumpTargets 含异常表的处理点", () => {
  const program = sampleProgram();
  eq(program.JumpTargets().length, 1, "只有一处跳转");
  eq(program.IsJumpTarget(0), true, "PC 0");
  program.AddHandler(new Handler(0, 3, 2, 0));
  eq(program.JumpTargets().length, 2, "异常表也贡献落点");
  eq(program.IsJumpTarget(2), true, "处理点");
});

check("函数表记着帧布局（槽数在装载时定死）", () => {
  const info = new FunctionInfo(0, 6, 2);
  eq(info.Entry, 0, "入口");
  eq(info.SlotCount, 6, "槽数");
  eq(info.ParamCount, 2, "形参");
  eq(info.Name, -1, "默认匿名");
  eq(info.IsGenerator, false, "默认不是生成器");
});

check("三个格式化助手（不调库，四个目标同一份）", () => {
  eq(PadLeft("7", 4), "   7", "左补空格");
  eq(PadRight("ab", 4), "ab  ", "右补空格");
  eq(PadRight("abcdef", 3), "abcdef", "超过宽度不动");
  eq(PadZero(7, 4), "0007", "左补零");
  eq(PadZero(12345, 4), "12345", "超过宽度不动");
  eq(Hex4(0), "0000", "零");
  eq(Hex4(255), "00FF", "两位");
  eq(Hex4(4660), "1234", "四位");
  eq(Hex4(-1), "0000", "负数夹到零");
});

console.log("");
console.log("=== 装载验证：线形态（定宽小端）===");

/** 判据用的算子表：通用段 = 全表，内建段 = 1 条。 */
const testIds = new IdTable(RtOp.HostCall + 1, 8);

/** 一份**合法**的小程序：一个函数、四个槽、一份常量、一条方法调用、一条算子调用。 */
function validProgram() {
  const program = new Program();
  const seven = program.AddConst(Constant.OfInt(7));
  const name = program.AddConst(Constant.OfString(units("slice")));
  const span = program.AddSpan(new SourceSpan(0, 1));
  const info = new FunctionInfo(0, 4, 1);
  info.Name = name;
  program.Functions.push(info);
  const at0 = program.Emit(new Instruction(Op.Const, 0, seven, -1, -1));
  program.Instrs[at0].Src = span;
  program.Emit(new Instruction(Op.JumpIfFalse, 0, 3, -1, -1));
  program.Emit(new Instruction(Op.CallMethod, 1, name, 1, 1));
  program.Emit(new Instruction(Op.RtCall, RtOp.Add, 2, 1, 2));
  program.Emit(new Instruction(Op.Return, 2, -1, -1, -1));
  program.IdTableHash = testIds.Hash;
  return program;
}

function issueOf(program) {
  return Verify(program, testIds);
}

check("往返：编码 → 解码 → dump 逐字节相同", () => {
  const program = validProgram();
  const bytes = Encode(program, testIds);
  ok(bytes !== null, "编码应当成功");
  const back = Decode(bytes, testIds);
  ok(back !== null, "解码应当成功");
  eq(back.Dump(), program.Dump(), "往返之后 dump 必须一样");
});

check("magic 不对 / 截断 / 多出字节，三种都拒", () => {
  const bytes = Encode(validProgram(), testIds);
  const badMagic = bytes.slice();
  badMagic[0] = 0;
  eq(Decode(badMagic, testIds), null, "magic 被改");
  eq(Decode(bytes.slice(0, bytes.length - 1), testIds), null, "少一个字节");
  const extra = bytes.slice();
  extra.push(0);
  eq(Decode(extra, testIds), null, "多一个字节");
  eq(Decode([], testIds), null, "空字节");
});

check("线头的算子表不匹配 → 拒（握手凭据）", () => {
  const bytes = Encode(validProgram(), testIds);
  eq(Decode(bytes, new IdTable(RtOp.HostCall + 1, 2)), null, "内建段条数不同");
  eq(Decode(bytes, new IdTable(RtOp.HostCall, 1)), null, "通用段条数不同");
});

check("编码侧拒浮点常量（线形态不承载 f64 位模式）", () => {
  const program = validProgram();
  program.AddConst(Constant.OfDouble(1.5));
  eq(Encode(program, testIds), null, "有 f64 就编不出来");
});

check("坏字节走 LoadIssue 要给出问题，不是静默", () => {
  const bytes = Encode(validProgram(), testIds);
  const bad = bytes.slice();
  bad[0] = 9;
  ok(LoadIssue(bad, testIds) !== null, "坏字节");
  eq(LoadIssue(bytes, testIds), null, "好字节没有话要说");
});

console.log("");
console.log("=== 装载验证：语义（每一类畸形都要被拒）===");

check("版本与算子表指纹", () => {
  const wrongVersion = validProgram();
  wrongVersion.Version = 99;
  const first = issueOf(wrongVersion);
  ok(first !== null && first.Code === IssueVersion, "版本");

  const wrongHash = validProgram();
  wrongHash.IdTableHash = wrongHash.IdTableHash + 1;
  const second = issueOf(wrongHash);
  ok(second !== null && second.Code === IssueIdTable, "指纹");
});

check("空程序 / 空函数表", () => {
  const empty = new Program();
  empty.IdTableHash = testIds.Hash;
  const first = issueOf(empty);
  ok(first !== null && first.Code === IssueEmpty, "没有指令");

  const noFunction = new Program();
  noFunction.IdTableHash = testIds.Hash;
  noFunction.Emit(Instruction.Simple(Op.Halt));
  const second = issueOf(noFunction);
  ok(second !== null && second.Code === IssueFunction, "没有函数");
});

check("指令码不在表内", () => {
  const program = validProgram();
  program.Instrs[0] = new Instruction(Op.Resume + 5, 0, 0, -1, -1);
  const issue = issueOf(program);
  ok(issue !== null && issue.Code === IssueUnknownOp && issue.Pc === 0, "未知指令码带 PC");
});

check("无操作数的指令带了操作数", () => {
  eq(issueOf(validProgram()), null, "先确认原样合法");
  const dirty = validProgram();
  dirty.Instrs[4] = new Instruction(Op.Halt, 1, -1, -1, -1);
  const issue = issueOf(dirty);
  ok(issue !== null && issue.Code === IssueOperand, "halt 不该带操作数");
  const clean = validProgram();
  clean.Instrs[4] = Instruction.Simple(Op.Halt);
  eq(issueOf(clean), null, "不带操作数的 halt 合法");
});

check("跳转目标不是指令", () => {
  const program = validProgram();
  program.Instrs[1] = new Instruction(Op.JumpIfFalse, 0, 99, -1, -1);
  const issue = issueOf(program);
  ok(issue !== null && issue.Code === IssueTarget && issue.Pc === 1, "越界目标");
});

check("槽号越界 / 常量越界 / 参数窗口越界", () => {
  const badSlot = validProgram();
  badSlot.Instrs[4] = new Instruction(Op.Return, 99, -1, -1, -1);
  const first = issueOf(badSlot);
  ok(first !== null && first.Code === IssueOperand, "槽号");

  const badConst = validProgram();
  badConst.Instrs[0] = new Instruction(Op.Const, 0, 99, -1, -1);
  const second = issueOf(badConst);
  ok(second !== null && second.Code === IssueOperand, "常量下标");

  const badWindow = validProgram();
  badWindow.Instrs[3] = new Instruction(Op.RtCall, RtOp.Add, 2, 3, 2);
  const third = issueOf(badWindow);
  ok(third !== null && third.Code === IssueOperand, "参数窗口 [3,5) 超出 4 格");
});

check("参数窗口挡住整数溢出（负数 + 大正数不许绕成合法窗口）", () => {
  eq(WindowOk(3, 2000000000, 4), false, "大正数");
  eq(WindowOk(-1, 2, 4), false, "负基址");
  eq(WindowOk(0, -1, 4), false, "负个数");
  eq(WindowOk(4, 0, 4), false, "基址正好在界外");
  eq(WindowOk(3, 1, 4), true, "最后一格");
  eq(WindowOk(0, 4, 4), true, "整帧");
});

check("算子 id 必须落在两段里（通用段或语言内建段）", () => {
  const unknown = validProgram();
  unknown.Instrs[3] = new Instruction(Op.RtCall, BuiltinBase + 50, 2, 1, 2);
  const first = issueOf(unknown);
  ok(first !== null && first.Code === IssueOperand, "内建段只有 1 条，+5 越界");

  const builtin = validProgram();
  builtin.Instrs[3] = new Instruction(Op.RtCall, BuiltinBase, 2, 1, 2);
  eq(issueOf(builtin), null, "内建段第一条合法");
});

check("异常表：空区间 / 处理点越界 / 跨函数", () => {
  const empty = validProgram();
  empty.AddHandler(new Handler(2, 2, 3, 0));
  const first = issueOf(empty);
  ok(first !== null && first.Code === IssueHandler, "空区间");

  const badTarget = validProgram();
  badTarget.AddHandler(new Handler(0, 3, 99, 0));
  const second = issueOf(badTarget);
  ok(second !== null && second.Code === IssueHandler, "处理点越界");

  const across = validProgram();
  const second2 = new FunctionInfo(3, 4, 0);
  across.Functions.push(second2);
  across.AddHandler(new Handler(0, 4, 3, 0));
  const third = issueOf(across);
  ok(third !== null && third.Code === IssueHandler, "区间跨了两个函数");
});

check("TryPush 的异常表下标越界", () => {
  const program = validProgram();
  program.Instrs[2] = new Instruction(Op.TryPush, 5, -1, -1, -1);
  const issue = issueOf(program);
  ok(issue !== null && issue.Code === IssueHandler, "没有第 5 项");
});

check("函数表：首入口必须是 0、入口必须升序、槽数必须为正", () => {
  const notZero = validProgram();
  notZero.Functions[0].Entry = 1;
  const first = issueOf(notZero);
  ok(first !== null && first.Code === IssueFunction, "首入口非 0");

  const unsorted = validProgram();
  unsorted.Functions.push(new FunctionInfo(0, 4, 0));
  const second = issueOf(unsorted);
  ok(second !== null && second.Code === IssueFunction, "入口不升序");

  const zeroSlots = validProgram();
  zeroSlots.Functions[0].SlotCount = 0;
  const third = issueOf(zeroSlots);
  ok(third !== null && third.Code === IssueFunction, "槽数为 0");
});

check("最后一条会落到尾外", () => {
  const program = validProgram();
  program.Instrs[4] = new Instruction(Op.Move, 0, 1, -1, -1);
  const issue = issueOf(program);
  ok(issue !== null && issue.Code === IssueFallThrough, "最后一条不是终结指令");
  eq(FallsThrough(Op.Return), false, "return 终结");
  eq(FallsThrough(Op.Move), true, "move 不终结");
});

check("常量：档位不可承载 / 码元越界", () => {
  const badTag = validProgram();
  badTag.AddConst(Constant.OfDouble(1));
  const first = issueOf(badTag);
  ok(first !== null && first.Code === IssueConst, "f64 档位");

  const badUnit = validProgram();
  badUnit.AddConst(Constant.OfString([70000]));
  const second = issueOf(badUnit);
  ok(second !== null && second.Code === IssueConst, "码元越界");

  const goodUnit = validProgram();
  goodUnit.AddConst(Constant.OfString([0, 65535]));
  eq(issueOf(goodUnit), null, "边界上的码元是合法的");
});

check("合法程序：Verify 通过、Load 成功、常量物化并被常驻根保住", () => {
  const program = validProgram();
  eq(issueOf(program), null, "应当通过");
  const table = new HeapTable();
  const loaded = Load(Encode(program, testIds), testIds, table);
  ok(loaded !== null, "装载成功");
  eq(loaded.Values.length, program.Consts.length, "常量都物化了");
  eq(loaded.Values[0].AsInt(), 7, "整数常量");
  eq(table.IsValid(loaded.Values[1].Ref), true, "字符串常量的句柄");

  const roots = new RootSet();
  loaded.Roots(roots);
  eq(roots.Count(), 2, "两格常驻根");
  const collector = new Collector(table, 1 << 20);
  collector.Collect(roots);
  eq(table.IsValid(loaded.Values[1].Ref), true, "常量字符串活过了一轮回收");
  eq(loaded.ValueOf(1).Tag, ValueTag.String, "按常量下标取值");
  let threw = false;
  try { loaded.ValueOf(99); } catch { threw = true; }
  eq(threw, true, "常量下标越界要抛（这条只可能来自引擎 bug）");
});

console.log("");
console.log("=== 执行器：分派循环 ===");

/**
 * 手写一份程序：`let i = 0; while (i < 10) { i += 1 }`。
 *
 * 槽布局：0 = i、1 = 10、2 = 1、4/5 = 参数窗口、6 = 比较结果。
 * `rt_call` 的参数要连续，所以 `i` 与 `10` 先搬进 4 / 5 再算。
 */
function loopProgram() {
  const program = new Program();
  const zero = program.AddConst(Constant.OfInt(0));
  const ten = program.AddConst(Constant.OfInt(10));
  const one = program.AddConst(Constant.OfInt(1));
  program.Functions.push(new FunctionInfo(0, 7, 0));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.Const, 0, zero, -1, -1);
  emit(Op.Const, 1, ten, -1, -1);
  emit(Op.Const, 2, one, -1, -1);
  emit(Op.Move, 4, 0, -1, -1);
  emit(Op.Move, 5, 1, -1, -1);
  emit(Op.RtCall, RtOp.CmpLt, 6, 4, 2);
  emit(Op.JumpIfFalse, 6, 12, -1, -1);
  emit(Op.Move, 4, 0, -1, -1);
  emit(Op.Move, 5, 2, -1, -1);
  emit(Op.RtCall, RtOp.Add, 4, 4, 2);
  emit(Op.Move, 0, 4, -1, -1);
  emit(Op.Jump, -1, 3, -1, -1);
  emit(Op.Halt, -1, -1, -1, -1);
  program.IdTableHash = testIds.Hash;
  return program;
}

check("跑一个循环：let i = 0; while (i < 10) { i += 1 } → i 是 10", () => {
  const program = loopProgram();
  eq(issueOf(program), null, "程序必须过验证");
  const bytes = Encode(program, testIds);
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  eq(machine.Load(bytes, testIds), true, "装载");
  eq(machine.Start(0, []), true, "开帧");
  eq(machine.Run(), VmStatus.Halted, "正常停机");
  eq(machine.Frames.Current().Slots[0].AsInt(), 10, "循环跑完之后 i");
  ok(machine.Steps > 10, "步数应当记下来");
  eq(machine.Status, VmStatus.Halted, "状态");
});

check("步数预算：拦得住，而且报的是 OutOfSteps 不是「抛异常」", () => {
  const bytes = Encode(loopProgram(), testIds);
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 20);
  machine.Load(bytes, testIds);
  machine.Start(0, []);
  eq(machine.Run(), VmStatus.OutOfSteps, "预算只有 20 步");
  eq(machine.Steps, 20, "跑满预算就停");
  ok(machine.Frames.Current().Slots[0].AsInt() < 10, "还没跑到 10");
});

check("上限闸门在运行期生效，而且帧活过那一轮回收", () => {
  const bytes = Encode(loopProgram(), testIds);
  const table = new HeapTable();
  const machine = new Vm(table, 4096, 1000);
  machine.Load(bytes, testIds);
  machine.Start(0, []);
  const frame = machine.Frames.TopHandle();
  eq(machine.NeedRoom(999999), false, "要不到");
  eq(machine.Status, VmStatus.OutOfMemory, "状态是 OOM，不是脚本异常");
  eq(table.IsValid(frame), true, "帧在回收之后还活着（它在根快照里）");
});

check("异常展开：try_push 记下的处理点接得住，接不住就停在 Threw", () => {
  const program = new Program();
  const thrown = program.AddConst(Constant.OfInt(7));
  const answer = program.AddConst(Constant.OfInt(42));
  program.Functions.push(new FunctionInfo(0, 4, 0));
  program.Emit(new Instruction(Op.Const, 0, thrown, -1, -1));
  program.Emit(new Instruction(Op.TryPush, 0, -1, -1, -1));
  program.Emit(new Instruction(Op.Throw, 0, -1, -1, -1));
  program.Emit(new Instruction(Op.Halt, -1, -1, -1, -1));
  program.Emit(new Instruction(Op.Const, 1, answer, -1, -1));
  program.Emit(new Instruction(Op.Halt, -1, -1, -1, -1));
  program.AddHandler(new Handler(1, 4, 4, 0));
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "带异常表的程序也要过验证");

  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  eq(machine.Load(Encode(program, testIds), testIds), true, "装载");
  eq(machine.Start(0, []), true, "开帧");
  eq(machine.Run(), VmStatus.Halted, "被接住了，所以正常停机");
  eq(machine.Frames.Current().Slots[1].AsInt(), 42, "处理点跑到了");
  eq(machine.TakePending().AsInt(), 7, "异常值拿得到，拿完就清");

  const bare = new Program();
  bare.Functions.push(new FunctionInfo(0, 2, 0));
  bare.Emit(new Instruction(Op.Const, 0, bare.AddConst(Constant.OfInt(5)), -1, -1));
  bare.Emit(new Instruction(Op.Throw, 0, -1, -1, -1));
  bare.IdTableHash = testIds.Hash;
  const bareTable = new HeapTable();
  const bareMachine = new Vm(bareTable, 1 << 20, 1000);
  bareMachine.Load(Encode(bare, testIds), testIds);
  bareMachine.Start(0, []);
  eq(bareMachine.Run(), VmStatus.Threw, "没人接 → Threw");
  eq(bareMachine.Pending.AsInt(), 5, "异常值留在 Pending 里给宿主");
});

check("算子：`===` 按档位、`==` 只认 nullish、未实现的要抛而不是近似", () => {
  const table = new HeapTable();
  const text = Value.FromString(table.CreateString(units("a")));
  const text2 = Value.FromString(table.CreateString(units("a")));
  eq(RtCmpEqStrict(table, Value.FromInt(1), Value.FromInt(1)).AsBool(), true, "数值相等");
  eq(RtCmpEqStrict(table, Value.FromInt(1), text).AsBool(), false, "档位不同就不等");
  eq(RtCmpEqStrict(table, text, text2).AsBool(), true, "字符串按内容");
  eq(RtCmpEqStrict(table, Value.FromDouble(NaN), Value.FromDouble(NaN)).AsBool(), false, "NaN 不等于自己");
  eq(RtCmpEqLoose(table, Value.Null(), Value.Undefined()).AsBool(), true, "null == undefined");
  eq(RtCmpEqLoose(table, Value.FromInt(1), Value.FromInt(1)).AsBool(), true, "同档位走严格");
  let threw = false;
  try { RtCmpEqLoose(table, Value.FromInt(1), text); } catch { threw = true; }
  eq(threw, true, "1 == \"1\" 还没实现，必须抛");
  let threw2 = false;
  try { RtAdd(machine.Room(), table, Value.Null(), Value.FromInt(1)); } catch { threw2 = true; }
  eq(threw2, true, "非数值的 + 必须抛");
});

console.log("");
console.log("=== 执行器：调用与递归 ===");

check("两帧调用：参数拷过去、结果落回参数基址", () => {
  const program = new Program();
  const one = program.AddConst(Constant.OfInt(1));
  program.Functions.push(new FunctionInfo(0, 4, 1));
  program.Functions.push(new FunctionInfo(2, 4, 1));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.Call, 1, 2, 1, -1);        // pc0: 调槽 1 的闭包，参数在 [2,3)，结果落回 2
  emit(Op.Halt, -1, -1, -1, -1);     // pc1
  emit(Op.Const, 1, one, -1, -1);    // pc2: 被调方：one = 1
  emit(Op.Move, 2, 0, -1, -1);       // pc3: 窗口[0] = 参数
  emit(Op.Move, 3, 1, -1, -1);       // pc4: 窗口[1] = one
  emit(Op.RtCall, RtOp.Add, 2, 2, 2);// pc5: 槽2 = 参数 + 1
  emit(Op.Return, 2, -1, -1, -1);    // pc6
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const closure = Value.FromRef(ValueTag.Closure, table.CreateClosure(2, 0, 1, 0));
  const machine = new Vm(table, 1 << 20, 100000);
  eq(machine.Load(Encode(program, testIds), testIds), true, "装载");
  eq(machine.Start(0, [Value.Undefined(), closure, Value.FromInt(41)]), true, "开帧");
  eq(machine.Run(), VmStatus.Halted, "正常停机");
  eq(machine.Frames.Current().Slots[2].AsInt(), 42, "结果落回参数基址那一格");
  eq(machine.Frames.Depth(), 1, "被调方的帧已经弹掉");
  eq(table.Get(closure.Ref).AsClosure().Code, 2, "闭包记着入口");
});

check("一万层递归：不消耗宿主栈，而且递归中途真的发生过回收", () => {
  const program = new Program();
  const zero = program.AddConst(Constant.OfInt(0));
  const one = program.AddConst(Constant.OfInt(1));
  program.Functions.push(new FunctionInfo(0, 8, 2));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  // 槽布局：0 = n、1 = 自己（闭包）、2 = 0、3 = 1、4/5 = 参数窗口、6 = 结果。
  // **闭包要跟着参数一起传**：参数窗口是拷贝过去的，被调方看不到调用者的槽 1
  //（第一版这里写错了，判据当场把它抓出来）。
  emit(Op.Const, 2, zero, -1, -1);      // pc0
  emit(Op.Const, 3, one, -1, -1);       // pc1
  emit(Op.Move, 4, 0, -1, -1);          // pc2
  emit(Op.Move, 5, 2, -1, -1);          // pc3
  emit(Op.RtCall, RtOp.CmpLe, 6, 4, 2); // pc4
  emit(Op.JumpIfFalse, 6, 8, -1, -1);   // pc5
  emit(Op.Const, 6, zero, -1, -1);      // pc6
  emit(Op.Return, 6, -1, -1, -1);       // pc7
  emit(Op.Move, 4, 0, -1, -1);          // pc8
  emit(Op.Move, 5, 3, -1, -1);          // pc9
  emit(Op.RtCall, RtOp.Sub, 4, 4, 2);   // pc10
  emit(Op.Move, 5, 1, -1, -1);          // pc11: 窗口[1] = 自己
  emit(Op.Call, 1, 4, 2, -1);           // pc12: self(n-1)，参数窗口两个格
  emit(Op.Move, 5, 4, -1, -1);          // pc13
  emit(Op.Move, 4, 0, -1, -1);          // pc14
  emit(Op.RtCall, RtOp.Add, 6, 4, 2);   // pc15
  emit(Op.Return, 6, -1, -1, -1);       // pc16
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const closure = Value.FromRef(ValueTag.Closure, table.CreateClosure(0, 0, 2, 0));
  const machine = new Vm(table, 2621440, 2000000);
  eq(machine.Load(Encode(program, testIds), testIds), true, "装载");
  eq(machine.Start(0, [Value.FromInt(10000), closure]), true, "开帧");
  eq(machine.Run(), VmStatus.Halted, "一万层递归也要跑完");
  eq(machine.Result.AsInt(), 50005000, "入口函数的返回值 sum(10000)");
  ok(machine.Collector.Cycles > 0, "递归中途必须发生过回收（帧是根，一个都不许被收）");
  ok(machine.Steps > 10000, "步数应当记下来");
});

check("跨帧异常展开：被调方抛出，调用者的处理点接住", () => {
  const program = new Program();
  const five = program.AddConst(Constant.OfInt(5));
  const answer = program.AddConst(Constant.OfInt(99));
  program.Functions.push(new FunctionInfo(0, 3, 1));
  program.Functions.push(new FunctionInfo(6, 2, 1));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.TryPush, 0, -1, -1, -1);
  emit(Op.Const, 2, five, -1, -1);
  emit(Op.Call, 0, 2, 1, -1);
  emit(Op.Halt, -1, -1, -1, -1);
  emit(Op.Const, 1, answer, -1, -1);
  emit(Op.Halt, -1, -1, -1, -1);
  emit(Op.Throw, 0, -1, -1, -1);
  program.AddHandler(new Handler(0, 4, 4, 0));
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "带异常表的程序必须过验证");

  const table = new HeapTable();
  const closure = Value.FromRef(ValueTag.Closure, table.CreateClosure(6, 0, 1, 0));
  const machine = new Vm(table, 1 << 20, 100000);
  eq(machine.Load(Encode(program, testIds), testIds), true, "装载");
  eq(machine.Start(0, [closure]), true, "开帧");
  eq(machine.Run(), VmStatus.Halted, "被接住了");
  eq(machine.Frames.Depth(), 1, "被调方的帧在展开时被丢掉了");
  eq(machine.Frames.Current().Slots[1].AsInt(), 99, "处理点跑到了");
  eq(machine.TakePending().AsInt(), 5, "异常值是参数那一格");
});

check("调用未实现的东西要抛（内建 / 宿主函数 / `call_method` / `new`）", () => {
  const table = new HeapTable();
  const program = new Program();
  program.Functions.push(new FunctionInfo(0, 4, 0));
  program.Emit(new Instruction(Op.CallValue, 1, 2, 1, -1));
  program.Emit(new Instruction(Op.Halt, -1, -1, -1, -1));
  program.IdTableHash = testIds.Hash;
  const machine = new Vm(table, 1 << 20, 1000);
  machine.Load(Encode(program, testIds), testIds);
  machine.Start(0, [Value.Undefined(), Value.FromInt(1), Value.Undefined()]);
  let message = "";
  try { machine.Run(); } catch (error) { message = String(error.message); }
  ok(message.indexOf("non-closure") >= 0, "调一个数值要说清楚为什么不行：" + message);
});

console.log("");
console.log("=== 执行器：环境记录与捕获 ===");

check("闭包捕获：读得到外层变量，而且写回共享环境外层看得见", () => {
  const program = new Program();
  const fortyOne = program.AddConst(Constant.OfInt(41));
  const closureEntry = program.AddConst(Constant.OfInt(10));
  const argument = program.AddConst(Constant.OfInt(1));
  program.Functions.push(new FunctionInfo(0, 8, 0));
  program.Functions.push(new FunctionInfo(10, 5, 1));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.EnvNew, 0, 1, -1, -1);          // pc0: 一格环境
  emit(Op.Const, 1, fortyOne, -1, -1);    // pc1
  emit(Op.EnvSet, 1, 0, 0, -1);           // pc2: env[0] = 41
  emit(Op.Move, 3, 0, -1, -1);            // pc3: 窗口[0] = 环境
  emit(Op.Const, 4, closureEntry, -1, -1);// pc4: 窗口[1] = 闭包入口
  emit(Op.RtCall, RtOp.NewClosure, 5, 3, 2); // pc5: 槽5 = 闭包
  emit(Op.Const, 6, argument, -1, -1);    // pc6: 实参 = 1
  emit(Op.Call, 5, 6, 1, -1);             // pc7: 调闭包 → 结果落回槽6
  emit(Op.EnvGet, 7, 0, 0, -1);           // pc8: 读回 env[0]
  emit(Op.Halt, -1, -1, -1, -1);          // pc9
  emit(Op.EnvGet, 1, 0, 0, -1);           // pc10: 闭包体：槽1 = env[0] = 41
  emit(Op.Move, 2, 0, -1, -1);            // pc11: 窗口[0] = 参数
  emit(Op.Move, 3, 1, -1, -1);            // pc12: 窗口[1] = 41
  emit(Op.RtCall, RtOp.Add, 4, 2, 2);     // pc13: 槽4 = 参数 + 41
  emit(Op.EnvSet, 4, 0, 0, -1);           // pc14: env[0] = 槽4
  emit(Op.Return, 4, -1, -1, -1);         // pc15
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  eq(machine.Load(Encode(program, testIds), testIds), true, "装载");
  eq(machine.Start(0, []), true, "开帧");
  eq(machine.Run(), VmStatus.Halted, "正常停机");
  const slots = machine.Frames.Current().Slots;
  eq(slots[6].AsInt(), 42, "闭包的返回值");
  eq(slots[7].AsInt(), 42, "闭包把结果写回了共享环境，外层读得到它");
  eq(table.Get(slots[5].Ref).AsClosure().Env, slots[0].Ref, "闭包捕获的正是那一份环境");
});

check("词法链的深度：depth = 0 是本层，depth = 1 是外层", () => {
  const program = new Program();
  const seven = program.AddConst(Constant.OfInt(7));
  const ninetyNine = program.AddConst(Constant.OfInt(99));
  program.Functions.push(new FunctionInfo(0, 6, 0));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.EnvNew, 0, 2, -1, -1);        // pc0: env0（两格）
  emit(Op.Const, 4, seven, -1, -1);     // pc1
  emit(Op.EnvSet, 4, 0, 0, -1);         // pc2: env0[0] = 7
  emit(Op.EnvNew, 1, 1, -1, -1);        // pc3: env1（一格），Parent = env0
  emit(Op.Const, 5, ninetyNine, -1, -1);// pc4
  emit(Op.EnvSet, 5, 0, 0, -1);         // pc5: env1[0] = 99
  emit(Op.EnvGet, 2, 1, 0, -1);         // pc6: 上一层 → 7
  emit(Op.EnvGet, 3, 0, 0, -1);         // pc7: 本层 → 99
  emit(Op.Halt, -1, -1, -1, -1);        // pc8
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 10000);
  machine.Load(Encode(program, testIds), testIds);
  machine.Start(0, []);
  eq(machine.Run(), VmStatus.Halted, "正常停机");
  const slots = machine.Frames.Current().Slots;
  eq(slots[2].AsInt(), 7, "第 1 层是本层之外的那一层");
  eq(slots[3].AsInt(), 99, "第 0 层是本层");
});

check("环境的格数是动态的，验证层查不了 → 越界必须在这里抛", () => {
  const program = new Program();
  program.Functions.push(new FunctionInfo(0, 4, 0));
  program.Emit(new Instruction(Op.EnvNew, 0, 1, -1, -1));
  program.Emit(new Instruction(Op.EnvGet, 1, 0, 5, -1));
  program.Emit(new Instruction(Op.Halt, -1, -1, -1, -1));
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "验证层只能查「下标非负」");
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  machine.Load(Encode(program, testIds), testIds);
  machine.Start(0, []);
  let message = "";
  try { machine.Run(); } catch (error) { message = String(error.message); }
  ok(message.indexOf("environment index out of range") >= 0, "越界要说清楚：" + message);
});

console.log("");
console.log("=== 属性与原型 ===");

/** 造一个键值（判据里到处要用）。 */
function propKey(table, text) {
  return Value.FromString(table.CreateString(units(text)));
}

/** 属性读写的两个薄封装：把机器提供的两样东西（分配前的闸门、重入回调）固定下来。 */
function getProp(machine, table, receiver, key) {
  return GetProperty(machine.Room(), machine.Native(), machine.Protos, table, receiver, key);
}

function setProp(machine, table, receiver, key, value) {
  return SetProperty(machine.Room(), machine.Native(), table, receiver, key, value);
}

/** 直接把一格属性塞进某个对象（绕开 rt 层，方便摆场景）。 */
function putOwn(table, handle, key, value) {
  table.Get(handle).Props.push(new Property(key.Ref, value));
  table.Recount(handle);
}

check("自有属性的读、写、缺省", () => {
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const protos = InitProtos(machine.Room(), table);
  const object = NewPlainObject(machine.Room(), table, protos);
  const name = propKey(table, "x");
  eq(getProp(machine, table, object, name).IsUndefined(), true, "还没写 → undefined");
  eq(setProp(machine, table, object, name, Value.FromInt(7)).AsInt(), 7, "写入返回赋的值");
  eq(getProp(machine, table, object, name).AsInt(), 7, "读回来");
  eq(getProp(machine, table, object, propKey(table, "y")).IsUndefined(), true, "缺的属性给 undefined");
  eq(typeof TypeOfName(object), "string", "typeof 的名字表留给建库层，这一层只给名字");
});

check("原型链：继承来的属性读得到，而赋值是**遮蔽**不是改原型", () => {
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const protos = InitProtos(machine.Room(), table);
  const proto = Value.FromObject(protos.Object);
  const name = propKey(table, "x");
  setProp(machine, table, proto, name, Value.FromInt(1));

  const child = NewPlainObject(machine.Room(), table, protos);   // Proto = Protos.Object
  eq(getProp(machine, table, child, name).AsInt(), 1, "沿原型链读得到");
  eq(HasProperty(table, child.Ref, name), true, "`in` 也算原型链上的");

  setProp(machine, table, child, name, Value.FromInt(2));
  eq(getProp(machine, table, child, name).AsInt(), 2, "子对象读到自己的");
  eq(getProp(machine, table, proto, name).AsInt(), 1, "**原型没被改**（这一条就是原型污染的反面）");
  eq(table.Get(child.Ref).Props.length, 1, "子对象上多了一个自有属性（遮蔽）");
  eq(table.Get(protos.Object).Props.length, 1, "原型上仍然只有一个");
});

check("delete 只删自有属性，删完重新看见原型上的", () => {
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const protos = InitProtos(machine.Room(), table);
  const proto = Value.FromObject(protos.Object);
  const name = propKey(table, "x");
  setProp(machine, table, proto, name, Value.FromInt(1));
  const child = NewPlainObject(machine.Room(), table, protos);
  setProp(machine, table, child, name, Value.FromInt(2));
  eq(HasProperty(table, child.Ref, name), true, "有");
  eq(DeleteProperty(table, child.Ref, name), true, "删得掉");
  eq(table.Get(child.Ref).Props.length, 0, "自有属性没了");
  eq(getProp(machine, table, child, name).AsInt(), 1, "重新看见原型上的那个");
  eq(DeleteProperty(table, child.Ref, propKey(table, "nope")), true, "删不存在的也算成功");
});

check("数组：new_array、下标读写、越界给 undefined、补洞", () => {
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const protos = InitProtos(machine.Room(), table);
  const array = NewPlainArray(machine.Room(), table, protos);
  eq(getProp(machine, table, array, propKey(table, "length")).AsInt(), 0, "新数组长度 0");
  SetIndex(machine.Room(), table, array, Value.FromInt(0), Value.FromInt(10));
  SetIndex(machine.Room(), table, array, Value.FromInt(2), Value.FromInt(30));
  eq(getProp(machine, table, array, propKey(table, "length")).AsInt(), 3, "长度跟着长");
  eq(GetIndex(table, array, Value.FromInt(0)).AsInt(), 10, "第 0 格");
  eq(GetIndex(table, array, Value.FromInt(1)).IsUndefined(), true, "中间那格是洞 → undefined");
  eq(table.Get(array.Ref).AsArray().IsHole(1), true, "它确实是洞，不是显式的 undefined");
  eq(GetIndex(table, array, Value.FromInt(9)).IsUndefined(), true, "越界 → undefined");
  eq(table.Get(array.Ref).AsArray().GetLength(), 3, "越界读不改长度");
});

check("数组的 length 可写：变短截断、变长补洞", () => {
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const protos = InitProtos(machine.Room(), table);
  const array = NewPlainArray(machine.Room(), table, protos);
  for (let i = 0; i < 3; i++) SetIndex(machine.Room(), table, array, Value.FromInt(i), Value.FromInt(i + 1));
  const lengthKey = propKey(table, "length");
  const heapArray = table.Get(array.Ref).AsArray();
  setProp(machine, table, array, lengthKey, Value.FromInt(1));
  eq(heapArray.GetLength(), 1, "截断到 1");
  eq(heapArray.GetAt(0).AsInt(), 1, "留下的是第一个");
  setProp(machine, table, array, lengthKey, Value.FromInt(3));
  eq(heapArray.GetLength(), 3, "又变长到 3");
  eq(heapArray.IsHole(1), true, "**变长出来的格子是洞**（不是显式 undefined）");
  eq(heapArray.IsHole(2), true, "另一格也是洞");
  eq(heapArray.IsHole(0), false, "原来那格不是洞");
});

check("原始值接收者：字符串的 length 与下标", () => {
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const text = Value.FromString(table.CreateString(units("abc")));
  eq(getProp(machine, table, text, propKey(table, "length")).AsInt(), 3, "字符串也有 length");
  const first = GetIndex(table, text, Value.FromInt(0));
  eq(first.Tag, ValueTag.String, "下标给的是一个码元字符串");
  eq(table.Get(first.Ref).AsString().GetLength(), 1, "长度 1");
  eq(GetIndex(table, text, Value.FromInt(5)).IsUndefined(), true, "越界给 undefined");
});

check("访问器与只读属性：只读与「有 getter 没 setter」这一轮必须抛", () => {
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const protos = InitProtos(machine.Room(), table);
  const object = NewPlainObject(machine.Room(), table, protos);

  // 有 getter 没 setter：读得到（见下面那条），写要抛（该是 TypeError）
  const getterKey = propKey(table, "g");
  const getter = Value.FromRef(ValueTag.Closure, table.CreateClosure(0, 0, 0, 0));
  table.Get(object.Ref).Props.push(Property.Accessor(getterKey.Ref, getter, Value.Undefined()));
  let threw = false;
  try { setProp(machine, table, object, getterKey, Value.FromInt(1)); } catch { threw = true; }
  eq(threw, true, "只有 getter 的访问器被赋值 → 抛");

  const frozen = propKey(table, "f");
  const property = new Property(frozen.Ref, Value.FromInt(1));
  property.Flags = 0;
  table.Get(object.Ref).Props.push(property);
  let threw2 = false;
  try { setProp(machine, table, object, frozen, Value.FromInt(2)); } catch { threw2 = true; }
  eq(threw2, true, "只读属性 → 抛（该是 TypeError，等错误对象那一层）");
});

console.log("");
console.log("=== 访问器：重入分派循环 ===");

check("getter：读属性真的**重入分派循环**跑脚本，`this` 是接收者", () => {
  // 场景：obj.v 的 getter 返回 this.x + 1；obj.x 先摆成 41 → 读 obj.v 应当是 42
  const program = new Program();
  const keyV = program.AddConst(Constant.OfString(units("v")));
  const keyX = program.AddConst(Constant.OfString(units("x")));
  const one = program.AddConst(Constant.OfInt(1));
  const getterEntry = program.AddConst(Constant.OfInt(6));
  program.Functions.push(new FunctionInfo(0, 6, 0));
  program.Functions.push(new FunctionInfo(6, 5, 0));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.RtCall, RtOp.NewObject, 0, 0, 0);       // pc0: 槽0 = 对象
  emit(Op.EnvNew, 1, 1, -1, -1);                  // pc1: 环境 → 槽1
  emit(Op.Move, 2, 1, -1, -1);                    // pc2: 窗口 = (环境, getter 入口)
  emit(Op.Const, 3, getterEntry, -1, -1);         // pc3
  emit(Op.RtCall, RtOp.NewClosure, 4, 2, 2);      // pc4: 槽4 = getter 闭包
  emit(Op.Halt, -1, -1, -1, -1);                  // pc5
  // getter 体（入口 6）：返回 this.x + 1
  emit(Op.LoadThis, 1, -1, -1, -1);               // pc6
  emit(Op.Const, 2, keyX, -1, -1);                // pc7
  emit(Op.RtCall, RtOp.GetProp, 3, 1, 2);         // pc8: 槽3 = this.x
  emit(Op.Const, 4, one, -1, -1);                 // pc9
  emit(Op.RtCall, RtOp.Add, 3, 3, 2);             // pc10: 槽3 = this.x + 1
  emit(Op.Return, 3, -1, -1, -1);                 // pc11
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  machine.Load(Encode(program, testIds), testIds);
  machine.Start(0, []);
  machine.Run();                                   // 跑完准备段：槽0 = 对象、槽4 = getter 闭包
  const object = machine.Frames.Current().Slots[0];
  const getter = machine.Frames.Current().Slots[4];
  eq(getter.Tag, ValueTag.Closure, "getter 是个闭包");
  setProp(machine, table, object, propKey(table, "x"), Value.FromInt(41));
  table.Get(object.Ref).Props.push(Property.Accessor(propKey(table, "v").Ref, getter, Value.Undefined()));
  eq(getProp(machine, table, object, propKey(table, "v")).AsInt(), 42, "getter 里读到 this.x 再加一");
});

check("setter：写属性真的**重入**跑脚本，而且 `this` 是接收者", () => {
  // 场景：obj.v 的 setter 执行 this.x = 参数；写 obj.v = 5 之后 obj.x 应当是 5
  const program = new Program();
  const keyX = program.AddConst(Constant.OfString(units("x")));
  const setterEntry = program.AddConst(Constant.OfInt(6));
  program.Functions.push(new FunctionInfo(0, 6, 0));
  program.Functions.push(new FunctionInfo(6, 5, 1));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.RtCall, RtOp.NewObject, 0, 0, 0);       // pc0
  emit(Op.EnvNew, 1, 1, -1, -1);                  // pc1
  emit(Op.Move, 2, 1, -1, -1);                    // pc2
  emit(Op.Const, 3, setterEntry, -1, -1);         // pc3
  emit(Op.RtCall, RtOp.NewClosure, 4, 2, 2);      // pc4: 槽4 = setter 闭包
  emit(Op.Halt, -1, -1, -1, -1);                  // pc5
  // setter 体（入口 6）：this.x = 参数
  emit(Op.LoadThis, 1, -1, -1, -1);               // pc6: 槽1 = this
  emit(Op.Const, 2, keyX, -1, -1);                // pc7: 槽2 = 键 "x"
  emit(Op.Move, 3, 0, -1, -1);                    // pc8: 槽3 = 参数
  emit(Op.RtCall, RtOp.SetProp, 4, 1, 3);         // pc9: this.x = 参数（窗口 [1,4)，结果写进没人用的槽4）
  emit(Op.Return, -1, -1, -1, -1);                // pc10
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  machine.Load(Encode(program, testIds), testIds);
  machine.Start(0, []);
  machine.Run();
  const object = machine.Frames.Current().Slots[0];
  const setter = machine.Frames.Current().Slots[4];
  table.Get(object.Ref).Props.push(Property.Accessor(propKey(table, "v").Ref, Value.Undefined(), setter));
  setProp(machine, table, object, propKey(table, "v"), Value.FromInt(5));
  eq(getProp(machine, table, object, propKey(table, "x")).AsInt(), 5, "setter 把参数写到了 this.x");
});

check("重入有深度上限：getter 里再读同一个属性 → 抛，不是把宿主拖死", () => {
  // 场景：obj.v 的 getter 体就是 `return this.v`（自我递归）
  const program = new Program();
  const keyV = program.AddConst(Constant.OfString(units("v")));
  const getterEntry = program.AddConst(Constant.OfInt(6));
  program.Functions.push(new FunctionInfo(0, 6, 0));
  program.Functions.push(new FunctionInfo(6, 4, 0));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.RtCall, RtOp.NewObject, 0, 0, 0);       // pc0
  emit(Op.EnvNew, 1, 1, -1, -1);                  // pc1
  emit(Op.Move, 2, 1, -1, -1);                    // pc2
  emit(Op.Const, 3, getterEntry, -1, -1);         // pc3
  emit(Op.RtCall, RtOp.NewClosure, 4, 2, 2);      // pc4
  emit(Op.Halt, -1, -1, -1, -1);                  // pc5
  emit(Op.LoadThis, 1, -1, -1, -1);               // pc6
  emit(Op.Const, 2, keyV, -1, -1);                // pc7
  emit(Op.RtCall, RtOp.GetProp, 3, 1, 2);         // pc8: 又去读 this.v（同一格访问器）
  emit(Op.Return, 3, -1, -1, -1);                 // pc9
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  machine.Load(Encode(program, testIds), testIds);
  machine.Start(0, []);
  machine.Run();
  const object = machine.Frames.Current().Slots[0];
  const getter = machine.Frames.Current().Slots[4];
  table.Get(object.Ref).Props.push(Property.Accessor(propKey(table, "v").Ref, getter, Value.Undefined()));
  let message = "";
  try { getProp(machine, table, object, propKey(table, "v")); } catch (error) { message = String(error.message); }
  ok(message.indexOf("native re-entry is too deep") >= 0, "深度上限要拦住：" + message);
});

check("内建原型表是常驻根：回收之后三个原型还活着", () => {
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const program = new Program();
  program.Functions.push(new FunctionInfo(0, 2, 0));
  program.Emit(Instruction.Simple(Op.Halt));
  program.IdTableHash = testIds.Hash;
  machine.Load(Encode(program, testIds), testIds);
  const object = machine.Protos.Object;
  const array = machine.Protos.Array;
  machine.NeedRoom(1 << 20);
  eq(table.IsValid(object), true, "Object 原型活着");
  eq(table.IsValid(array), true, "Array 原型活着");
});

console.log("");
console.log("=== this 与方法调用 ===");

check("call_method：在接收者上找方法，而且 `this` 是**接收者**", () => {
  const program = new Program();
  const fortyOne = program.AddConst(Constant.OfInt(41));
  const keyX = program.AddConst(Constant.OfString(units("x")));
  const keyM = program.AddConst(Constant.OfString(units("m")));
  const five = program.AddConst(Constant.OfInt(5));
  const methodEntry = program.AddConst(Constant.OfInt(17));
  program.Functions.push(new FunctionInfo(0, 8, 0));
  program.Functions.push(new FunctionInfo(17, 6, 1));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.RtCall, RtOp.NewObject, 0, 0, 0);        // pc0: 槽0 = 新对象
  emit(Op.Const, 1, fortyOne, -1, -1);             // pc1
  emit(Op.Move, 2, 0, -1, -1);                     // pc2: 窗口 = (接收者, 键, 值)
  emit(Op.Const, 3, keyX, -1, -1);                 // pc3
  emit(Op.Move, 4, 1, -1, -1);                     // pc4
  emit(Op.RtCall, RtOp.SetProp, 5, 2, 3);          // pc5: obj.x = 41
  emit(Op.EnvNew, 6, 1, -1, -1);                   // pc6: 一格环境
  emit(Op.Move, 2, 6, -1, -1);                     // pc7: 窗口 = (环境, 入口)
  emit(Op.Const, 3, methodEntry, -1, -1);          // pc8
  emit(Op.RtCall, RtOp.NewClosure, 7, 2, 2);       // pc9: 槽7 = 方法闭包
  emit(Op.Move, 2, 0, -1, -1);                     // pc10: 窗口 = (接收者, 键, 闭包)
  emit(Op.Const, 3, keyM, -1, -1);                 // pc11
  emit(Op.Move, 4, 7, -1, -1);                     // pc12
  emit(Op.RtCall, RtOp.SetProp, 5, 2, 3);          // pc13: obj.m = 闭包
  emit(Op.Const, 3, five, -1, -1);                 // pc14: 实参 5（窗口 [3,4)）
  emit(Op.CallMethod, 0, keyM, 3, 1);              // pc15: obj.m(5) → 结果落回槽3
  emit(Op.Halt, -1, -1, -1, -1);                   // pc16
  emit(Op.LoadThis, 1, -1, -1, -1);                // pc17: 方法体：槽1 = this
  emit(Op.Const, 2, keyX, -1, -1);                 // pc18: 槽2 = 键 "x"
  emit(Op.RtCall, RtOp.GetProp, 4, 1, 2);          // pc19: 槽4 = this.x（窗口 [1,3) 正好是 this 与键）
  emit(Op.Move, 3, 0, -1, -1);                     // pc20: 槽3 = 实参
  emit(Op.RtCall, RtOp.Add, 5, 3, 2);              // pc21: 槽5 = 实参 + this.x（窗口 [3,5)）
  emit(Op.Return, 5, -1, -1, -1);                  // pc22
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  eq(machine.Load(Encode(program, testIds), testIds), true, "装载");
  eq(machine.Start(0, []), true, "开帧");
  eq(machine.Run(), VmStatus.Halted, "正常停机");
  eq(machine.Frames.Current().Slots[3].AsInt(), 46, "5 + obj.x（`this` 落在接收者上）");
});

check("new：构造函数写 `this`、返回 undefined → 用造出来的那个对象", () => {
  const program = new Program();
  const keyK = program.AddConst(Constant.OfString(units("k")));
  const seven = program.AddConst(Constant.OfInt(7));
  const ctorEntry = program.AddConst(Constant.OfInt(6));
  program.Functions.push(new FunctionInfo(0, 8, 0));
  program.Functions.push(new FunctionInfo(6, 4, 0));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.EnvNew, 6, 1, -1, -1);              // pc0
  emit(Op.Move, 2, 6, -1, -1);                // pc1
  emit(Op.Const, 3, ctorEntry, -1, -1);       // pc2
  emit(Op.RtCall, RtOp.NewClosure, 7, 2, 2);  // pc3: 槽7 = 构造函数
  emit(Op.New, 7, 2, 0, -1);                  // pc4: new ctor() → 结果落回槽2
  emit(Op.Halt, -1, -1, -1, -1);              // pc5
  emit(Op.LoadThis, 1, -1, -1, -1);           // pc6: 构造函数体：槽1 = this
  emit(Op.Const, 2, keyK, -1, -1);            // pc7: 键 "k"
  emit(Op.Const, 3, seven, -1, -1);           // pc8: 值 7
  emit(Op.RtCall, RtOp.SetProp, 1, 1, 3);     // pc9: this.k = 7
  emit(Op.Return, -1, -1, -1, -1);            // pc10: 返回 undefined
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  machine.Load(Encode(program, testIds), testIds);
  machine.Start(0, []);
  eq(machine.Run(), VmStatus.Halted, "正常停机");
  const built = machine.Frames.Current().Slots[2];
  eq(built.Tag, ValueTag.Object, "结果是个对象");
  eq(getProp(machine, table, built, propKey(table, "k")).AsInt(), 7, "构造函数写在 this 上的属性在");
});

check("new：构造函数返回了对象 → 用那个对象（JS 的收尾规矩）", () => {
  const program = new Program();
  const keyK = program.AddConst(Constant.OfString(units("k")));
  const seven = program.AddConst(Constant.OfInt(7));
  const ninetyNine = program.AddConst(Constant.OfInt(99));
  const ctorEntry = program.AddConst(Constant.OfInt(6));
  program.Functions.push(new FunctionInfo(0, 8, 0));
  program.Functions.push(new FunctionInfo(6, 5, 0));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.EnvNew, 6, 1, -1, -1);
  emit(Op.Move, 2, 6, -1, -1);
  emit(Op.Const, 3, ctorEntry, -1, -1);
  emit(Op.RtCall, RtOp.NewClosure, 7, 2, 2);
  emit(Op.New, 7, 2, 0, -1);
  emit(Op.Halt, -1, -1, -1, -1);
  emit(Op.LoadThis, 1, -1, -1, -1);              // pc6
  emit(Op.Const, 2, keyK, -1, -1);               // pc7
  emit(Op.Const, 3, seven, -1, -1);              // pc8
  emit(Op.RtCall, RtOp.SetProp, 1, 1, 3);        // pc9: this.k = 7（写在目标对象上）
  emit(Op.RtCall, RtOp.NewObject, 1, 1, 0);      // pc10: 槽1 = 另一个新对象
  emit(Op.Move, 2, 1, -1, -1);                   // pc11: 窗口 = (另一个, 键, 99)
  emit(Op.Const, 3, keyK, -1, -1);               // pc12
  emit(Op.Const, 4, ninetyNine, -1, -1);         // pc13
  emit(Op.RtCall, RtOp.SetProp, 0, 2, 3);        // pc14: 另一个.k = 99（结果写进没人用的槽0）
  emit(Op.Return, 1, -1, -1, -1);                // pc15: 返回那个对象
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  machine.Load(Encode(program, testIds), testIds);
  machine.Start(0, []);
  eq(machine.Run(), VmStatus.Halted, "正常停机");
  const built = machine.Frames.Current().Slots[2];
  eq(getProp(machine, table, built, propKey(table, "k")).AsInt(), 99, "构造函数返回的对象赢");
});

console.log("");
console.log("=== 生成器：suspend / resume ===");

check("生成器：yield 两次、恢复时收到的值当返回值，挂起期间还活过一轮回收", () => {
  const program = new Program();
  const one = program.AddConst(Constant.OfInt(1));
  const two = program.AddConst(Constant.OfInt(2));
  const genEntry = program.AddConst(Constant.OfInt(6));
  const entryInfo = new FunctionInfo(0, 6, 0);
  const genInfo = new FunctionInfo(6, 6, 0);
  genInfo.IsGenerator = true;
  program.Functions.push(entryInfo);
  program.Functions.push(genInfo);
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  // 入口：造生成器函数闭包并调用它（调用生成器函数**只造对象，不跑体**）
  emit(Op.EnvNew, 0, 1, -1, -1);              // pc0
  emit(Op.Move, 2, 0, -1, -1);                // pc1: 窗口[0] = 环境
  emit(Op.Const, 3, genEntry, -1, -1);        // pc2: 窗口[1] = 生成器入口
  emit(Op.RtCall, RtOp.NewClosure, 4, 2, 2);  // pc3: 槽4 = 闭包
  emit(Op.Call, 4, 5, 0, -1);                 // pc4: 调它 → 生成器对象落回槽5
  emit(Op.Halt, -1, -1, -1, -1);              // pc5
  // 生成器体（入口 6）
  emit(Op.Const, 0, one, -1, -1);             // pc6: 产出 1
  emit(Op.Suspend, 0, -1, -1, -1);            // pc7: yield 1
  emit(Op.Resume, 1, -1, -1, -1);             // pc8: 槽1 = next(v) 传进来的 v
  emit(Op.Const, 0, two, -1, -1);             // pc9: 产出 2
  emit(Op.Suspend, 0, -1, -1, -1);            // pc10: yield 2
  emit(Op.Resume, 2, -1, -1, -1);             // pc11: 槽2 = 第二次 next(v) 的 v
  emit(Op.Return, 2, -1, -1, -1);             // pc12: 返回值就是收到的那个 v
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  machine.Load(Encode(program, testIds), testIds);
  machine.Start(0, []);
  eq(machine.Run(), VmStatus.Halted, "准备段跑完");
  const generator = machine.Frames.Current().Slots[5];
  eq(generator.Tag, ValueTag.Object, "调用生成器函数得到的是个对象");
  eq(table.Get(generator.Ref).AsGenerator().State, 0, "初始是挂起（Suspended = 0）");

  const first = machine.DoIterNext(generator, Value.Undefined());
  eq(GetIndex(table, first, Value.FromInt(0)).AsInt(), 1, "第一次产出 1");
  eq(GetIndex(table, first, Value.FromInt(1)).AsBool(), false, "还没结束");

  // **挂起期间强制回收一轮**：帧不在栈上，只有生成器挂着它——不许被收掉
  machine.SnapshotRoots();
  machine.Collector.Collect(machine.Roots);
  ok(machine.Collector.Cycles > 0, "确实回收过");
  eq(table.IsValid(generator.Ref), true, "生成器活过回收");

  const second = machine.DoIterNext(generator, Value.FromInt(42));
  eq(GetIndex(table, second, Value.FromInt(0)).AsInt(), 2, "第二次产出 2");

  const third = machine.DoIterNext(generator, Value.FromInt(77));
  eq(GetIndex(table, third, Value.FromInt(0)).AsInt(), 77, "恢复时收到的值被当成了返回值");
  eq(GetIndex(table, third, Value.FromInt(1)).AsBool(), true, "这次结束了");
  eq(table.Get(generator.Ref).AsGenerator().State, 2, "状态是 Done（= 2）");

  const fourth = machine.DoIterNext(generator, Value.Undefined());
  eq(GetIndex(table, fourth, Value.FromInt(0)).IsUndefined(), true, "结束之后产出 undefined");
  eq(GetIndex(table, fourth, Value.FromInt(1)).AsBool(), true, "结束之后一直是 done");
});

console.log("");
console.log("=== 承诺与微任务 ===");

/** 一个「等承诺、把兑现值加一、返回」的程序（槽 0 = 承诺）。 */
function awaitProgram() {
  const program = new Program();
  const one = program.AddConst(Constant.OfInt(1));
  program.Functions.push(new FunctionInfo(0, 6, 1));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.Await, 0, -1, -1, -1);              // pc0: 挂起等槽0 的承诺
  emit(Op.Resume, 1, -1, -1, -1);             // pc1: 槽1 = 兑现值
  emit(Op.Const, 2, one, -1, -1);             // pc2
  emit(Op.Move, 3, 1, -1, -1);                // pc3: 窗口[0] = 兑现值
  emit(Op.Move, 4, 2, -1, -1);                // pc4: 窗口[1] = 1
  emit(Op.RtCall, RtOp.Add, 3, 3, 2);         // pc5: 槽3 = 兑现值 + 1
  emit(Op.Return, 3, -1, -1, -1);             // pc6
  program.IdTableHash = testIds.Hash;
  return program;
}

check("await：挂起 → 兑现 → 微任务恢复 → 入口函数的返回值是 兑现值 + 1", () => {
  const program = awaitProgram();
  eq(issueOf(program), null, "程序必须过验证");
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  machine.Load(Encode(program, testIds), testIds);

  const promise = Value.FromObject(table.CreatePromise(PromiseState.Pending, Value.Undefined()));
  machine.Retain(promise);                       // 宿主拿住它：挂起的帧只有它可达
  eq(machine.Start(0, [promise]), true, "开帧（承诺当参数）");
  eq(machine.Run(), VmStatus.Halted, "脚本停在 await 上");
  eq(machine.Frames.Depth(), 0, "帧已经挂到承诺上，不在栈上");
  eq(table.Get(promise.Ref).AsPromise().Reactions.length, 1, "等着它的帧在反应表里");
  eq(machine.Microtasks.length, 0, "还没结清 → 队列里没有东西");

  // 挂起期间强制回收一轮：宿主 retain 住了承诺，所以整条链都该活着
  machine.ResolvePromise(promise, Value.FromInt(41));
  eq(table.Get(promise.Ref).AsPromise().State, PromiseState.Fulfilled, "已兑现");
  eq(machine.Microtasks.length, 1, "恢复已经排进微任务队列");
  machine.SnapshotRoots();
  machine.Collector.Collect(machine.Roots);
  eq(table.IsValid(promise.Ref), true, "承诺活过回收（宿主 retain 是根）");

  eq(machine.DrainMicrotasks(), true, "排空成功");
  eq(machine.Result.AsInt(), 42, "兑现值 + 1 成了入口函数的返回值");
  eq(machine.Microtasks.length, 0, "队列跑干净了");
  machine.Release(promise.Ref);
  eq(machine.Retained.length, 0, "归还之后没有残留的根");
});

check("已兑现的承诺也要推迟一个微任务（await 至少让出一个 tick）", () => {
  const program = awaitProgram();
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  machine.Load(Encode(program, testIds), testIds);
  const promise = Value.FromObject(table.CreatePromise(PromiseState.Fulfilled, Value.FromInt(1)));
  machine.Retain(promise);
  machine.Start(0, [promise]);
  eq(machine.Run(), VmStatus.Halted, "即使已兑现也先挂起");
  eq(machine.Frames.Depth(), 0, "帧不在栈上");
  eq(machine.Microtasks.length, 1, "恢复立刻排进了队列");
  eq(table.Get(promise.Ref).AsPromise().Reactions.length, 0, "已兑现的承诺不需要反应表");
  eq(machine.DrainMicrotasks(), true, "排空");
  eq(machine.Result.AsInt(), 2, "1 + 1");
});

check("await 一个不是承诺的东西要抛（不静默给近似值）", () => {
  const program = awaitProgram();
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  machine.Load(Encode(program, testIds), testIds);
  const protos = InitProtos(machine.Room(), table);
  const plain = NewPlainObject(machine.Room(), table, protos);
  machine.Start(0, [plain]);
  let message = "";
  try { machine.Run(); } catch (error) { message = String(error.message); }
  ok(message.indexOf("awaiting a non-promise") >= 0, "要说清楚为什么不行：" + message);

  const table2 = new HeapTable();
  const machine2 = new Vm(table2, 1 << 20, 1000);
  machine2.Load(Encode(program, testIds), testIds);
  machine2.Start(0, [Value.FromInt(5)]);
  let message2 = "";
  try { machine2.Run(); } catch (error) { message2 = String(error.message); }
  ok(message2.indexOf("awaiting a non-object") >= 0, "原始值也不是承诺：" + message2);
});

console.log("");
console.log("=== 宿主 ABI ===");

/** 一个「把常量 7 返回出去」的程序。 */
function returnSeven() {
  const program = new Program();
  const seven = program.AddConst(Constant.OfInt(7));
  program.Functions.push(new FunctionInfo(0, 2, 0));
  program.Emit(new Instruction(Op.Const, 0, seven, -1, -1));
  program.Emit(new Instruction(Op.Return, 0, -1, -1, -1));
  program.IdTableHash = testIds.Hash;
  return program;
}

check("宿主调用：装载 → 调用 → Ok，返回值拿得到", () => {
  const program = returnSeven();
  eq(issueOf(program), null, "程序必须过验证");
  const machine = new Vm(new HeapTable(), 1 << 20, 100000);
  const host = new Host(machine, Limits.Default());
  const loaded = host.Load(Encode(program, testIds), testIds);
  eq(loaded.Outcome, HostOutcome.Ok, "装载成功：" + loaded.Message);
  const called = host.Call(0, []);
  eq(called.Outcome, HostOutcome.Ok, "调用成功：" + called.Message);
  eq(called.Value.AsInt(), 7, "返回值");
});

check("能力白名单：注册了才调得到，没注册要报出来（不是 undefined）", () => {
  const program = new Program();
  const five = program.AddConst(Constant.OfInt(5));
  const capId = program.AddConst(Constant.OfInt(BuiltinBase));
  program.Functions.push(new FunctionInfo(0, 4, 0));
  program.Emit(new Instruction(Op.Const, 0, capId, -1, -1));      // pc0: 槽0 = 能力 id
  program.Emit(new Instruction(Op.Const, 1, five, -1, -1));       // pc1: 槽1 = 参数
  program.Emit(new Instruction(Op.RtCall, RtOp.HostCall, 2, 0, 2)); // pc2: host_call(id, 5)
  program.Emit(new Instruction(Op.Return, 2, -1, -1, -1));        // pc3
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");

  // 注册过的一台：宿主函数把参数加 100
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  machine.NeedRoom(ObjectCharge);
  const target = Value.FromRef(ValueTag.HostRef, table.CreateHostRef(BuiltinBase, 1));
  const host = new Host(machine, Limits.Default());
  host.InstallHost((ref, self, args) => Value.FromInt(args[0].AsInt() + 100));
  eq(host.Load(Encode(program, testIds), testIds).Outcome, HostOutcome.Ok, "装载");
  eq(host.Register(BuiltinBase, target), true, "注册成功");
  eq(host.Registered.length, 1, "留下一条注册记录（排查用）");
  const called = host.Call(0, []);
  eq(called.Outcome, HostOutcome.Ok, "调用成功：" + called.Message);
  eq(called.Value.AsInt(), 105, "宿主函数把 5 加成了 105");

  // 没注册的一台：必须报「能力未注册」
  const bare = new Host(new Vm(new HeapTable(), 1 << 20, 100000), Limits.Default());
  bare.InstallHost((ref, self, args) => Value.FromInt(0));
  bare.Load(Encode(program, testIds), testIds);
  let message = "";
  try { bare.Call(0, []); } catch (error) { message = String(error.message); }
  ok(message.indexOf("capability is not registered") >= 0, "要说清楚是哪个能力没注册：" + message);
});

check("脚本抛出：结局是 ScriptThrew，异常值在 Error 里", () => {
  const program = new Program();
  const seven = program.AddConst(Constant.OfInt(7));
  program.Functions.push(new FunctionInfo(0, 2, 0));
  program.Emit(new Instruction(Op.Const, 0, seven, -1, -1));
  program.Emit(new Instruction(Op.Throw, 0, -1, -1, -1));
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");
  const host = new Host(new Vm(new HeapTable(), 1 << 20, 1000), Limits.Default());
  host.Load(Encode(program, testIds), testIds);
  const called = host.Call(0, []);
  eq(called.Outcome, HostOutcome.ScriptThrew, "结局是脚本抛出");
  eq(called.Error.AsInt(), 7, "异常值");
  ok(called.Message.length > 0, "给人看的说明也不空");
});

check("挂起：脚本停在 await 上时结局是 Parked，**不是 Ok**", () => {
  const program = awaitProgram();
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  const host = new Host(machine, Limits.Default());
  host.Load(Encode(program, testIds), testIds);
  machine.NeedRoom(ObjectCharge);
  const promise = Value.FromObject(table.CreatePromise(PromiseState.Pending, Value.Undefined()));
  host.Retain(promise);
  const parked = host.Call(0, [promise]);
  eq(parked.Outcome, HostOutcome.Parked, "挂在等承诺上：" + parked.Message);
  ok(parked.Value.IsUndefined(), "这时候**没有**返回值（不许拿 undefined 当结果）");

  host.Settle(promise, Value.FromInt(41));
  eq(host.Drain(), true, "宿主推进微任务");
  eq(machine.Finished, true, "这次真的跑完了");
  eq(machine.Result.AsInt(), 42, "兑现值 + 1");
  host.Release(promise.Ref);
});

check("步数用尽：结局是 OutOfSteps，而且是限额不是崩溃", () => {
  const program = new Program();
  program.Functions.push(new FunctionInfo(0, 2, 0));
  program.Emit(new Instruction(Op.Jump, -1, 0, -1, -1));   // pc0: 自己跳自己（目标是 B）
  program.IdTableHash = testIds.Hash;
  eq(issueOf(program), null, "程序必须过验证");
  const host = new Host(new Vm(new HeapTable(), 1 << 20, 50), new Limits(50, 1 << 20, 64));
  host.Load(Encode(program, testIds), testIds);
  const called = host.Call(0, []);
  eq(called.Outcome, HostOutcome.OutOfSteps, "步数用尽：" + called.Message);
});

console.log("");
console.log("=== P0 雏形：同一份 TS，Node 与「降级 + VM」一致 ===");

/** 真解析器 → TS 形状的投影（与 samples 用的是同一条库 API）。 */
function parseTsShape(source) {
  const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
  const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
  const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));
  const { projectRoot, ToJsonText } = require(path.join(root, "build", "ts", "typescript", "print-ast-common.js"));
  const document = new TextDocument(source);
  document.FilePath = "judge.ts";
  const context = new TextContext(new Template());
  context.Process(document);
  return JSON.parse(ToJsonText(projectRoot(context.Root.ToList(), source)));
}

/** 把 VM 里的字符串值搬回宿主的字符串（判据要拿它跟 Node 比）。 */
function hostStringOf(table, value) {
  const units = table.Get(value.Ref).AsString().Units;
  let text = "";
  for (let i = 0; i < units.length; i++) text += String.fromCharCode(units[i]);
  return text;
}

/** 降级一份源码，返回 { module, host, machine, table }；验证不过就抛。 */
function lowerAndLoad(source, globals, capabilityOf) {
  const lowering = new Lowering();
  if (globals) lowering.DeclareGlobals(globals);
  if (capabilityOf) lowering.DeclareCapabilities(capabilityOf);
  const lowered = lowering.LowerModule(parseTsShape(source), testIds);
  const issue = Verify(lowered.Program, testIds);
  eq(issue, null, "降级出来的程序必须过验证：" + describeValue(issue));
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  const host = new Host(machine, Limits.Default());
  const loaded = host.Load(Encode(lowered.Program, testIds), testIds);
  eq(loaded.Outcome, HostOutcome.Ok, "装载：" + loaded.Message);
  return { module: lowered, host, machine, table };
}

check("算术、while、赋值、调用：与 Node 跑同一份 TS 逐值一致", () => {
  const source = [
    "function add(a, b) { return a + b; }",
    "function sumTo(n) {",
    "  let total = 0;",
    "  let i = 0;",
    "  while (i < n) {",
    "    total = total + i;",
    "    i = i + 1;",
    "  }",
    "  return total;",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn [add(2, 3), sumTo(5), sumTo(0)];")();
  const { module, host } = lowerAndLoad(source);
  const addIndex = module.EntryOf("add");
  const sumIndex = module.EntryOf("sumTo");
  ok(addIndex >= 0 && sumIndex >= 0, "两个函数都登记了");
  eq(host.Call(addIndex, [Value.FromInt(2), Value.FromInt(3)]).Value.AsInt(), expected[0], "add(2, 3)");
  eq(host.Call(sumIndex, [Value.FromInt(5)]).Value.AsInt(), expected[1], "sumTo(5)");
  eq(host.Call(sumIndex, [Value.FromInt(0)]).Value.AsInt(), expected[2], "sumTo(0)");
});

check("字符串拼接与 if/else：与 Node 一致", () => {
  const source = [
    "function greet(name) { return \"hi \" + name; }",
    "function pick(a) {",
    "  if (a < 10) { return \"small\"; } else { return \"big\"; }",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn [greet(\"x\"), pick(3), pick(30)];")();
  const { module, host, table } = lowerAndLoad(source);
  const greetIndex = module.EntryOf("greet");
  const pickIndex = module.EntryOf("pick");
  const greeting = host.Call(greetIndex, [
    Value.FromString(table.CreateString([120])),
  ]);
  eq(greeting.Outcome, HostOutcome.Ok, "greet 跑通：" + greeting.Message);
  eq(hostStringOf(table, greeting.Value), expected[0], "greet(\"x\")");
  const small = host.Call(pickIndex, [Value.FromInt(3)]);
  eq(hostStringOf(table, small.Value), expected[1], "pick(3)");
  const big = host.Call(pickIndex, [Value.FromInt(30)]);
  eq(hostStringOf(table, big.Value), expected[2], "pick(30)");
});

check("闭包捕获：内层函数读写外层变量，两次调用各有各的环境（与 Node 一致）", () => {
  const source = [
    "function makeCounter() {",
    "  let count = 0;",
    "  function step() {",
    "    count = count + 1;",
    "    return count;",
    "  }",
    "  return step;",
    "}",
    "function twice() {",
    "  const a = makeCounter();",
    "  return a() + a();",
    "}",
    "function twoCounters() {",
    "  const a = makeCounter();",
    "  const b = makeCounter();",
    "  return a() * 10 + b();",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn [twice(), twoCounters()];")();
  const { module, host } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);
  const first = host.CallExport(module.ExportOf("twice"), []);
  eq(first.Outcome, HostOutcome.Ok, "twice 跑通：" + first.Message);
  eq(first.Value.AsInt(), expected[0], "a() + a()：同一个闭包共享同一格（1 + 2）");
  const second = host.CallExport(module.ExportOf("twoCounters"), []);
  eq(second.Outcome, HostOutcome.Ok, "twoCounters 跑通：" + second.Message);
  eq(second.Value.AsInt(), expected[1], "两次 makeCounter 各有各的环境（1 * 10 + 1）");
});

check("提升：调用写在函数声明之前、`var` 读在声明之前——与 Node 一致", () => {
  const source = [
    "var seen = probe();",
    "function probe() { if (counter) { return 1; } return 2; }",
    "var counter = 5;",
    "function answer() { return seen + counter; }",
  ].join("\n");
  const expected = new Function(source + "\nreturn [seen, counter, answer()];")();
  const { module, host } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);
  const result = host.CallExport(module.ExportOf("answer"), []);
  eq(result.Outcome, HostOutcome.Ok, "answer 跑通：" + result.Message);
  eq(expected[0], 2, "Node 那边：probe 看到的是 undefined → 返回 2（这一条是前提）");
  eq(expected[2], 7, "Node 那边：2 + 5 = 7（这一条是前提）");
  eq(result.Value.AsInt(), expected[2], "我们这边也是 7：函数提升 + var 提升都对");
});

check("for(;;)：初始化 / 条件 / 更新三段跳转，与 Node 一致", () => {
  const source = [
    "function sum(n) {",
    "  let total = 0;",
    "  for (let i = 0; i < n; i = i + 1) {",
    "    total = total + i;",
    "  }",
    "  return total;",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn [sum(0), sum(5), sum(10)];")();
  const { module, host } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);
  const index = module.ExportOf("sum");
  eq(host.CallExport(index, [Value.FromInt(0)]).Value.AsInt(), expected[0], "sum(0)");
  eq(host.CallExport(index, [Value.FromInt(5)]).Value.AsInt(), expected[1], "sum(5)");
  eq(host.CallExport(index, [Value.FromInt(10)]).Value.AsInt(), expected[2], "sum(10)");
});

check("for..of：走迭代协议（数组），与 Node 一致", () => {
  const source = [
    "function total(values) {",
    "  let sum = 0;",
    "  for (const v of values) {",
    "    sum = sum + v;",
    "  }",
    "  return sum;",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn [total([]), total([1, 2, 3]), total([7])];")();
  const { module, host, machine, table } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);
  const index = module.ExportOf("total");

  const makeArray = (items) => {
    const protos = InitProtos(machine.Room(), table);
    const array = NewPlainArray(machine.Room(), table, protos);
    for (let i = 0; i < items.length; i++) {
      SetIndex(machine.Room(), table, array, Value.FromInt(i), Value.FromInt(items[i]));
    }
    return array;
  };
  const empty = makeArray([]);
  const three = makeArray([1, 2, 3]);
  const one = makeArray([7]);
  // **宿主拿住的必须 retain**：这些数组在进帧之前不受任何根保护（host-abi 的借用规矩）
  machine.Retain(empty);
  machine.Retain(three);
  machine.Retain(one);
  eq(host.CallExport(index, [empty]).Value.AsInt(), expected[0], "total([])");
  eq(host.CallExport(index, [three]).Value.AsInt(), expected[1], "total([1, 2, 3])");
  eq(host.CallExport(index, [one]).Value.AsInt(), expected[2], "total([7])");
  machine.Release(empty.Ref);
  machine.Release(three.Ref);
  machine.Release(one.Ref);
});

check("try/catch/finally：三条路（正常 / 接住 / 没接住也跑完再重抛）与 Node 一致", () => {
  const source = [
    "var reached = 0;",
    "function pick(n) {",
    "  try {",
    "    if (n < 0) { throw \"negative\"; }",
    "    return 1;",
    "  } catch (e) {",
    "    return 2;",
    "  }",
    "}",
    "function withFinally(n) {",
    "  let log = 0;",
    "  try {",
    "    log = 1;",
    "    if (n === 0) { throw \"boom\"; }",
    "    log = 2;",
    "  } catch (e) {",
    "    log = log + 10;",
    "  } finally {",
    "    log = log + 100;",
    "  }",
    "  return log;",
    "}",
    "function escape() {",
    "  try {",
    "    throw \"up\";",
    "  } finally {",
    "    reached = reached + 1;",
    "  }",
    "}",
    "function readReached() { return reached; }",
  ].join("\n");
  const expected = new Function(source + "\nreturn [pick(1), pick(-1), withFinally(1), withFinally(0)];")();
  const { module, host } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  const pick = module.ExportOf("pick");
  eq(host.CallExport(pick, [Value.FromInt(1)]).Value.AsInt(), expected[0], "pick(1)：正常走完");
  eq(host.CallExport(pick, [Value.FromInt(-1)]).Value.AsInt(), expected[1], "pick(-1)：被接住");
  const withFinally = module.ExportOf("withFinally");
  eq(host.CallExport(withFinally, [Value.FromInt(1)]).Value.AsInt(), expected[2], "withFinally(1)：2 + 100");
  eq(host.CallExport(withFinally, [Value.FromInt(0)]).Value.AsInt(), expected[3], "withFinally(0)：(1 + 10) + 100");

  // 没接住的那条路：异常要**穿过 finally** 冒到宿主，而 finally 确实跑过
  const thrown = host.CallExport(module.ExportOf("escape"), []);
  eq(thrown.Outcome, HostOutcome.ScriptThrew, "escape()：异常冒到宿主");
  eq(hostStringOf(host.Machine.Table, thrown.Error), "up", "异常值原样带出来");
  eq(host.CallExport(module.ExportOf("readReached"), []).Value.AsInt(), 1, "finally 在异常路径上也跑了");
});

check("?? / ?. / 复合赋值 / call_method：与 Node 一致", () => {
  const source = [
    "function pick(a, b) { return a ?? b; }",
    "function safeGet(o) { return o?.v; }",
    "function chain(o) { return o?.v.w; }",
    "function bump(x) { let n = x; n += 5; return n; }",
    "function getV() { return this.v; }",
    "function readBox(b) { return b.get(); }",
  ].join("\n");
  const nodeGetV = new Function(source + "\nreturn getV;")();
  const nodeBox = { v: 7, get: nodeGetV };
  const expected = new Function(source + "\nreturn [pick(null, 3), pick(1, 3), bump(4), readBox(arguments[0])];")(nodeBox);
  const { module, host, machine, table } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  // 宿主这一侧建对象：普通对象 + 字符串键的属性
  const makeObject = () => NewPlainObject(machine.Room(), table, InitProtos(machine.Room(), table));
  const withV = makeObject();
  setProp(machine, table, withV, propKey(table, "v"), Value.FromInt(7));
  machine.Retain(withV);

  const pick = module.ExportOf("pick");
  eq(host.CallExport(pick, [Value.Null(), Value.FromInt(3)]).Value.AsInt(), expected[0], "null ?? 3");
  eq(host.CallExport(pick, [Value.FromInt(1), Value.FromInt(3)]).Value.AsInt(), expected[1], "1 ?? 3（右边不算）");

  const safeGet = module.ExportOf("safeGet");
  eq(host.CallExport(safeGet, [Value.Null()]).Value.IsUndefined(), true, "null?.v → undefined");
  eq(host.CallExport(safeGet, [withV]).Value.AsInt(), 7, "{v:7}?.v → 7");

  const chain = module.ExportOf("chain");
  eq(host.CallExport(chain, [Value.Null()]).Value.IsUndefined(), true, "null?.v.w → undefined（整条链短路）");
  eq(host.CallExport(chain, [withV]).Value.IsUndefined(), true, "7.w → undefined（不崩）");

  eq(host.CallExport(module.ExportOf("bump"), [Value.FromInt(4)]).Value.AsInt(), expected[2], "4 += 5");

  // **call_method**：宿主把脚本里的闭包挂到对象上，脚本再 obj.get() 调它
  const getV = GetIndex(table, host.Exports, Value.FromInt(module.ExportOf("getV")));
  const box = makeObject();
  setProp(machine, table, box, propKey(table, "v"), Value.FromInt(7));
  setProp(machine, table, box, propKey(table, "get"), getV);
  machine.Retain(box);
  const boxed = host.CallExport(module.ExportOf("readBox"), [box]);
  eq(boxed.Outcome, HostOutcome.Ok, "readBox 跑通：" + boxed.Message);
  eq(boxed.Value.AsInt(), expected[3], "b.get() → 7（`this` 落在接收者上）");
  machine.Release(withV.Ref);
  machine.Release(box.Ref);
});

check("switch / break / continue：与 Node 一致", () => {
  const source = [
    "function classify(n) {",
    "  switch (n) {",
    "    case 1: return \"one\";",
    "    case 2: return \"two\";",
    "    default: return \"many\";",
    "  }",
    "}",
    "function fallThrough(n) {",
    "  let text = \">\";",
    "  switch (n) {",
    "    case 1: text = text + \"a\";",
    "    case 2: text = text + \"b\"; break;",
    "    case 3: text = \"c\"; break;",
    "    default: text = \"d\";",
    "  }",
    "  return text;",
    "}",
    "function sumSkip(n) {",
    "  let total = 0;",
    "  for (let i = 0; i < n; i = i + 1) {",
    "    if (i === 2) { continue; }",
    "    if (i === 4) { break; }",
    "    total = total + i;",
    "  }",
    "  return total;",
    "}",
    "function countUp(n) {",
    "  let i = 0;",
    "  while (i < n) {",
    "    if (i === 3) { break; }",
    "    i = i + 1;",
    "  }",
    "  return i;",
    "}",
  ].join("\n");
  const expected = new Function(
    source + "\nreturn [sumSkip(10), countUp(10), fallThrough(1).length + fallThrough(2).length, classify(1).length, classify(9).length];",
  )();
  const { module, host, table } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  const sumSkip = module.ExportOf("sumSkip");
  eq(host.CallExport(sumSkip, [Value.FromInt(10)]).Value.AsInt(), expected[0], "continue 跳过 2、break 停在 4 → 0+1+3");
  const countUp = module.ExportOf("countUp");
  eq(host.CallExport(countUp, [Value.FromInt(10)]).Value.AsInt(), expected[1], "while 里的 break");

  const fallThrough = module.ExportOf("fallThrough");
  eq(hostStringOf(table, host.CallExport(fallThrough, [Value.FromInt(1)]).Value), ">ab", "case 1 落穿到 case 2");
  eq(hostStringOf(table, host.CallExport(fallThrough, [Value.FromInt(2)]).Value), ">b", "case 2");
  eq(hostStringOf(table, host.CallExport(fallThrough, [Value.FromInt(3)]).Value), "c", "case 3");
  eq(hostStringOf(table, host.CallExport(fallThrough, [Value.FromInt(9)]).Value), "d", "default");

  const classify = module.ExportOf("classify");
  eq(hostStringOf(table, host.CallExport(classify, [Value.FromInt(1)]).Value), "one", "case 1 直接 return");
  eq(hostStringOf(table, host.CallExport(classify, [Value.FromInt(9)]).Value), "many", "default 也 return");
});

check("对象 / 数组字面量与箭头函数、函数表达式：与 Node 一致", () => {
  const source = [
    "function apply(f, x) { return f(x); }",
    "function arrayWork() {",
    "  const a = [1, 2, 3];",
    "  a[3] = 4;",
    "  a[0] = a[0] + 10;",
    "  return a[0] + a[3] + a[2];",
    "}",
    "function withHole() { const a = [1, , 3]; return a[2]; }",
    "function objectWork() { const o = { a: 1, \"b c\": 2, d: 3 }; return o.a + o.d; }",
    "function shorthand() { const x = 5; const o = { x }; return o.x; }",
    "function computed() { const k = \"k\"; const o = { [k]: 9 }; return o.k; }",
    "function method() { const o = { v: 7, get() { return this.v; } }; return o.get(); }",
    "function arrowCallback() { return apply(n => n + 1, 4); }",
    "function functionCallback() { return apply(function (n) { return n * 2; }, 21); }",
  ].join("\n");
  const expected = new Function(source + "\nreturn [arrayWork(), withHole(), objectWork(), shorthand(),"
    + " computed(), method(), arrowCallback(), functionCallback()];")();
  const { module, host } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  const call = (name) => host.CallExport(module.ExportOf(name), []);
  eq(call("arrayWork").Value.AsInt(), expected[0], "[1,2,3] 改两格 → 11 + 4 + 3");
  eq(call("withHole").Value.AsInt(), expected[1], "[1, , 3] 的洞不改变后面的下标");
  eq(call("objectWork").Value.AsInt(), expected[2], "对象三种键");
  eq(call("shorthand").Value.AsInt(), expected[3], "{ x } 简写");
  eq(call("computed").Value.AsInt(), expected[4], "{ [k]: 9 } 计算键");
  eq(call("method").Value.AsInt(), expected[5], "对象方法里的 `this` 是接收者");
  eq(call("arrowCallback").Value.AsInt(), expected[6], "箭头函数当回调");
  eq(call("functionCallback").Value.AsInt(), expected[7], "函数表达式当回调");
});

check("解构与字符串拼接转换：与 Node 一致", () => {
  const source = [
    "function objectPattern() {",
    "  const o = { a: 1, b: 2 };",
    "  const { a, b: c } = o;",
    "  return a + c;",
    "}",
    "function arrayPattern() {",
    "  const arr = [10, 20, 30];",
    "  const [x, , z] = arr;",
    "  return x + z;",
    "}",
    "function nestedPattern() {",
    "  const o = { p: { q: 5 }, list: [7, 8] };",
    "  const { p: { q }, list: [first] } = o;",
    "  return q + first;",
    "}",
    "function outerCapture() {",
    "  const { v } = { v: 41 };",
    "  function inner() { return v + 1; }",
    "  return inner();",
    "}",
    "function label(n) { return \"count: \" + n; }",
    "function label2(n) { return n + \"!\"; }",
    "function label3(b) { return \"ok=\" + b; }",
  ].join("\n");
  const expected = new Function(source + "\nreturn [objectPattern(), arrayPattern(), nestedPattern(),"
    + " outerCapture(), label(7), label2(7), label3(true), label3(null)];")();
  const { module, host, table } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  const call = (name) => host.CallExport(module.ExportOf(name), []);
  eq(call("objectPattern").Value.AsInt(), expected[0], "对象解构 + 改名");
  eq(call("arrayPattern").Value.AsInt(), expected[1], "数组解构 + 跳位");
  eq(call("nestedPattern").Value.AsInt(), expected[2], "嵌套解构");
  eq(call("outerCapture").Value.AsInt(), expected[3], "解构出来的变量被内层函数捕获");

  const seven = [Value.FromInt(7)];
  eq(hostStringOf(table, host.CallExport(module.ExportOf("label"), seven).Value), expected[4], "字符串 + 数字（ToString）");
  eq(hostStringOf(table, host.CallExport(module.ExportOf("label2"), seven).Value), expected[5], "数字 + 字符串");
  eq(hostStringOf(table, host.CallExport(module.ExportOf("label3"), [Value.FromBool(true)]).Value), expected[6], "字符串 + 布尔");
  eq(hostStringOf(table, host.CallExport(module.ExportOf("label3"), [Value.Null()]).Value), expected[7], "字符串 + null");
});

check("new / typeof / in：与 Node 一致", () => {
  const source = [
    "function Point(x) {",
    "  this.x = x;",
    "  this.get = function () { return this.x; };",
    "}",
    "function makePoint(v) { const p = new Point(v); return p.x; }",
    "function callOnNew(v) { const p = new Point(v); return p.get(); }",
    "function kindOf(x) { return typeof x; }",
    "function hasKey(o, k) { return k in o; }",
  ].join("\n");
  const expected = new Function(source + "\nreturn [makePoint(7), callOnNew(9), kindOf(1), kindOf('s'), kindOf(null),"
    + " kindOf(true), hasKey({v: 1}, 'v'), hasKey({v: 1}, 'q')];")();
  const { module, host, machine, table } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  eq(host.CallExport(module.ExportOf("makePoint"), [Value.FromInt(7)]).Value.AsInt(), expected[0], "new Point(7).x");
  eq(host.CallExport(module.ExportOf("callOnNew"), [Value.FromInt(9)]).Value.AsInt(), expected[1], "p.get() 在 `new` 出来的对象上");

  const kindOf = module.ExportOf("kindOf");
  eq(hostStringOf(table, host.CallExport(kindOf, [Value.FromInt(1)]).Value), expected[2], "typeof 1");
  eq(hostStringOf(table, host.CallExport(kindOf, [Value.FromString(table.CreateString(units("s")))]).Value),
    expected[3], "typeof \"s\"");
  eq(hostStringOf(table, host.CallExport(kindOf, [Value.Null()]).Value), expected[4], "typeof null（历史包袱：object）");
  eq(hostStringOf(table, host.CallExport(kindOf, [Value.FromBool(true)]).Value), expected[5], "typeof true");

  const object = NewPlainObject(machine.Room(), table, InitProtos(machine.Room(), table));
  setProp(machine, table, object, propKey(table, "v"), Value.FromInt(1));
  machine.Retain(object);
  const hasKey = module.ExportOf("hasKey");
  const keyV = Value.FromString(table.CreateString(units("v")));
  const keyQ = Value.FromString(table.CreateString(units("q")));
  eq(host.CallExport(hasKey, [object, keyV]).Value.AsBool(), expected[6], "\"v\" in {v:1}");
  eq(host.CallExport(hasKey, [object, keyQ]).Value.AsBool(), expected[7], "\"q\" in {v:1}");
  machine.Release(object.Ref);
});

check("for (let …) 每次迭代新建绑定：闭包捕到各自那一轮的 i（与 Node 一致）", () => {
  const source = [
    "function make(n) {",
    "  let f = null;",
    "  for (let i = 0; i < n; i = i + 1) {",
    "    if (i === 0) { f = function () { return i; }; }",
    "  }",
    "  return f;",
    "}",
    "function firstOf(n) { return make(n)(); }",
    "function make2(n) {",
    "  let total = 0;",
    "  for (let i = 0; i < n; i = i + 1) {",
    "    const bump = function (k) { return k + i; };",
    "    total = total + bump(10);",
    "  }",
    "  return total;",
    "}",
    "function secondOf(n) { return make2(n); }",
    "function plain(n) {",
    "  let t = 0;",
    "  for (let i = 0; i < n; i = i + 1) { t = t + i; }",
    "  return t;",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn [firstOf(3), secondOf(3), plain(3), plain(0)];")();
  eq(expected[0], 0, "Node 那边：第一轮那个闭包看到 0（这一条是前提）");
  eq(expected[1], 33, "Node 那边：(10+0)+(10+1)+(10+2) = 33（这一条是前提）");

  const { module, host } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);
  eq(host.CallExport(module.ExportOf("firstOf"), [Value.FromInt(3)]).Value.AsInt(), expected[0],
    "第一轮的闭包捕到 0（共享一格的话会是 3）");
  eq(host.CallExport(module.ExportOf("secondOf"), [Value.FromInt(3)]).Value.AsInt(), expected[1],
    "每轮各看各的 i（共享一格的话会是 39）");
  eq(host.CallExport(module.ExportOf("plain"), [Value.FromInt(3)]).Value.AsInt(), expected[2],
    "体里没有函数时走槽（快路径），结果一样");
  eq(host.CallExport(module.ExportOf("plain"), [Value.FromInt(0)]).Value.AsInt(), expected[3],
    "零次迭代");
});

check("箭头函数的 this 取外层，函数表达式取接收者：与 Node 一致", () => {
  const source = [
    "function outer() {",
    "  const arrow = () => this.tag;",
    "  const other = { tag: 'wrong', get: arrow };",
    "  return other.get();",
    "}",
    "function outer2() {",
    "  const fn = function () { return this.tag; };",
    "  const other = { tag: 'wrong', get: fn };",
    "  return other.get();",
    "}",
    "function run() {",
    "  const box = { tag: 'right', run: outer, run2: outer2 };",
    "  return box.run();",
    "}",
    "function run2() {",
    "  const box = { tag: 'right', run: outer, run2: outer2 };",
    "  return box.run2();",
    "}",
    "function direct() {",
    "  const arrow = () => this.tag;",
    "  return arrow();",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn [run(), run2()];")();
  eq(expected[0], "right", "Node 那边：箭头看外层 this → right（这一条是前提）");
  eq(expected[1], "wrong", "Node 那边：函数表达式看接收者 → wrong（这一条是前提）");

  const { module, host, table } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);
  eq(hostStringOf(table, host.CallExport(module.ExportOf("run"), []).Value), expected[0],
    "挂在 other 上的箭头仍然看外层的 box");
  eq(hostStringOf(table, host.CallExport(module.ExportOf("run2"), []).Value), expected[1],
    "同一位置换成函数表达式就看接收者");
});

check("标准库第一块：Array 原型方法（push/pop/join/indexOf/slice）与 Node 一致", () => {
  const source = [
    "function pushPop() {",
    "  const a = [1, 2];",
    "  const n = a.push(3);",
    "  return n * 10 + a.pop();",
    "}",
    "function joined() { const a = ['x', 'y', 'z']; return a.join('-'); }",
    "function found() { const a = [5, 6, 7]; return a.indexOf(6) * 10 + a.indexOf(9); }",
    "function sliced() { const a = [1, 2, 3, 4]; return a.slice(1, 3).join(','); }",
    "function grown() {",
    "  const a = [];",
    "  for (let i = 0; i < 3; i = i + 1) { a.push(i); }",
    "  return a.join(',');",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn [pushPop(), joined(), found(), sliced(), grown()];")();
  const { module, host, table } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  // **装库**：宿主显式把内建装到原型上（`runtime/` 不认识 `typescript-exec/`）
  InstallArray(host.Machine, host.Machine.Protos);
  // 调用通道：**按能力号分派**——一个宿主函数服务全部内建
  host.InstallHost((target, self, args, room) => {
    const id = table.Get(target.Ref).AsHost().CapabilityId;
    return InvokeArray(room, table, id, self, args);
  });

  const call = (name, args) => host.CallExport(module.ExportOf(name), args || []);
  eq(call("pushPop").Value.AsInt(), expected[0], "push 返回新长度、pop 取走末元素");
  eq(hostStringOf(table, call("joined").Value), expected[1], "join('-')");
  eq(call("found").Value.AsInt(), expected[2], "indexOf：找到给下标、找不到给 -1");
  eq(hostStringOf(table, call("sliced").Value), expected[3], "slice(1, 3) 之后 join(',')");
  eq(hostStringOf(table, call("grown").Value), expected[4], "循环里 push 三次");
});

check("标准库第二块：String 原型方法（charAt/charCodeAt/indexOf/slice）与 Node 一致", () => {
  const source = [
    "function at(s) { return s.charAt(1); }",
    "function code(s) { return s.charCodeAt(0); }",
    "function where(s) { return s.indexOf('cd') * 10 + s.indexOf('zz'); }",
    "function cut(s) { return s.slice(1, 3); }",
    "function chained(s) { return s.slice(1).charAt(0); }",
    "function lengthOf(s) { return s.length; }",
  ].join("\n");
  const nodeAt = new Function(source + "\nreturn [at('abc'), code('abc'), where('abcde'), cut('abcde'),"
    + " chained('xyz'), lengthOf('hello')];")();
  const { module, host, table } = lowerAndLoad(source);
  const evaluated = host.Evaluate([]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  InstallBuiltins(host.Machine, host.Machine.Protos);
  host.InstallHost((target, self, args, room) => {
    const id = table.Get(target.Ref).AsHost().CapabilityId;
    return InvokeBuiltin(room, table, id, self, args);
  });

  const call = (name, text) => host.CallExport(module.ExportOf(name),
    [Value.FromString(table.CreateString(units(text)))]);
  eq(hostStringOf(table, call("at", "abc").Value), nodeAt[0], "charAt(1)");
  eq(call("code", "abc").Value.AsInt(), nodeAt[1], "charCodeAt(0)");
  eq(call("where", "abcde").Value.AsInt(), nodeAt[2], "indexOf：命中给下标、没有给 -1");
  eq(hostStringOf(table, call("cut", "abcde").Value), nodeAt[3], "slice(1, 3)");
  eq(hostStringOf(table, call("chained", "xyz").Value), nodeAt[4], "slice 之后再 charAt（原始值接收者连着用）");
  eq(call("lengthOf", "hello").Value.AsInt(), nodeAt[5], "length 仍是结构属性");
});

check("全局名 Math / console：与 Node 一致，日志交给宿主给的回调", () => {
  const source = [
    "function floored(n) { return Math.floor(n / 2); }",
    "function biggest(a, b) { return Math.max(a, b); }",
    "function distance(a) { return Math.abs(0 - a); }",
    "function talk(n) { console.log('n=' + n); console.log('done'); return 0; }",
  ].join("\n");
  const nodeMath = new Function(source + "\nreturn [floored(7), biggest(3, 9), distance(5)];")();
  const lines = [];
  const { module, host, table } = lowerAndLoad(source, GlobalNames());
  const evaluated = host.Evaluate([BuildGlobals(host.Machine, host.Machine.Protos, (text) => lines.push(text))]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  InstallBuiltins(host.Machine, host.Machine.Protos);
  host.InstallHost((target, self, args, room) => {
    const id = table.Get(target.Ref).AsHost().CapabilityId;
    return InvokeWithSink(room, table, host.Machine.Protos, id, self, args, (text) => lines.push(text));
  });

  const call = (name, args) => host.CallExport(module.ExportOf(name), args);
  eq(call("floored", [Value.FromInt(7)]).Value.AsInt(), nodeMath[0], "Math.floor(7 / 2)");
  eq(call("biggest", [Value.FromInt(3), Value.FromInt(9)]).Value.AsInt(), nodeMath[1], "Math.max(3, 9)");
  eq(call("distance", [Value.FromInt(5)]).Value.AsInt(), nodeMath[2], "Math.abs(0 - 5)");

  eq(call("talk", [Value.FromInt(7)]).Outcome, HostOutcome.Ok, "console.log 之后照常返回");
  eq(lines.length, 2, "两行日志：");
  eq(lines[0], "n=7", "第一行（字符串 + 数字走了 ToString）");
  eq(lines[1], "done", "第二行");
});

check("Object.keys 与 JSON.stringify：与 Node 一致（含「没有 JSON 形态」的三种规矩）", () => {
  const source = [
    "function keys(o) { return Object.keys(o).join(','); }",
    "function simple() { return JSON.stringify({ a: 1, b: [1, 2], c: { d: true } }); }",
    "function scalars() { return JSON.stringify(null) + ' ' + JSON.stringify(true); }",
    "function text() { return JSON.stringify('s'); }",
    "function omitted() { return JSON.stringify({ f: function () {}, a: 1 }); }",
    "function inArray() { return JSON.stringify([function () {}, 2]); }",
    "function noForm() { return JSON.stringify(undefined); }",
    "function fractional() { return JSON.stringify(7 / 2); }",
  ].join("\n");
  const nodeAt = new Function(source + "\nreturn [keys({x: 1, y: 2}), simple(), scalars(), text(), omitted(), inArray()];")();
  const { module, host, table } = lowerAndLoad(source, GlobalNames());
  const sink = () => {};
  const evaluated = host.Evaluate([BuildGlobals(host.Machine, host.Machine.Protos, sink)]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  InstallBuiltins(host.Machine, host.Machine.Protos);
  host.InstallHost((target, self, args, room) => {
    const id = table.Get(target.Ref).AsHost().CapabilityId;
    return InvokeWithSink(room, table, host.Machine.Protos, id, self, args, sink);
  });

  const call = (name, args) => host.CallExport(module.ExportOf(name), args || []);
  const obj = (() => {
    const handle = host.Machine.Table.CreateObject();
    host.Machine.Table.Get(handle).Proto = host.Machine.Protos.Object;
    return Value.FromObject(handle);
  })();
  host.Machine.Retain(obj);
  setProp(host.Machine, table, obj, propKey(table, "x"), Value.FromInt(1));
  setProp(host.Machine, table, obj, propKey(table, "y"), Value.FromInt(2));

  eq(hostStringOf(table, call("keys", [obj]).Value), nodeAt[0], "Object.keys 按自有属性的顺序");
  eq(hostStringOf(table, call("simple").Value), nodeAt[1], "对象 / 数组 / 嵌套对象");
  eq(hostStringOf(table, call("scalars").Value), nodeAt[2], "null 与 true");
  eq(hostStringOf(table, call("text").Value), nodeAt[3], "字符串带引号");
  eq(hostStringOf(table, call("omitted").Value), nodeAt[4], "对象里的函数：整个键省略");
  eq(hostStringOf(table, call("inArray").Value), nodeAt[5], "数组里的函数：变成 null（位置不能少）");
  eq(call("noForm").Value.Tag, ValueTag.Undefined, "顶层 undefined 的 JSON 形态就是 undefined 本身");

  let fractional = "";
  try {
    call("fractional");
  } catch (error) {
    fractional = String(error.message);
  }
  eq(fractional.indexOf("non-integer") >= 0, true, "非整数数值必须抛（不猜一个格式）：" + fractional);
  host.Machine.Release(obj.Ref);
});

check("生成器降级：yield / 传入值当返回值 / for..of 遍历 / 位置检查（与 Node 一致）", () => {
  const source = [
    "function* pair() { yield 1; yield 2; }",
    "function* echo() { const got = yield 10; yield got; return 'end'; }",
    "function sum() {",
    "  let total = 0;",
    "  for (const v of pair()) { total = total + v; }",
    "  return total;",
    "}",
  ].join("\n");
  const nodeAt = new Function(source
    + "\nconst g = pair(); const a = g.next(); const b = g.next(); const c = g.next();"
    + " const e = echo(); const ea = e.next(); const eb = e.next(42); const ec = e.next(0);"
    + " return [a.value, a.done, b.value, b.done, c.done, ea.value, eb.value, ec.value, ec.done, sum()];")();
  const { module, host, table } = lowerAndLoad(source);
  eq(host.Evaluate([]).Outcome, HostOutcome.Ok, "求值模块");
  const generators = module.Program.Functions.filter((info) => info.IsGenerator);
  eq(generators.length, 2, "两个生成器函数被标记出来（pair 与 empty）");
  eq(module.Program.Functions[0].IsGenerator, false, "入口不是生成器");

  let outside = "";
  try {
    lowerAndLoad("function plain() { yield 1; }");
  } catch (error) {
    outside = String(error.message);
  }
  eq(outside.indexOf("outside a generator") >= 0, true, "普通函数里的 yield 必须抛：" + outside);

  let delegated = "";
  try {
    lowerAndLoad("function* f() { yield* [1, 2]; }");
  } catch (error) {
    delegated = String(error.message);
  }
  eq(delegated.indexOf("yield*") >= 0, true, "yield* 必须抛（委托迭代还没做）：" + delegated);

  let label = "取导出";
  try {
  const pair = host.CallExport(module.ExportOf("pair"), []);
  eq(pair.Outcome, HostOutcome.Ok, "调用生成器函数");
  eq(pair.Value.Tag, ValueTag.Object, "拿到的是个对象（体没跑）");
  host.Machine.Retain(pair.Value);
  const step = (gen, sent) => host.Machine.DoIterNext(gen, sent);
  label = "pair 第 1 步";
  const first = step(pair.Value, Value.Undefined());
  eq(GetIndex(table, first, Value.FromInt(0)).AsInt(), nodeAt[0], "第一次产出 1");
  eq(GetIndex(table, first, Value.FromInt(1)).AsBool(), nodeAt[1], "还没结束");
  label = "pair 第 2 步";
  const second = step(pair.Value, Value.Undefined());
  eq(GetIndex(table, second, Value.FromInt(0)).AsInt(), nodeAt[2], "第二次产出 2");
  eq(GetIndex(table, second, Value.FromInt(1)).AsBool(), nodeAt[3], "还没结束");
  label = "pair 第 3 步";
  const third = step(pair.Value, Value.Undefined());
  eq(GetIndex(table, third, Value.FromInt(1)).AsBool(), nodeAt[4], "这次结束了");
  eq(GetIndex(table, third, Value.FromInt(0)).IsUndefined(), true, "结束后产出 undefined");

  label = "echo 调用";
  const echo = host.CallExport(module.ExportOf("echo"), []);
  eq(echo.Outcome, HostOutcome.Ok, "调用 echo 要成功（失败原因见这里）：" + echo.Message);
  host.Machine.Retain(echo.Value);
  label = "echo 第 1 步";
  const echoFirst = step(echo.Value, Value.Undefined());
  label = "echo 第 2 步";
  const sent = step(echo.Value, Value.FromInt(42));
  eq(GetIndex(table, echoFirst, Value.FromInt(0)).AsInt(), nodeAt[5], "先产出 10");
  eq(GetIndex(table, sent, Value.FromInt(0)).AsInt(), nodeAt[6], "`next(42)` 的值成了 yield 的值");
  eq(GetIndex(table, sent, Value.FromInt(1)).AsBool(), false, "还没结束");
  label = "echo 第 3 步";
  const finished = step(echo.Value, Value.FromInt(0));
  eq(hostStringOf(table, GetIndex(table, finished, Value.FromInt(0))), nodeAt[7], "`return` 的值是最后一次产出的");
  eq(GetIndex(table, finished, Value.FromInt(1)).AsBool(), nodeAt[8], "这次结束了");
  } catch (error) {
    throw new Error("在「" + label + "」处：" + String(error.message));
  }
  let iterated = "";
  let iteratedValue = 0;
  try {
    iteratedValue = host.CallExport(module.ExportOf("sum"), []).Value.AsInt();
    eq(iteratedValue, nodeAt[9], "for..of 把两次产出加起来");
  } catch (error) {
    iterated = String(error.message) + "（状态=" + host.Machine.Status
      + " 栈深=" + host.Machine.Frames.Depth() + " 步数=" + host.Machine.Steps + "）";
  }
  eq(iterated, "", "for..of 遍历生成器：" + iterated);
});

check("await：async 函数挂起在承诺上，结清后由微任务恢复（与引擎那条路一致）", () => {
  const source = [
    "async function bump(p) {",
    "  const v = await p;",
    "  return v + 1;",
    "}",
    "async function twice(p) {",
    "  const a = await p;",
    "  const b = await a;",
    "  return b;",
    "}",
  ].join("\n");
  const { module, host, table, machine } = lowerAndLoad(source);
  eq(host.Evaluate([]).Outcome, HostOutcome.Ok, "求值模块");

  const promise = Value.FromObject(table.CreatePromise(PromiseState.Pending, Value.Undefined()));
  machine.Retain(promise);
  const parked = host.CallExport(module.ExportOf("bump"), [promise]);
  eq(parked.Outcome, HostOutcome.Parked, "脚本停在 await 上，宿主被告知「在等承诺」");
  eq(machine.Frames.Depth(), 0, "帧已经挂到承诺上，不在栈上");

  machine.ResolvePromise(promise, Value.FromInt(41));
  eq(machine.Microtasks.length, 1, "恢复已经排进微任务队列");
  eq(machine.DrainMicrotasks(), true, "排空成功");
  eq(machine.Result.AsInt(), 42, "兑现值 + 1 成了这次调用的结果");
  eq(machine.Microtasks.length, 0, "队列跑干净了");

  // 两次 await：兑现值本身又是一个承诺（`await a`）
  const outer = Value.FromObject(table.CreatePromise(PromiseState.Pending, Value.Undefined()));
  machine.Retain(outer);
  const twiceResult = host.CallExport(module.ExportOf("twice"), [outer]);
  eq(twiceResult.Outcome, HostOutcome.Parked, "第一次 await 挂起");
  const inner = Value.FromObject(table.CreatePromise(PromiseState.Fulfilled, Value.FromInt(7)));
  machine.Retain(inner);
  machine.ResolvePromise(outer, inner);
  eq(machine.DrainMicrotasks(), true, "第一次恢复");
  eq(machine.DrainMicrotasks(), true, "第二次也恢复（`await` 已兑现的承诺也要让出一拍）");
  eq(machine.Result.AsInt(), 7, "两次 await 之后拿到的是最里面那个兑现值");
  machine.Release(promise.Ref);
  machine.Release(outer.Ref);
  machine.Release(inner.Ref);

  let outside = "";
  try {
    lowerAndLoad("function plain(p) { const v = await p; return v; }");
  } catch (error) {
    outside = String(error.message);
  }
  eq(outside.indexOf("outside an async") >= 0, true, "普通函数里的 await 必须抛：" + outside);
});

check("`.d.ts` 能力绑定：模块里没声明的名字按能力号调宿主（与 Node 打桩一致）", () => {
  const source = [
    "function run(n) {",
    "  print('n=' + n);",
    "  return addOne(n) + addOne(n);",
    "}",
  ].join("\n");
  // Node 那边用两个桩函数跑同一份源码：**这正是能力绑定在 JS 里的样子**
  // （名字来自环境、不来自源码）——所以这条对拍比的是「同一份源码 + 同一组能力」。
  const lines = [];
  const expected = new Function("print", "addOne",
    source + "\nreturn run(4);")((text) => lines.push(text), (n) => n + 1);
  eq(expected, 10, "Node 打桩：addOne(4) 两次");
  eq(lines[0], "n=4", "Node 打桩：先打印一行");

  const bindings = new Bindings(BuiltinBase);
  const printId = bindings.Register("print");
  const addOneId = bindings.Register("addOne");
  eq(printId, BuiltinBase, "第一个能力的号就是起始号");
  eq(bindings.Register("print"), printId, "重复登记幂等（不占两个号）");
  eq(bindings.Lookup("nope"), -1, "没登记的名字给 -1");

  const ours = [];
  const sink = (text) => ours.push(text);
  const { module, host, table } = lowerAndLoad(source, undefined, LookupOf(bindings));
  eq(host.Evaluate([]).Outcome, HostOutcome.Ok, "求值模块");
  InstallBuiltins(host.Machine, host.Machine.Protos);
  host.InstallHost((target, self, args, room) => {
    const id = table.Get(target.Ref).AsHost().CapabilityId;
    if (id === printId) {
      for (let i = 0; i < args.length; i++) sink(hostStringOf(table, args[i]));
      return Value.Undefined();
    }
    if (id === addOneId) return Value.FromInt(args[0].AsInt() + 1);
    return InvokeWithSink(room, table, host.Machine.Protos, id, self, args, sink);
  });
  eq(host.Register(printId, Value.FromRef(ValueTag.HostRef, table.CreateHostRef(printId, 1))), true,
    "把 print 注册进能力表");
  eq(host.Register(addOneId, Value.FromRef(ValueTag.HostRef, table.CreateHostRef(addOneId, 1))), true,
    "把 addOne 注册进能力表");

  eq(host.CallExport(module.ExportOf("run"), [Value.FromInt(4)]).Value.AsInt(), expected,
    "两次 addOne(4) 的和");
  eq(ours.length, 1, "宿主收到一行");
  eq(ours[0], lines[0], "那一行的内容与 Node 打桩一致");

  let unknown = "";
  try {
    lowerAndLoad("function f() { nosuch(1); }");
  } catch (error) {
    unknown = String(error.message);
  }
  eq(unknown.indexOf("not a local") >= 0, true, "没登记的名字仍然按未知名字报错：" + unknown);
});

check("模块：`import` 里的名字从环境对象取（不改名 / 改名两种）", () => {
  const source = [
    "import { twice, label as tag } from './a';",
    "export function run(n) { return twice(n) + tag('x').length; }",
  ].join("\n");
  // Node 那边：把 import 行去掉，两个名字当参数传进去——**同一份体、同一组名字**
  const body = source.replace(/^import[^\n]*\n/, "").replace("export ", "");
  const expected = new Function("twice", "tag", body + "\nreturn run(21);")(
    (n) => n * 2,
    (s) => "A:" + s,
  );
  eq(expected, 45, "Node：42 + 'A:x'.length = 45（这是前提）");

  const { module, host, table, machine } = lowerAndLoad(source);
  const built = [];
  const sink = () => {};
  host.InstallHost((target, self, args, room) => {
    const id = table.Get(target.Ref).AsHost().CapabilityId;
    if (id === 9001) return Value.FromInt(args[0].AsInt() * 2);
    if (id === 9002) {
      const text = "A:" + hostStringOf(table, args[0]);
      if (!room(text.length * 2 + 16)) throw new Error("out of room");
      return Value.FromString(table.CreateString(units(text)));
    }
    return InvokeWithSink(room, table, host.Machine.Protos, id, self, args, sink);
  });

  const env = NewPlainObject(machine.Room(), table, machine.Protos);
  machine.Retain(env);
  setProp(machine, table, env, propKey(table, "twice"),
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(9001, 0)));
  setProp(machine, table, env, propKey(table, "tag"),
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(9002, 0)));
  built.push(env);

  eq(host.Evaluate([env]).Outcome, HostOutcome.Ok,
    "求值：导入的两个名字在源码里没有声明，值从环境对象取");
  eq(host.CallExport(module.ExportOf("run"), [Value.FromInt(21)]).Value.AsInt(), expected,
    "跨文件的调用（`twice` 没改名、`label as tag` 用了本地名）");
  machine.Release(env.Ref);

  let namespace = "";
  try {
    lowerAndLoad("import * as ns from './a';");
  } catch (error) {
    namespace = String(error.message);
  }
  eq(namespace.indexOf("namespace object") >= 0, true, "`import * as ns` 必须抛：" + namespace);
});

check("for..in：遍历自有键（拼出来就是 Object.keys + 迭代协议），与 Node 一致", () => {
  const source = [
    "function keysOf(o) {",
    "  let out = ',';",
    "  for (const k in o) { out = out + k; }",
    "  return out;",
    "}",
    "function countKeys(o) {",
    "  let n = 0;",
    "  for (const k in o) { n = n + 1; }",
    "  return n;",
    "}",
    "function onLiteral() { return keysOf({ x: 1, y: 2, z: 3 }); }",
    "function onEmpty() { return countKeys({}); }",
  ].join("\n");
  const expected = new Function(source
    + "\nreturn [keysOf({ x: 1, y: 2, z: 3 }), countKeys({ x: 1, y: 2, z: 3 }), onLiteral(), onEmpty()];")();
  eq(expected[0], ",xyz", "Node：对象字面量的键按书写顺序（这是前提）");

  const { module, host, table } = lowerAndLoad(source, GlobalNames());
  eq(host.Evaluate([BuildGlobals(host.Machine, host.Machine.Protos, () => {})]).Outcome,
    HostOutcome.Ok, "求值模块");
  InstallBuiltins(host.Machine, host.Machine.Protos);
  host.InstallHost((target, self, args, room) => InvokeWithSink(
    room, table, host.Machine.Protos, table.Get(target.Ref).AsHost().CapabilityId, self, args, () => {}));

  const call = (name, args) => host.CallExport(module.ExportOf(name), args || []);
  eq(hostStringOf(table, call("onLiteral").Value), expected[2], "脚本里的对象字面量：键顺序一致");
  eq(call("onEmpty").Value.AsInt(), expected[3], "空对象：一次都不跑");

  const obj = NewPlainObject(host.Machine.Room(), table, host.Machine.Protos);
  host.Machine.Retain(obj);
  setProp(host.Machine, table, obj, propKey(table, "x"), Value.FromInt(1));
  setProp(host.Machine, table, obj, propKey(table, "y"), Value.FromInt(2));
  setProp(host.Machine, table, obj, propKey(table, "z"), Value.FromInt(3));
  eq(hostStringOf(table, call("keysOf", [obj]).Value), expected[0], "宿主造的对象：同上");
  eq(call("countKeys", [obj]).Value.AsInt(), expected[1], "数键的个数");
  host.Machine.Release(obj.Ref);

  let noGlobal = "";
  try {
    lowerAndLoad("function f(o) { for (const k in o) { } }");
  } catch (error) {
    noGlobal = String(error.message);
  }
  eq(noGlobal.indexOf("Object") >= 0, true, "没声明 Object 全局名时要明确报出来：" + noGlobal);
});

check("一元运算符与空字符串：投影分不出来的，一律抛（不静默给近似值）", () => {
  let unary = "";
  try { new Lowering().LowerModule(parseTsShape("let y = -1;"), testIds); } catch (error) { unary = String(error.message); }
  ok(unary.indexOf("unary") >= 0, "一元运算符要抛：" + unary);

  // 空字符串字面量的 text 是**带引号的原文**（`""`），与「值就是两个引号」分不开
  let empty = "";
  try { new Lowering().LowerModule(parseTsShape("let s = \"\";"), testIds); } catch (error) { empty = String(error.message); }
  ok(empty.indexOf("empty string literal") >= 0, "空字符串要抛：" + empty);
});

console.log("");
console.log(`值模型 / 堆 / 回收器 / IR / 装载验证 / 执行器 / 属性 / this / 访问器 / 生成器 / 承诺 / 宿主 / P0雏形：${passed} 条通过，${failed} 条失败`);
process.exitCode = failed === 0 ? 0 : 1;
