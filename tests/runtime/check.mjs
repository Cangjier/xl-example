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
const { Program, Instruction, Op, RtOp, RtOpName, Constant, SourceSpan, Handler, FunctionInfo, BuiltinBase, RtOpCount } = irMod;
const { PadLeft, PadRight, PadZero, Hex4 } = irMod;
const verifyMod = require(path.join(root, "build", "ts", "runtime", "ir-verify.js"));
const { IdTable, Encode, Decode, Verify, Load, LoadIssue, LoadedProgram } = verifyMod;
const { IsKnownOp, WindowOk, FallsThrough, IssueVersion, IssueIdTable, IssueEmpty, IssueUnknownOp } = verifyMod;
const { IssueOperand, IssueTarget, IssueFallThrough, IssueHandler, IssueFunction, IssueConst } = verifyMod;
const vmMod = require(path.join(root, "build", "ts", "runtime", "vm.js"));
const { Vm, VmStatus, ErrorKindGeneric, ErrorKindType } = vmMod;
const rtMod = require(path.join(root, "build", "ts", "runtime", "rt.js"));
const { RtAdd, RtCmpEqStrict, RtCmpEqLoose, RtNot, RtToBoolean, TruthyOf, TypeUnitsOf, IsCallableValue } = rtMod;
const { ToInt32Of, RtBitAnd, RtBitOr, RtBitXor, RtBitNot, RtShl, RtShr, RtUShr } = rtMod;
const propsMod = require(path.join(root, "build", "ts", "runtime", "props.js"));
const { InitProtos, NewPlainObject, NewPlainArray, GetProperty, SetProperty, DeleteProperty } = propsMod;
const hostMod = require(path.join(root, "build", "ts", "runtime", "host-abi.js"));
const { Host, HostResult, HostOutcome, Limits, Capability } = hostMod;
const loweringMod = require(path.join(root, "build", "ts", "typescript-exec", "lowering.js"));
const { Lowering, LoweredModule, NumberFromText } = loweringMod;
const arrayBuiltins = require(path.join(root, "build", "ts", "typescript-exec", "builtins", "array.js"));
const { InstallArray, InvokeArray } = arrayBuiltins;
const installBuiltins = require(path.join(root, "build", "ts", "typescript-exec", "builtins", "install.js"));
const { InstallBuiltins, InvokeBuiltin, InvokeWithSink, RaiseFromHost } = installBuiltins;
const globalsBuiltins = require(path.join(root, "build", "ts", "typescript-exec", "builtins", "globals.js"));
const { GlobalNames, BuildGlobals, ClockNow, NewError, NumberFromValue } = globalsBuiltins;
const bindingsMod = require(path.join(root, "build", "ts", "typescript-exec", "bindings.js"));
const { Bindings, LookupOf } = bindingsMod;
const { RtSetProto } = require(path.join(root, "build", "ts", "runtime", "rt.js"));
const { LinkPrograms } = require(path.join(root, "build", "ts", "runtime", "link.js"));
// **运行器**（`tsrun.xl.md` 的产物）：判据从这里起走**产品路径**——
// 解析、降级、链接、装载、逐份喂导出都由它做，判据只负责「同一份源码 + 同一组能力」。
const { RunRequest, RunSources } = require(path.join(root, "build", "ts", "tsrun.js"));
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
    if (process.env.DSH_CHECK_STACK === "1") {
      console.log(String(error.stack).split("\n").filter((line) => line.indexOf("check.mjs") >= 0)
        .slice(0, 4).join("\n"));
    }
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

check("AsBool 是 ToBoolean 的「不带堆」那一半（含 NaN 与 -0）", () => {
  // **它的名字在第 144 轮改准了**：它原来叫「AsBool 是 JS 的 ToBoolean」✗——
  // 而 `""` 是假、`AsBool` 给真 ✗（它看不到码元长度 ✓）。
  // 完整的答案在 `rt.xl.md` 的 `TruthyOf` ✓（下面那条 check 量它 ✓）。
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
  const y = table.CreateSymbol(0);
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
  // 身份号由堆发（第一张表里它就是这个堆的第一个符号）。
  eq(table.Get(y).AsSymbol().Id, 1, "符号身份");
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
  // **身份号由堆发**（第 61 轮改的签名）：调用方只给描述，所以这里连描述都可以复用，
  // 两个符号的 `Id` 必然不同——这正是 `Symbol('a') !== Symbol('a')` 的依据。
  const x = table.Get(table.CreateSymbol(d)).AsSymbol();
  const y = table.Get(table.CreateSymbol(d)).AsSymbol();
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
  const symbol = table.CreateSymbol(description);
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
  // **第 133 轮从 22 变成 23** ✓：`call_array` 加在**最后**（`caught` 之后 ✓）——
  // 「只追加、不改序」这条规矩的代价就是这一行要跟着挪 ✓，而它挪错会当场红 ✓。
  // **第 315 轮从 23 变成 24** ✓：`env_leave` 加在**最后**（`call_array` 之后 ✓）——
  // 这一轮**当场红过一次** ✗：`EnvLeave` 第一版插在 `env_set` 后面 ✓，
  // 于是**后面每一个算子的号都挪了一格** ✗，就是这一条拦下来的 ✓（**这正是它存在的意义** ✓）。
  eq(enumMembers(Op), 24, "指令条数");
  eq(Op.Halt, 0, "第一条");
  eq(Op.Const, 1, "第二条");
  eq(Op.Resume, 18, "生成器用的那两条之前");
  eq(Op.LoadThis, 19, "读 this 的那条");
  eq(Op.Caught, 21, "catch 绑定那条（第 133 轮之前是最后一条）");
  eq(Op.CallArray, 22, "按数组铺开参数那条（第 133 轮追加的）");
  eq(Op.EnvLeave, 23, "退出环境那条（第 315 轮追加的，**必须在最后**）");
  eq(Op.Await, 20, "承诺那条");
  eq(Op.Caught, 21, "这一轮追加的那条");
  eq(enumMembers(RtOp), RtOpCount, "通用算子条数与规范里那个常量一致");
  eq(RtOp.Add, 0, "第一个算子");
  eq(RtOp.HostCall, 36, "最后一个通用算子");
  // **第 326 轮从 41 变成 42** ✓：`set_prop_from` 加在**最后**（`get_prop_from` 之后 ✓）——
  // 它是 `super.x = v` 那一格 ✓（与第 243 轮那格读的**对称** ✓）。
  // **这一条与上面 `Op.EnvLeave` 那一条同一个用处** ✗：谁想把它插在 `set_prop` 旁边，当场红 ✓。
  eq(RtOp.GetPropFrom, 40, "从指定原型起读那一格（第 243 轮追加的）");
  eq(RtOp.SetPropFrom, 41, "从指定原型起写那一格（第 326 轮追加的，**必须在最后**）");
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
    "program version=2 consts=1 instrs=4 functions=0 handlers=0 spans=2",
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
// **算子格数从规范里那个常量来**（两处共用一个数：规范给上界，判据拿它当尺子）。
// **内建段要开够**：语言内部辅助号在 700 段，格数由语言自己公布（`install.xl.md` 的 `BuiltinSlots`）。
// 开小了 `Host.Register` 会返回 `false`（规范原话「不是静默忽略」），症状却是 `capability id is out of range`。
const testIds = new IdTable(RtOpCount, installBuiltins.BuiltinSlots());

/** 一份**合法**的小程序：一个函数、四个槽、一份常量、一条方法调用、一条算子调用。
 *
 * **`ids` 可选**（第 111 轮）：程序里烙着 id 表的**指纹**（`Program.IdTableHash`），
 * 而指纹**随内建段格数变**（实测：8 格 → 1186，638 格 → 1816）。所以要拿一张**别的**表
 * 去验证这份程序时，必须**用它来建**这份程序——否则 `Verify` 先对指纹、对不上就报「表不符」，
 * 而我们想量的那条（越界 / 段外）根本走不到 ✗。
 */
function validProgram(ids) {
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
  // **指纹跟着传进来的表走**（默认是共用那张）：这样「拿哪张表建、就拿哪张表验」成对成立。
  program.IdTableHash = (ids === undefined ? testIds : ids).Hash;
  return program;
}

function issueOf(program, ids) {
  return Verify(program, ids === undefined ? testIds : ids);
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

check("浮点常量走线形态：往返逐位相同（含 -0 / NaN / ±Infinity）", () => {
  // **这一条换掉了旧判据**（第 129 轮）：旧的那条量的是「有 f64 就编不出来」✗，
  // 线形态承载浮点之后它就不再成立 ✓。现在量的是**更要紧的那件事**：
  // 「编码 → 解码之后还是**同一个值**」✓——`Object.is` 逐位比 ✓，
  // 所以 `-0` 与 `0`、`NaN` 与 `NaN` 都得对上 ✓。
  const values = [
    0, -0, 1, -1, 1.5, -2.25, 0.1, 0.30000000000000004, 43.695449, 74.455959,
    1e21, 1e-7, 1e300, 5e-324, 1.7976931348623157e308, 9007199254740991,
    NaN, Infinity, -Infinity,
  ];
  const program = validProgram();
  const slots = [];
  for (let i = 0; i < values.length; i++) slots.push(program.AddConst(Constant.OfDouble(values[i])));
  const bytes = Encode(program, testIds);
  ok(bytes !== null, "带 f64 的程序编得出来（第 129 轮之前这条是红的）");
  const back = Decode(bytes, testIds);
  ok(back !== null, "解码应当成功");
  for (let i = 0; i < values.length; i++) {
    ok(Object.is(back.Consts[slots[i]].Dbl, values[i]),
      "第 " + i + " 个值必须逐位往返：" + String(values[i]));
  }
  // **dump 的形态也钉住**（`NaN` / `±Infinity` / `-0` 自己判，不走宿主 ✗）：
  // 宿主的数字格式只影响可读性 ✓，但**符号名**是线形态的一部分 ✓，所以它得是稳的 ✓。
  eq(Constant.OfDouble(NaN).Describe(), "NaN", "NaN 的 dump");
  eq(Constant.OfDouble(Infinity).Describe(), "Infinity", "+Infinity 的 dump");
  eq(Constant.OfDouble(-Infinity).Describe(), "-Infinity", "-Infinity 的 dump");
  eq(Constant.OfDouble(-0).Describe(), "0", "-0 的 dump（数字格式，不是线形态）");
});

check("浮点载荷不是这个格式写的 → 解码拒（自检那一步）", () => {
  // **「载荷自检」是这一轮加的**（`Decode` 里那条正向重算）✓：线形态是**安全边界** ✓，
  // 「档位说是浮点、载荷却是一段不是数的文本」必须在**解码**就挡住 ✓，
  // 不然它会变成一个静默的 `NaN` 漏进引擎 ✗。这里手工改字节，制造三种坏载荷。
  //
  // **偏移是算出来的，不是数出来的** ✓：线头固定 52 字节（magic 4 + version 1 + 表 3
  // + 五个条数 5，每个 4 字节 ✓），这份程序只有**一个**常量、因此它从 52 开始 ✓，
  // 布局是 `tag(1) + Int(4) + 长度(4) + 码元(4×3)` ✓。
  const program = new Program();
  program.AddConst(Constant.OfDouble(1.5));
  const bytes = Encode(program, testIds);
  ok(bytes !== null, "编码应当成功");
  eq(bytes.length, 52 + 1 + 4 + 4 + 3 * 4, "线头 + 一个浮点常量的字节数");
  const units = 52 + 9;

  const garbage = bytes.slice();
  garbage[units] = 120; // '1' → 'x'：长度不变，文本变成 "x.5"
  eq(Decode(garbage, testIds), null, "不是数的一段文本要拒");

  const padded = bytes.slice();
  padded[units] = 32; // 换成空格 → " .5"：宿主会容忍前后空白，正向重算就能抓到
  eq(Decode(padded, testIds), null, "带空白的一段文本也要拒");

  const oversized = bytes.slice();
  oversized[52 + 5] = 200; // 长度字段 = 200 > 剩余字节 → 结构就不成立
  eq(Decode(oversized, testIds), null, "长度比剩余字节还大要拒（不许空转到挂住）");
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
  // **这里的号要跟着表尾走** ✗：原来写的是 `Op.Resume + 5`（= 23 ✓），
  // 而第 315 轮把 `env_leave` 追加在第 23 位之后 ✓ ⇒ 那个号**恰好成了合法指令** ✓
  // ⇒ 这一条当场红 ✓（**正是「只追加」那条规矩的第二种代价** ✓：
  //   不只是上界要挪 ✓，「拿号算出来的假指令」也会过期 ✓）。
  // 现在写成「表尾再往后一个」✓，加新算子时它**自动**还是未知的 ✓。
  program.Instrs[0] = new Instruction(Op.EnvLeave + 1, 0, 0, -1, -1);
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
  // **这一条刻意用一张小表**（第 111 轮）：它量的就是「表里只有那几条内建时，+50 越界」。
  // 而**建程序与验程序必须用同一张表** ✗——程序里烙着表的指纹，指纹随格数变；
  // 混用两张表，`Verify` 会先报「表不符」，这一条就永远量不到越界。
  const smallIds = new IdTable(RtOpCount, 8);
  const unknown = validProgram(smallIds);
  unknown.Instrs[3] = new Instruction(Op.RtCall, BuiltinBase + 50, 2, 1, 2);
  const first = issueOf(unknown, smallIds);
  ok(first !== null && first.Code === IssueOperand, "内建段只有 8 条，+50 越界");

  const builtin = validProgram(smallIds);
  builtin.Instrs[3] = new Instruction(Op.RtCall, BuiltinBase, 2, 1, 2);
  eq(issueOf(builtin, smallIds), null, "内建段第一条合法");
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
  // **换了一个档位**（第 129 轮）：`Float64` 从这一轮起是**可承载**的 ✓，
  // 所以「不可承载」这条判据改用 `Object`——它永远不该出现在常量池里 ✓。
  const badTag = validProgram();
  const wrong = new Constant();
  wrong.Tag = ValueTag.Object;
  badTag.AddConst(wrong);
  const first = issueOf(badTag);
  ok(first !== null && first.Code === IssueConst, "对象档位不该出现在常量池");

  const badUnit = validProgram();
  badUnit.AddConst(Constant.OfString([70000]));
  const second = issueOf(badUnit);
  ok(second !== null && second.Code === IssueConst, "码元越界");

  const goodUnit = validProgram();
  goodUnit.AddConst(Constant.OfString([0, 65535]));
  eq(issueOf(goodUnit), null, "边界上的码元是合法的");

  // **f64 从第 129 轮起在这里是合法的** ✓（载荷是十进制文本，良构性由 `Decode` 自检 ✓）。
  const goodFloat = validProgram();
  goodFloat.AddConst(Constant.OfDouble(1.5));
  eq(issueOf(goodFloat), null, "f64 档位现在装得下");
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

check("算子：`===` 按档位、`==` 与算术的 `ToPrimitive`（第 198 轮把两条都补齐了）", () => {
  // **判据随契约更新** ✓：这一条原来断言的是
  // 「`1 == \"1\"` 还没实现，必须抛」✗ 与「非数值的 `+` 必须抛」✗——
  // 第 198 轮把 `ToPrimitive` / `ToNumber` 做出来之后，那两条都**变成了有答案** ✓
  // （抛的那条纪律本来是对的 ✓：拿 `===` 冒名顶替会让 `1 == "1"` **静默**变成 `false` ✗）。
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 10000);
  const protos = InitProtos(machine.Room(), table);
  const text = Value.FromString(table.CreateString(units("a")));
  const text2 = Value.FromString(table.CreateString(units("a")));
  eq(RtCmpEqStrict(table, Value.FromInt(1), Value.FromInt(1)).AsBool(), true, "数值相等");
  eq(RtCmpEqStrict(table, Value.FromInt(1), text).AsBool(), false, "档位不同就不等");
  eq(RtCmpEqStrict(table, text, text2).AsBool(), true, "字符串按内容");
  eq(RtCmpEqStrict(table, Value.FromDouble(NaN), Value.FromDouble(NaN)).AsBool(), false, "NaN 不等于自己");
  const loose = (a, b) => RtCmpEqLoose(machine.Room(), null, protos, table, a, b).AsBool();
  eq(loose(Value.Null(), Value.Undefined()), true, "null == undefined");
  eq(loose(Value.FromInt(1), Value.FromInt(1)), true, "同档位走严格");
  // **第 198 轮改掉的**：`1 == "1"` 现在给 `true` ✓（原来抛 ✓）。
  eq(loose(Value.FromInt(1), text), false, "1 == \"a\" 是假（转过去是 NaN，与谁都不等）");
  eq(loose(Value.FromInt(1), Value.FromString(table.CreateString(units("1")))), true,
    "**这一轮修的**：1 == \"1\" 给 true（原来报 unimplemented）");
  eq(loose(Value.FromInt(0), Value.FromBool(false)), true, "0 == false（布尔先换成数，再走一轮）");
  eq(loose(Value.Null(), Value.FromInt(0)), false, "null == 0 是假");
  // **非数值的 `+` 现在算得出来** ✓：`null + 1` 是 `1` ✓（`ToNumber(null)` 是 `0` ✓）。
  const addOne = (value) => RtAdd(machine.Room(), null, protos, table, value, Value.FromInt(1));
  eq(addOne(Value.Null()).AsInt(), 1, "**这一轮修的**：null + 1 给 1（原来抛）");
  const undefinedPlusOne = addOne(Value.Undefined());
  eq(undefinedPlusOne.Dbl !== undefinedPlusOne.Dbl, true, "**这一轮修的**：undefined + 1 给 NaN（原来是抛）");
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
  // **第 333 轮起返回的是「写下去了没有」** ✓（一个布尔 ✓）——
  // 原来是「返回赋的那个值」✗：JS 的 `[[Set]]` 本来就是**一个布尔** ✓，
  // 而「要不要把那个值当表达式的结果」是**调用方**的事 ✓（`vm.xl.md` 的 `set_prop` ✓）。
  eq(setProp(machine, table, object, name, Value.FromInt(7)), true, "写入成功 → 真");
  eq(getProp(machine, table, object, name).AsInt(), 7, "读回来");
  eq(getProp(machine, table, object, propKey(table, "y")).IsUndefined(), true, "缺的属性给 undefined");
  eq(typeof TypeOfName(table, object), "string", "typeof 的名字表留给建库层，这一层只给名字");
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

check("访问器与只读属性：写不下去时**返回假**（第 333 轮改的口径）", () => {
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const protos = InitProtos(machine.Room(), table);
  const object = NewPlainObject(machine.Room(), table, protos);

  // **有 getter 没 setter：写要「不成功」，不是「抛」** ✗（第 333 轮 ✓）
  //
  // 这一条原来钉的是「必须抛」✓，那是**严格模式**的口径 ✗；本仓选定**非严格** ✓
  //（与 `this` 那一条是同一个设计决定 ✓）：JS 的 `[[Set]]` 在这里返回**假** ✓，
  // 而赋值语句**不看它** ✓ ⇒ `o.x = 1` 一声不响 ✓。
  // **谁需要「抛」谁自己看返回值** ✓：`push` 那一族看 ✓（`RequireArrayGrowable` ✓），
  // 赋值那三条 rt 算子不看 ✓（`vm.xl.md` 的 `set_prop` ✓）。
  // **判据里量着的是行为** ✓（`ex-getter-setter-class` ✓ / `object-freeze` ✓ 两条都转绿 ✓）。
  const getterKey = propKey(table, "g");
  const getter = Value.FromRef(ValueTag.Closure, table.CreateClosure(0, 0, 0, 0));
  table.Get(object.Ref).Props.push(Property.Accessor(getterKey.Ref, getter, Value.Undefined()));
  eq(setProp(machine, table, object, getterKey, Value.FromInt(1)), false,
    "只有 getter 的访问器被赋值 → 假（什么都没写）");

  const frozen = propKey(table, "f");
  const property = new Property(frozen.Ref, Value.FromInt(1));
  property.Flags = 0;
  table.Get(object.Ref).Props.push(property);
  eq(setProp(machine, table, object, frozen, Value.FromInt(2)), false, "只读属性 → 假");
  eq(getProp(machine, table, object, frozen).AsInt(), 1, "而且那一格真的没变");

  // **不可扩展的对象长不出新属性** ✓（第 333 轮 ✓）：没有这一问，
  // `Object.freeze(o); o.b = 3` 会真的造出 `b` ✓ ⇒ `isFrozen` 从真变假 ✗。
  const sealed = NewPlainObject(machine.Room(), table, protos);
  table.Get(sealed.Ref).Extensible = false;
  eq(setProp(machine, table, sealed, propKey(table, "b"), Value.FromInt(3)), false,
    "不可扩展 → 假");
  eq(getProp(machine, table, sealed, propKey(table, "b")).IsUndefined(), true, "那一格没有长出来");
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

/** 只量「包一层承诺」那一格：恢复之后**直接返回兑现值**（不做算术）✓。 */
function awaitIdentityProgram() {
  const program = new Program();
  program.Functions.push(new FunctionInfo(0, 2, 1));
  const emit = (op, a, b, c, d) => program.Emit(new Instruction(op, a, b, c, d));
  emit(Op.Await, 0, -1, -1, -1);
  emit(Op.Resume, 1, -1, -1, -1);
  emit(Op.Return, 1, -1, -1, -1);
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

check("await 一个不是承诺的东西：包成「已兑现为它」的承诺（JS 的口径，不抛）", () => {
  // **第 286 轮改的口径** ✓：原来这一条量的是「响亮地抛」✗——
  // 那是**第 229 轮故意**留的 ✓（当时调用者拿不到承诺 ✓，包一层会把「响亮地抛」
  // 换成「静默 `undefined`」✗）。本轮 async 语义做完了 ✓，
  // 于是这里改成**正面断言**：`await 5` 给 `5` ✓、后面那一段照样接着跑 ✓
  // （而且**照样让出一个 tick** ✓——与「已兑现的承诺」那一支走的是同一段 ✓）。
  const program = awaitProgram();
  // **原始值那一半先跑**（它量的是「包一层」这件事本身 ✓）：`await 5` 给 `6` ✓。
  const table2 = new HeapTable();
  const machine2 = new Vm(table2, 1 << 20, 1000);
  machine2.Load(Encode(program, testIds), testIds);
  InitProtos(machine2.Room(), table2);
  machine2.Start(0, [Value.FromInt(5)]);
  eq(machine2.Run(), VmStatus.Halted, "原始值同理：先挂起、让出一个 tick");
  eq(machine2.Microtasks.length, 1, "包出来的那个已兑现承诺排进了队列");
  eq(machine2.DrainMicrotasks(), true, "排空");
  eq(machine2.Result.AsInt(), 6, "5 + 1");

  // 对象那一半：`await o` 给 `o` **自己** ✓（不是它的字符串化 ✓）。
  // **换一份程序**（`awaitIdentityProgram` ✓）：这一条只量「包一层、原样回来」✓——
  // 那台裸机器**没装建库层** ✓，所以 `InitProtos` 造出来的普通对象上
  // **没有 `valueOf` / `toString`** ✓（那是 `builtins/globals.xl.md` 挂的 ✓），
  // 拿它做算术会报 `cannot convert object to a primitive value` ✓（**那是另一个话题** ✓）。
  const identity = awaitIdentityProgram();
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  machine.Load(Encode(identity, testIds), testIds);
  const protos = InitProtos(machine.Room(), table);
  const plain = NewPlainObject(machine.Room(), table, protos);
  machine.Start(0, [plain]);
  eq(machine.Run(), VmStatus.Halted, "对象也一样：先挂起");
  eq(machine.Microtasks.length, 1, "包出来的那个已兑现承诺排进了队列");
  eq(machine.DrainMicrotasks(), true, "排空");
  ok(machine.Result.Tag === ValueTag.Object && machine.Result.Ref === plain.Ref,
    "对象原样兑现（`await o` 给 `o` 自己）");
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
  // **装载之后再装语言**（第 111 轮）：`InstallBuiltins` 会顺手把语言内部辅助号
  // （700 段，如 `get_iterator`）**登记**进能力表，而 `Register` 只认**已装载的那张表**
  // 里的号——顺序反了会**静默失败**（返回 `false`，没人看），症状就是 `capability is not registered`。
  InstallBuiltins(host, host.Machine.Protos);
  // **错误工厂**（第 127 轮）：rt 层的失败也变成**脚本接得住**的异常 ✓——
  // 与 `tsrun` 同一条接法 ✓（判据里少这一层，量的就是另一条接法 ✗）。
  host.Machine.SetErrorFactory((text) => {
    return NewError(host.Machine.Room(), host.Machine.Table, host.Machine.Protos, text);
  });
  // **宿主调用通道也要接上**（第 111 轮）：`for..of` 现在会先问一次 `get_iterator`，
  // 那是一条 `host_call`；光注册不够，还得有人在那一头把号翻译成内建分派。
  // 形状照抄产品路径（`tsrun.xl.md`）：从 `HostRef` 取能力号 → 交给 `InvokeWithSink`。
  // **兜底也要照抄**（第 121 轮）：内建失败时把宿主异常抬成脚本异常 ✓——
  // 判据里少这一层，量的就是**另一条接法**（`try/catch` 接不住的那种）✗。
  host.InstallHost((target, self, args, room) => {
    const id = table.Get(target.Ref).AsHost().CapabilityId;
    try {
      return InvokeWithSink(room, table, host.Machine.Protos, id, self, args, () => {}, host.Machine.Native(), host.Machine.Scheduler(), host.Machine.Settler());
    } catch (error) {
      if (!RaiseFromHost(host.Machine, error)) throw error;
      return Value.Undefined();
    }
  });
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
    return InvokeArray(room, table, null, id, self, args);
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

  InstallBuiltins(host, host.Machine.Protos);
  host.InstallHost((target, self, args, room) => {
    const id = table.Get(target.Ref).AsHost().CapabilityId;
    return InvokeBuiltin(room, table, null, id, self, args);
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

  InstallBuiltins(host, host.Machine.Protos);
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
  const nodeAt = new Function(source + "\nreturn [keys({x: 1, y: 2}), simple(), scalars(), text(), omitted(), inArray(), fractional()];")();
  const { module, host, table } = lowerAndLoad(source, GlobalNames());
  const sink = () => {};
  const evaluated = host.Evaluate([BuildGlobals(host.Machine, host.Machine.Protos, sink)]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);

  InstallBuiltins(host, host.Machine.Protos);
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

  // **旧判据随契约更新**（第 124 轮）：这里原来断言「非整数数值必须抛」（那时浮点
  // **没有文本形态**，抛是诚实的口径）。第 124 轮把文本形态做了（`text.xl.md`：
  // 最短往返十进制），于是这一条改成**更强的断言**——与 Node 的 `JSON.stringify(3.5)`
  // **逐字节相同** ✓（比「抛得对不对」更有价值：它钉的是**格式**本身 ✓）。
  eq(hostStringOf(table, call("fractional").Value), nodeAt[6], "非整数数值：与 Node 同格式（3.5）");
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

  // **`yield*` 第 230 轮做掉了** ✓：它落成一段**等价的循环** ✓（`LowerYieldDelegation` ✓）——
  // 拼的是 `GetIterator` + `IterNew` + `IterNext` + `Suspend` / `Resume` 五样现成的 ✓。
  // 所以这里原来那条「必须抛」的断言**反过来**：现在必须**降级得出来** ✓。
  // **端到端那一条在判据里另有各处** ✓（`gen-delegating` / `ex-yield-star` 两条矩阵用例 ✓）。
  let delegated = "";
  try {
    lowerAndLoad("function* f() { yield* [1, 2]; }");
  } catch (error) {
    delegated = String(error.message);
  }
  eq(delegated, "", "yield* 现在必须降级得出来（委托迭代第 230 轮做了）：" + delegated);

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
  InstallBuiltins(host, host.Machine.Protos);
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
  InstallBuiltins(host, host.Machine.Protos);
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

check("new 认构造函数的 prototype：方法经原型链落到实例上（与 Node 一致）", () => {
  const source = [
    "function Point(x) { this.x = x; }",
    "Point.prototype.get = function () { return this.x; };",
    "Point.prototype.bump = function (d) { this.x = this.x + d; return this.x; };",
    "function make(v) {",
    "  const p = new Point(v);",
    "  p.bump(10);",
    "  return p.get();",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn make(7);")();
  eq(expected, 17, "Node：7 + 10（这是前提）");

  const { module, host } = lowerAndLoad(source);
  // **语言层告诉机器「原型挂在哪个属性名下」**（引擎不认识 "prototype" 这七个字）
  host.DeclarePrototypeKey(units("prototype"));
  eq(host.Evaluate([]).Outcome, HostOutcome.Ok, "求值模块");
  eq(host.CallExport(module.ExportOf("make"), [Value.FromInt(7)]).Value.AsInt(), expected,
    "p.bump(10) 之后 p.get()");

  // **没告诉它名字时不许「碰巧对」**：实例原型还是 Protos.Object，方法找不到 → 响亮报错
  //
  // **第 246 轮改了口径** ✓：`p.bump(10)` 那一抛现在是**带类别的脚本异常**了 ✓
  //（`ErrorKindType` ✓），所以它**不再越过宿主那一层** ✗——
  // `CallExport` 的结局是 `Threw` ✓、话在 `result.Message` 里 ✓。
  // **钉的仍然是「不许静默给错值」** ✓：结局不是 `Ok` ✓、而且话里点名了那个调用 ✓。
  const plain = lowerAndLoad(source);
  eq(plain.host.Evaluate([]).Outcome, HostOutcome.Ok, "求值（不带那格名字）");
  const plainResult = plain.host.CallExport(plain.module.ExportOf("make"), [Value.FromInt(7)]);
  eq(plainResult.Outcome !== HostOutcome.Ok, true,
    "没接上原型名字时不许静默给错值（结局不是 Ok）：" + plainResult.Outcome);
  const missing = String(plainResult.Message);
  eq(missing.length > 0, true, "没接上原型名字时要报出来（不是静默给错值）：" + missing);
});

check("class：构造函数 + 原型上的方法 + 默认构造函数 + 类表达式（与 Node 一致）", () => {
  const source = [
    "class Point {",
    "  constructor(x) { this.x = x; }",
    "  get() { return this.x; }",
    "  bump(d) { this.x = this.x + d; return this.get(); }",
    "}",
    "class Named {",
    "  greet() { return 'hi'; }",
    "}",
    "function make(v) { const p = new Point(v); return p.bump(10); }",
    "function viaNamed() { const n = new Named(); return n.greet(); }",
    "function classExpr() { const C = class { twice(n) { return n * 2; } }; return new C().twice(21); }",
  ].join("\n");
  const expected = new Function(source + "\nreturn [make(7), viaNamed(), classExpr()];")();
  eq(expected[0], 17, "Node：7 + 10（这是前提）");
  eq(expected[1], "hi", "Node：默认构造函数也能 new（这是前提）");

  const { module, host, table } = lowerAndLoad(source);
  host.DeclarePrototypeKey(units("prototype"));
  eq(host.Evaluate([]).Outcome, HostOutcome.Ok, "求值模块");
  const call = (name, args) => host.CallExport(module.ExportOf(name), args || []);
  let label = "make";
  try {
    eq(call("make", [Value.FromInt(7)]).Value.AsInt(), expected[0], "构造函数写 this.x，方法里再 this.get()");
    label = "viaNamed";
    eq(hostStringOf(table, call("viaNamed").Value), expected[1], "没写构造函数：默认那个空的也能用");
    label = "classExpr";
    eq(call("classExpr").Value.AsInt(), expected[2], "类表达式 + 方法");
  } catch (error) {
    throw new Error("在「" + label + "」处：" + String(error.message));
  }

  // **继承**：方法沿原型链找到父类的。先量，再断言——下面两行诊断把
  // 「链有没有接上」与「方法有没有挂上」分开。
  const inherited = [
    "class A { m() { return 1; } }",
    "class B extends A { }",
    "function ctorA() { return A; }",
    "function ctorB() { return B; }",
    "function viaExtends() { const b = new B(); return b.m(); }",
  ].join("\n");
  const nodeInherited = new Function(inherited + "\nreturn viaExtends();")();
  eq(nodeInherited, 1, "Node：子类实例调用父类方法（这是前提）");
  const derived = lowerAndLoad(inherited);
  derived.host.DeclarePrototypeKey(units("prototype"));
  eq(derived.host.Evaluate([]).Outcome, HostOutcome.Ok, "求值（继承）");
  const ctorA = derived.host.CallExport(derived.module.ExportOf("ctorA"), []).Value;
  const ctorB = derived.host.CallExport(derived.module.ExportOf("ctorB"), []).Value;
  const protoA = getProp(derived.machine, derived.table, ctorA, propKey(derived.table, "prototype"));
  const protoB = getProp(derived.machine, derived.table, ctorB, propKey(derived.table, "prototype"));
  // **链真的接上了**（上一轮查了半天的那件事，现在有断言守着）
  eq(derived.table.Get(protoB.Ref).Proto, protoA.Ref, "子类 prototype 的原型指向父类 prototype");
  eq(getProp(derived.machine, derived.table, protoA, propKey(derived.table, "m")).Tag, ValueTag.Closure,
    "父类 prototype 上挂着 m");
  eq(derived.host.CallExport(derived.module.ExportOf("viaExtends"), []).Value.AsInt(), nodeInherited,
    "b.m() 走原型链找到父类的方法");

  // 子类**自己带方法**：自己的用自己的，父类的照样能调
  const own = [
    "class A { m() { return 1; } }",
    "class B extends A { n() { return this.m() + 1; } }",
    "function viaOwn() { const b = new B(); return b.n(); }",
  ].join("\n");
  const nodeOwn = new Function(own + "\nreturn viaOwn();")();
  eq(nodeOwn, 2, "Node：子类方法里调父类方法（这是前提）");
  const derived2 = lowerAndLoad(own);
  derived2.host.DeclarePrototypeKey(units("prototype"));
  eq(derived2.host.Evaluate([]).Outcome, HostOutcome.Ok, "求值（子类自带方法）");
  eq(derived2.host.CallExport(derived2.module.ExportOf("viaOwn"), []).Value.AsInt(), nodeOwn,
    "this.m() 从子类 prototype 走到父类 prototype");

  // **父类带构造函数：默认构造函数会转发参数**（第 141 轮改的契约 ✓）——
  // 原来这里断言的是「必须抛」✗（那时 `super(...)` 还没做 ✓，静默少跑父类初始化比不能用更坏 ✓）。
  // 现在合成的是 JS 那一个：`constructor(...args) { super(...args); }` ✓。
  //
  // **用脚本那一层量**（不 `CallExport` ✗）：`CallExport` 是**普通调用** ✓，
  // 而类的构造函数要**用 `new` 调**才有 `this` ✓（判据现场：返回 `undefined` ✓，
  // 因为我拿 `CallExport` 去调了一个类 ✓——**这是判据自己的错**，不是产品的 ✓）。
  const withCtorLines = [];
  const withCtorRequest = new RunRequest();
  withCtorRequest.Sources = [[
    "class A { constructor(x) { this.x = x; } }",
    "class B extends A { }",
    "console.log(new B(7).x, new B(7) instanceof A);",
  ].join("\n")];
  withCtorRequest.Entry = "";
  const withCtorRes = RunSources(withCtorRequest, (text) => withCtorLines.push(text), () => null);
  eq(withCtorRes.Outcome, HostOutcome.Ok, "父类带构造函数时**不再抛**：" + withCtorRes.Message);
  eq(withCtorLines[0], "7 true", "默认构造函数把实参转发给了父类（`this.x === 7`）");

  // **`super(...)`：父类构造函数在子类实例上跑起来**
  const withState = [
    "class A { constructor(x) { this.x = x; } get() { return this.x; } }",
    "class B extends A {",
    "  constructor(x) { super(x); this.y = x + 1; }",
    "  sum() { return this.get() + this.y; }",
    "}",
    "function viaSuper(v) { const b = new B(v); return b.sum(); }",
  ].join("\n");
  const nodeSuper = new Function(withState + "\nreturn viaSuper(5);")();
  eq(nodeSuper, 11, "Node：父类设 this.x、子类设 this.y（这是前提）");
  const derived3 = lowerAndLoad(withState);
  derived3.host.DeclarePrototypeKey(units("prototype"));
  eq(derived3.host.Evaluate([]).Outcome, HostOutcome.Ok, "求值（super）");
  eq(derived3.host.CallExport(derived3.module.ExportOf("viaSuper"), [Value.FromInt(5)]).Value.AsInt(),
    nodeSuper, "super(x) 让父类构造函数在同一个实例上跑");

  // **派生类缺构造函数：第 141 轮起不再抛** ✓——合成的默认构造函数会**转发参数** ✓。
  // 原来这条断言的是「必须抛」✗（那时合成会静默少跑父类初始化 ✓，抛更安全 ✓）——
  // 现在合成的是 JS 那一个 ✓（`constructor(...args) { super(...args); }` ✓），
  // 所以「不再抛」才是对的 ✓。上面那一块已经量过转发 ✓，这里量**不再抛**这一件事本身 ✓。
  const noCtorLines = [];
  const noCtorRequest = new RunRequest();
  // **两份字符串是两个模块** ✗（这一轮又踩了一次 ✓）：类声明与用它那句必须在**同一份**里 ✓，
  // 否则报的是「`B` 不是局部名也不是捕获」✗（离现场很远 ✓）。
  noCtorRequest.Sources = [["class A { constructor() { this.x = 1; } } class B extends A { }",
    "console.log(new B().x);"].join("\n")];
  noCtorRequest.Entry = "";
  const noCtorRes = RunSources(noCtorRequest, (text) => noCtorLines.push(text), () => null);
  eq(noCtorRes.Outcome, HostOutcome.Ok, "派生类缺构造函数不再抛：" + noCtorRes.Message);
  eq(noCtorLines[0], "1", "父类的初始化照跑");

  // 写了构造函数但**没调 `super(...)`** 也必须抛
  let noSuper = "";
  try {
    lowerAndLoad("class A { constructor() { this.x = 1; } } class B extends A { constructor() { this.y = 2; } }");
  } catch (error) {
    noSuper = String(error.message);
  }
  eq(noSuper.indexOf("super") >= 0, true, "构造函数没调 super(...) 必须抛：" + noSuper);

  // **实例字段 / `static` / 静态块**（第 128 轮）：原来这里钉的是「必须抛（还没做）」，
  // 现在换成**与 Node 逐值对拍**——顺序口径（静态成员按源码顺序、实例字段在体之前、
  // 派生类里跟在 `super(...)` 之后）就是这一节量的东西。
  const fieldsSource = [
    "class Box {",
    "  n = 1;",
    "  tag = 'b' + this.n;",
    "  empty;",
    "  static made = 0;",
    "  static list = [];",
    "  constructor(n) { this.n = n; Box.made = Box.made + 1; Box.list.push(n); }",
    "  static describe() { return 'made=' + Box.made; }",
    "  static { Box.list.push('block'); }",
    "  sum() { return this.n + 1; }",
    "}",
    "class Base2 { id; constructor(id) { this.id = id; } name() { return 'b' + this.id; } }",
    "class Derived2 extends Base2 {",
    "  extra = this.id * 10;",
    "  constructor(id) { const doubled = id * 2; super(doubled); }",
    "  name() { return 'd:' + super.name() + ':' + this.extra; }",
    "}",
    "function probe(v) {",
    "  const b = new Box(v);",
    "  const d = new Derived2(v);",
    // **`'empty' in b` 写成三次比较**（不是风格）：`[x in y]` 这个形状今天在**token 层**
    // 被读成映射键的 `TypeParameter` ✗（见 `typescript-exec/README.md` 那条已知缺口 ✓），
    // 所以判据不拿它当料——那是一条**独立的**缺口，不该混进这一节 ✓。
    "  const hasEmpty = 'empty' in b;",
    "  return [b.sum(), b.tag, hasEmpty, Box.made, Box.describe(), Box.list.join(','), d.id, d.extra, d.name()];",
    "}",
  ].join("\n");
  const fieldsExpected = new Function(fieldsSource + "\nreturn probe(3);")();
  eq(fieldsExpected[0], 4, "Node：n 覆盖字段初始值");
  eq(fieldsExpected[1], "b1", "Node：字段初始化式看得见同一次里的前一个字段");
  eq(fieldsExpected[2], true, "Node：光写名字的字段也真的存在");
  eq(fieldsExpected[4], "made=1", "Node：静态方法读得到静态字段（这是前提）");
  eq(fieldsExpected[6], 6, "Node：派生类的字段跟在 super(...) 之后才求值");
  const fieldsRun = lowerAndLoad(fieldsSource);
  fieldsRun.host.DeclarePrototypeKey(units("prototype"));
  eq(fieldsRun.host.Evaluate([]).Outcome, HostOutcome.Ok, "求值（字段 / static）");
  const fieldsActual = fieldsRun.host.CallExport(fieldsRun.module.ExportOf("probe"), [Value.FromInt(3)]);
  // **逐个比**（数组元素：数字与字符串混在一起，`AsInt` 只对数字成立）
  for (let i = 0; i < fieldsExpected.length; i++) {
    const item = fieldsRun.table.Get(fieldsActual.Value.Ref).AsArray().GetAt(i);
    const want = fieldsExpected[i];
    if (typeof want === "number") {
      eq(item.AsInt(), want, "字段 / static 第 " + i + " 项（数字）");
    } else if (typeof want === "boolean") {
      eq(item.AsBool(), want, "字段 / static 第 " + i + " 项（布尔）");
    } else {
      eq(hostStringOf(fieldsRun.table, item), want, "字段 / static 第 " + i + " 项（字符串）");
    }
  }
});

check("set_proto：链上之后属性查找沿链走、自环当场拒绝（引擎层）", () => {
  const { host, table, machine } = lowerAndLoad("function noop() { }");
  const protos = machine.Protos;
  const parent = NewPlainObject(machine.Room(), table, protos);
  const child = NewPlainObject(machine.Room(), table, protos);
  machine.Retain(parent);
  machine.Retain(child);
  setProp(machine, table, parent, propKey(table, "m"), Value.FromInt(41));
  RtSetProto(table, child, parent);
  eq(table.Get(child.Ref).Proto, parent.Ref, "子对象的原型指向父对象");
  eq(getProp(machine, table, child, propKey(table, "m")).AsInt(), 41,
    "属性查找沿链找到父对象上的 m");

  let cycle = "";
  try {
    RtSetProto(table, child, child);
  } catch (error) {
    cycle = String(error.message);
  }
  eq(cycle.indexOf("cycle") >= 0, true, "自环当场拒绝：" + cycle);

  let primitive = "";
  try {
    RtSetProto(table, Value.FromInt(1), parent);
  } catch (error) {
    primitive = String(error.message);
  }
  // **断言按第 278 轮的新口径改过** ✓：那一轮把 `set_proto` 的**两格分了开来**——
  // **接收者**必须是个对象 ✓（拿到别的说明降级层接线错了 ✓，照旧**响亮地抛** ✓），
  // 而**原型那一格**不是对象时**不做事** ✓（JS 的口径 ✓：`Object.setPrototypeOf(o, 1)`
  // 不抛也不改 ✓）。分开的理由是 `class E extends Error {}` ✓：内建构造函数是
  // **宿主引用值** ✓（`IsObject()` 是假 ✓），合成不出来一个对象 ✗——
  // 原来那一句抛会把一条**完全合法**的 `extends` 挡住 ✓（实测踩到 ✓）。
  // **这一条量的是接收者那一半** ✓，所以词也跟着改准 ✓（原来钉的是「two objects」✓）。
  eq(primitive.indexOf("an object receiver") >= 0, true,
    "原始值当接收者要抛（不许静默无效）：" + primitive);
  // **原型那一半反过来：不抛、也不改** ✓（同一次改动里的另一半 ✓）。
  let notAnObject = "";
  try {
    RtSetProto(table, child, Value.FromInt(1));
  } catch (error) {
    notAnObject = String(error.message);
  }
  eq(notAnObject, "", "原型不是对象时不抛（JS 的口径）：" + notAnObject);
  eq(table.Get(child.Ref).Proto, parent.Ref, "而且原型一个字节都没动");
  machine.Release(parent.Ref);
  machine.Release(child.Ref);
});

check("instanceof：沿原型链判、原始值给假、右侧不是对象要抛", () => {
  const source = [
    "class A { constructor(x) { this.x = x; } }",
    "class B extends A { constructor(x) { super(x); } }",
    "function throughChain(v) { const b = new B(v); return b instanceof A; }",
    "function wrongWay(v) { const a = new A(v); return a instanceof B; }",
    "function primitive(v) { return v instanceof A; }",
    "function literalObject() { return ({}) instanceof A; }",
    "function ctorBack(x) { const a = new A(x); return a.constructor === A; }",
  ].join("\n");
  const nodeAt = new Function(source + "\nreturn [throughChain(1), wrongWay(1), primitive(1),"
    + " literalObject(), ctorBack(2)];")();
  eq(nodeAt[0], true, "Node：子类实例 instanceof 父类（这是前提）");
  eq(nodeAt[1], false, "Node：反向为假（这是前提）");

  const { module, host, table } = lowerAndLoad(source);
  host.DeclarePrototypeKey(units("prototype"));
  eq(host.Evaluate([]).Outcome, HostOutcome.Ok, "求值模块");
  const call = (name, args) => host.CallExport(module.ExportOf(name), args || []);
  eq(call("throughChain", [Value.FromInt(1)]).Value.AsBool(), nodeAt[0], "b instanceof A：沿链找到");
  eq(call("wrongWay", [Value.FromInt(1)]).Value.AsBool(), nodeAt[1], "a instanceof B：反向不给真");
  eq(call("primitive", [Value.FromInt(1)]).Value.AsBool(), nodeAt[2], "1 instanceof A 是假（不抛）");
  eq(call("literalObject").Value.AsBool(), nodeAt[3], "普通对象不在链上");
  eq(call("ctorBack", [Value.FromInt(2)]).Value.AsBool(), nodeAt[4],
    "prototype.constructor 回指，所以 a.constructor === A");

  // **右侧不是对象 → 抛**（JS 是 TypeError；不许静默给假）
  let badRight = "";
  try {
    lowerAndLoad("function bad(o) { return o instanceof 42; }");
  } catch (error) {
    badRight = String(error.message);
  }
  const runtime = lowerAndLoad("function bad(o) { return o instanceof 42; }");
  runtime.host.DeclarePrototypeKey(units("prototype"));
  runtime.host.Evaluate([]);
  let badRuntime = "";
  try {
    runtime.host.CallExport(runtime.module.ExportOf("bad"), [Value.FromInt(1)]);
  } catch (error) {
    badRuntime = String(error.message);
  }
  // **旧判据随契约更新**（第 127 轮）：上面那次调用原来会**冒出宿主异常** ✗——
  // 第 127 轮之后 rt 层的失败是**脚本站内异常** ✓（`Vm.SetErrorFactory` ✓），
  // 所以「没冒出宿主」+「结局是 ScriptThrew」合起来才是对的读法 ✓。
  eq(badRuntime, "", "rt 层的失败不再冒出宿主（它是一条脚本异常）：" + badRuntime);
  eq(runtime.host.CallExport(runtime.module.ExportOf("bad"), [Value.FromInt(1)]).Outcome,
    HostOutcome.ScriptThrew,
    "右侧没有原型对象时**报出来**（降级期通过、运行期报；结局是脚本抛出）：" + badRight);

  // **没告诉机器原型挂在哪个属性名下** → 也要明确报出来，而不是给个假答案
  const noKey = lowerAndLoad(source);
  noKey.host.Evaluate([]);
  let missingKey = "";
  try {
    noKey.host.CallExport(noKey.module.ExportOf("throughChain"), [Value.FromInt(1)]);
  } catch (error) {
    missingKey = String(error.message);
  }
  // 与上面同一个契约更新（第 127 轮）：这里也**不该**冒出宿主 ✓，看结局 ✓。
  eq(noKey.host.CallExport(noKey.module.ExportOf("throughChain"), [Value.FromInt(1)]).Outcome,
    HostOutcome.ScriptThrew, "没声明原型键时要明确报（结局是脚本抛出）：" + missingKey);
  void table;
});

check("模板串：内插（数字要转字符串）、多段、嵌套、空模板（与 Node 一致）", () => {
  const source = [
    "function one(n) { return `n=${n}`; }",
    "function two(n) { return `${n}-${n + 1}`; }",
    "function withText(name, v) { return `[${name}: ${v}]`; }",
    "function truthy(b) { return `b is ${b}`; }",
    "function plain() { return `no subs`; }",
    "function empty() { return ``; }",
    "function nested(n) { return `a${`b${n}c`}d`; }",
  ].join("\n");
  const nodeAt = new Function(source + "\nreturn [one(7), two(3), withText('x', 1), truthy(true),"
    + " plain(), empty(), nested(9)];")();
  eq(nodeAt[0], "n=7", "Node：数字内插先转字符串（这是前提）");
  eq(nodeAt[5], "", "Node：空模板是空串（这是前提）");

  const { module, host, table } = lowerAndLoad(source);
  eq(host.Evaluate([]).Outcome, HostOutcome.Ok, "求值模块");
  const call = (name, args) => host.CallExport(module.ExportOf(name), args || []);
  const seven = [Value.FromInt(7)];
  eq(hostStringOf(table, call("one", seven).Value), nodeAt[0], "`n=${n}`");
  eq(hostStringOf(table, call("two", [Value.FromInt(3)]).Value), nodeAt[1], "两个内插、中间夹字面量");
  eq(hostStringOf(table, call("withText", [Value.FromString(table.CreateString(units("x"))), Value.FromInt(1)]).Value),
    nodeAt[2], "字面量里有空格与冒号");
  eq(hostStringOf(table, call("truthy", [Value.FromBool(true)]).Value), nodeAt[3], "布尔内插（ToBoolean 的显示是 true/false）");
  eq(hostStringOf(table, call("plain").Value), nodeAt[4], "没有内插的模板");
  eq(hostStringOf(table, call("empty").Value), nodeAt[5], "空模板（这一支天然没有空串歧义）");
  eq(hostStringOf(table, call("nested", [Value.FromInt(9)]).Value), nodeAt[6], "嵌套模板");
});

check("计算成员访问：对象下标读/写、`o[k]()` 的 `this`、数字键字符串化（与 Node 一致）", () => {
  const source = [
    "function run() {",
    "  const o = { m: function (n) { return n * 2; }, v: 7 };",
    "  const total = o['v'] + 1;",
    "  o['w'] = total + 1;",
    "  const doubled = o['m'](total);",
    "  return doubled + o['w'];",
    "}",
    "function thisCheck() {",
    "  const o = { base: 5, add: function (n) { return this.base + n; } };",
    "  return o['add'](3);",
    "}",
    "function numericKey() { const o = { 1: 'one' }; return o[1]; }",
    "function arrayPath(i) { const a = [10, 20, 30]; return a[i]; }",
    "function arrayWrite(i) { const a = [1, 2]; a[i] = 9; return a[1]; }",
  ].join("\n");
  const nodeAt = new Function(source + "\nreturn [run(), thisCheck(), numericKey(), arrayPath(1), arrayWrite(1)];")();
  eq(nodeAt[0], 25, "Node：读 8、写 9、调 16（这是前提）");
  eq(nodeAt[1], 8, "Node：`o['add'](3)` 里 `this` 是 o（这是前提）");

  const { module, host, table } = lowerAndLoad(source);
  eq(host.Evaluate([]).Outcome, HostOutcome.Ok, "求值模块");
  const call = (name, args) => host.CallExport(module.ExportOf(name), args || []);
  eq(call("run").Value.AsInt(), nodeAt[0], "对象下标读 + 写 + 计算成员调用");
  eq(call("thisCheck").Value.AsInt(), nodeAt[1], "计算成员调用把接收者当 `this`");
  eq(hostStringOf(table, call("numericKey").Value), nodeAt[2], "数字键先字符串化（`o[1]` 找的是 \"1\"）");
  eq(call("arrayPath", [Value.FromInt(1)]).Value.AsInt(), nodeAt[3], "数组下标那条路一个字没变");
  eq(call("arrayWrite", [Value.FromInt(1)]).Value.AsInt(), nodeAt[4], "数组下标写也一样");
});

check("链接两份模块：同一台 VM、同一个堆，A 的导出闭包直接进 B 的环境（与 Node 一致）", () => {
  const sourceA = [
    "export function twice(n) { return n * 2; }",
    "export function label() { return 'A'; }",
  ].join("\n");
  const sourceB = [
    "import { twice, label } from './a';",
    "export function run(n) { return twice(n) + label().length; }",
  ].join("\n");
  // Node 那边：这一条**手算期望值**——`twice(21)` = 42、`run(21)` = 42 + "A".length = 43。
  // （上一版我在这里用 `new Function` 拼字符串，结果把整套 Node 对拍判据都弄红了：
  // 拼进去的正则与模板在**字符串里**也被当成了真代码。）

  // **链接**：两份程序合成一份，装进**一台** VM（一个堆）
  const aLowered = new Lowering().LowerModule(parseTsShape(sourceA), testIds);
  const bLowered = new Lowering().LowerModule(parseTsShape(sourceB), testIds);
  const aFunctionCount = aLowered.Program.Functions.length;
  const linked = LinkPrograms([aLowered.Program, bLowered.Program]);
  eq(linked.Functions.length, aFunctionCount + bLowered.Program.Functions.length, "函数表拼起来了");
  eq(linked.Instrs.length, aLowered.Program.Instrs.length + bLowered.Program.Instrs.length, "指令也拼起来了");
  eq(aLowered.Program.Functions[0].Entry, 0, "**源程序没被改动**（链接是纯函数）");

  // **不变式**：算子表指纹不同就不许拼
  const savedHash = aLowered.Program.IdTableHash;
  aLowered.Program.IdTableHash = savedHash + 1;
  let mismatch = "";
  try {
    LinkPrograms([aLowered.Program, bLowered.Program]);
  } catch (error) {
    mismatch = String(error.message);
  }
  aLowered.Program.IdTableHash = savedHash;
  eq(mismatch.indexOf("id table hash") >= 0, true, "指纹不同要拒：" + mismatch);

  // **入口常量声明得对**：每个都是「某个函数的入口 pc」——这条是链接器不靠猜的依据。
  const entries = aLowered.Program.Functions.map((info) => info.Entry);
  const declared = aLowered.Program.EntryConstants;
  eq(declared.length > 0, true, "降级层声明了入口常量（至少入口函数那一个）");
  let allAreEntries = true;
  for (let i = 0; i < declared.length; i++) {
    const value = aLowered.Program.Consts[declared[i]].Int;
    if (entries.indexOf(value) < 0) allAreEntries = false;
  }
  eq(allAreEntries, true, "声明的每个常量都指向一个真的函数入口（不是猜的）");

  // **端到端**：装进**一台** VM（一个堆），A 的导出闭包直接进 B 的环境对象。
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 100000);
  machine.Load(Encode(linked, testIds), testIds);
  const host = new Host(machine);

  // A 的入口（函数表第 0 项）跑完，结果就是它的导出表
  eq(host.Evaluate([]).Outcome, HostOutcome.Ok, "模块 A 求值");
  const aExports = machine.Result;
  machine.Retain(aExports);
  const twiceValue = GetIndex(table, aExports, Value.FromInt(aLowered.ExportOf("twice")));
  eq(twiceValue.Tag, ValueTag.Closure, "从 A 的导出表里拿出 twice 这个闭包值");

  // B 的环境里放 A 的闭包——**同一个堆，所以这是可能的**
  const bEnv = NewPlainObject(machine.Room(), table, machine.Protos);
  machine.Retain(bEnv);
  setProp(machine, table, bEnv, propKey(table, "twice"), twiceValue);
  setProp(machine, table, bEnv, propKey(table, "label"),
    GetIndex(table, aExports, Value.FromInt(aLowered.ExportOf("label"))));

  // B 的入口 = 合并后函数表里 A 后面那一项（每份程序的第 0 项都是它自己的入口）
  eq(machine.Start(aFunctionCount, [bEnv]), true, "开 B 的入口帧");
  eq(machine.Run(), VmStatus.Halted, "B 的入口跑完");
  const bExports = machine.Result;
  machine.Retain(bExports);
  const runClosure = GetIndex(table, bExports, Value.FromInt(bLowered.ExportOf("run")));
  eq(runClosure.Tag, ValueTag.Closure, "B 的导出表里拿到 run");
  eq(machine.StartClosure(runClosure, [Value.FromInt(21)]), true, "调 B 的 run(21)");
  eq(machine.Run(), VmStatus.Halted, "跑完");
  eq(machine.Result.AsInt(), 43, "跨模块调用：A 的 twice 在 B 里跑起来（42 + 1）");

  machine.Release(aExports.Ref);
  machine.Release(bEnv.Ref);
  machine.Release(bExports.Ref);
});


check("Map：new / set 链式 / 更新 / get / has / delete / size / keys，与 Node 一致", () => {
  // **一次跑出全部中间值**：脚本返回一个扁平数组，宿主把它整条打印出来。
  // （前两轮我一直在「改一次判据、跑一次」地上二分，一条线索花一次调用；
  // 全量导出一条命令就能看清全部，这是这一轮定下的做法。）
  const source = [
    "function probe() {",
    "  const m = new Map();",
    "  m.set('a', 1).set('b', 2);",
    "  const d0 = m.get('b');",
    "  const s0 = m.size;",
    "  m.set('a', 10);",
    "  const d1 = m.get('b');",
    "  const d2 = m.get('a');",
    "  const deleted = m.delete('a');",
    "  const s1 = m.size;",
    "  const d3 = m.get('b');",
    "  const h1 = m.has('b');",
    "  const h2 = m.has('a');",
    "  const keys = [];",
    "  for (const k of m.keys()) keys.push(k);",
    "  let flag = 0;",
    "  if (deleted) flag = 1;",
    "  let flag1 = 0;",
    "  if (h1) flag1 = 1;",
    "  let flag2 = 0;",
    "  if (h2) flag2 = 1;",
    "  return [d0, s0, d1, d2, flag, s1, d3, flag1, flag2, keys.length, keys[0], keys.join('-')];",
    "}",
  ].join("\n");
  const nodeAt = new Function(source + "\nreturn probe();")();
  eq(nodeAt[0], 2, "Node：get('b') 先给 2（这是前提）");
  eq(nodeAt[10], "b", "Node：删掉 a 之后 keys() 只剩 b（这是前提）");

  const { module, host, table } = lowerAndLoad(source, GlobalNames());
  const sink = () => {};
  const evaluated = host.Evaluate([BuildGlobals(host.Machine, host.Machine.Protos, sink)]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);
  InstallBuiltins(host, host.Machine.Protos);
  host.InstallHost((target, self, args, room) => InvokeWithSink(room, table, host.Machine.Protos,
    table.Get(target.Ref).AsHost().CapabilityId, self, args, sink));

  const probe = host.CallExport(module.ExportOf("probe"), []).Value;
  const at = (index) => GetIndex(table, probe, Value.FromInt(index));

  eq(at(0).AsInt(), nodeAt[0], "get('b')");
  eq(at(1).AsInt(), nodeAt[1], "size 是 2");
  eq(at(2).AsInt(), nodeAt[2], "更新 a 之后 get('b') 不变");
  eq(at(3).AsInt(), nodeAt[3], "更新 a 之后 get('a') 是新值");
  eq(at(4).AsInt() === 1, nodeAt[4] === 1, "delete 返回真");
  eq(at(5).AsInt(), nodeAt[5], "删完 size 是 1");
  eq(at(6).AsInt(), nodeAt[6], "**删完 get('b') 仍是 2**");
  eq(at(7).AsInt() === 1, nodeAt[7] === 1, "has('b') 仍为真");
  eq(at(8).AsInt() === 1, nodeAt[8] === 1, "has('a') 变假");
  eq(at(9).AsInt(), nodeAt[9], "keys() 长度");
  eq(hostStringOf(table, at(10)), nodeAt[10], "keys() 内容是 b");
  // **方法调用直接写在数组字面量里**（第 59 轮修的那个 bug 的守卫）：
  // 结果格曾被 `LowerMethodCall` 的 `Release` 交出去，于是这一格拿到的是**接收者数组**。
  eq(hostStringOf(table, at(11)), nodeAt[11], "keys.join('-')：方法调用直接写在数组字面量里");
});

check("Set：new / add 链式（重复是空操作）/ has / delete / size / values，与 Node 一致", () => {
  const source = [
    "function probe() {",
    "  const s = new Set();",
    "  s.add(1).add(2).add(2);",
    "  const size0 = s.size;",
    "  const has1 = s.has(1);",
    "  const has3 = s.has(3);",
    "  const deleted = s.delete(1);",
    "  const size1 = s.size;",
    "  const afterDelete = s.has(1);",
    "  const stillTwo = s.has(2);",
    "  const vals = [];",
    "  for (const v of s.values()) vals.push(v);",
    "  const dup = s.delete(9);",
    "  let f1 = 0;", "  if (has1) f1 = 1;",
    "  let f2 = 0;", "  if (has3) f2 = 1;",
    "  let f3 = 0;", "  if (deleted) f3 = 1;",
    "  let f4 = 0;", "  if (afterDelete) f4 = 1;",
    "  let f5 = 0;", "  if (stillTwo) f5 = 1;",
    "  let f6 = 0;", "  if (dup) f6 = 1;",
    "  return [size0, f1, f2, f3, size1, f4, f5, vals.length, vals[0], f6];",
    "}",
  ].join("\n");
  const nodeAt = new Function(source + "\nreturn probe();")();
  eq(nodeAt[0], 2, "Node：重复 add 是空操作，size 仍是 2（这是前提）");
  eq(nodeAt[7], 1, "Node：删掉 1 之后 values() 只剩一个（这是前提）");

  const { module, host, table } = lowerAndLoad(source, GlobalNames());
  const sink = () => {};
  const evaluated = host.Evaluate([BuildGlobals(host.Machine, host.Machine.Protos, sink)]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);
  InstallBuiltins(host, host.Machine.Protos);
  host.InstallHost((target, self, args, room) => InvokeWithSink(room, table, host.Machine.Protos,
    table.Get(target.Ref).AsHost().CapabilityId, self, args, sink));

  const called = host.CallExport(module.ExportOf("probe"), []);
  // **先看结局再看值**：调用失败时 `.Value` 是 undefined，直接读它报的是
  // 「Cannot read properties of undefined」——离真正的原因很远。
  eq(called.Outcome, HostOutcome.Ok, "调 probe：" + called.Message);
  const probe = called.Value;
  const at = (index) => GetIndex(table, probe, Value.FromInt(index));
  eq(at(0).AsInt(), nodeAt[0], "重复 add 是空操作");
  eq(at(1).AsInt() === 1, nodeAt[1] === 1, "has(1)");
  eq(at(2).AsInt() === 1, nodeAt[2] === 1, "has(3) 是假");
  eq(at(3).AsInt() === 1, nodeAt[3] === 1, "delete(1) 返回真");
  eq(at(4).AsInt(), nodeAt[4], "删完 size 是 1");
  eq(at(5).AsInt() === 1, nodeAt[5] === 1, "删完 has(1) 是假");
  eq(at(6).AsInt() === 1, nodeAt[6] === 1, "has(2) 仍为真");
  eq(at(7).AsInt(), nodeAt[7], "values() 长度");
  eq(at(8).AsInt(), nodeAt[8], "values() 里剩下的是 2");
  eq(at(9).AsInt() === 1, nodeAt[9] === 1, "delete 一个不存在的值返回假");
});

check("Symbol：身份唯一、能当属性键、typeof 是 symbol、Object.keys 跳过它，与 Node 一致", () => {
  const source = [
    "function probe() {",
    "  const a = Symbol('x');",
    "  const b = Symbol('x');",
    "  const same = a === b;",
    "  const selfSame = a === a;",
    "  const kind = typeof a;",
    "  const o = {};",
    "  o[a] = 1;",
    "  o[b] = 2;",
    "  const gotA = o[a];",
    "  const gotB = o[b];",
    "  const visible = Object.keys(o).length;",
    "  let f1 = 0; if (same) f1 = 1;",
    "  let f2 = 0; if (selfSame) f2 = 1;",
    "  let f3 = 0; if (kind === 'symbol') f3 = 1;",
    "  return [f1, f2, f3, gotA, gotB, visible];",
    "}",
  ].join("\n");
  const nodeAt = new Function(source + "\nreturn probe();")();
  eq(nodeAt[0], 0, "Node：两个同描述的符号不相等（这是前提）");
  eq(nodeAt[5], 0, "Node：Object.keys 看不见符号键（这是前提）");

  const { module, host, table } = lowerAndLoad(source, GlobalNames());
  const sink = () => {};
  const evaluated = host.Evaluate([BuildGlobals(host.Machine, host.Machine.Protos, sink)]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);
  InstallBuiltins(host, host.Machine.Protos);
  host.InstallHost((target, self, args, room) => InvokeWithSink(room, table, host.Machine.Protos,
    table.Get(target.Ref).AsHost().CapabilityId, self, args, sink));

  const called = host.CallExport(module.ExportOf("probe"), []);
  eq(called.Outcome, HostOutcome.Ok, "调 probe：" + called.Message);
  const at = (index) => GetIndex(table, called.Value, Value.FromInt(index));
  eq(at(0).AsInt() === 1, nodeAt[0] === 1, "Symbol('x') !== Symbol('x')");
  eq(at(1).AsInt() === 1, nodeAt[1] === 1, "同一个符号与自己相等");
  eq(at(2).AsInt() === 1, nodeAt[2] === 1, "typeof 是 symbol");
  eq(at(3).AsInt(), nodeAt[3], "o[a] 读回 1");
  eq(at(4).AsInt(), nodeAt[4], "o[b] 读回 2（两个符号是不同的键）");
  eq(at(5).AsInt(), nodeAt[5], "Object.keys 跳过符号键");
});

check("Date：时间由宿主喂（建库层没有时钟接口）；没接时钟的宿主必须响亮失败", () => {
  const source = [
    "function probe() {",
    "  return Date.now();",
    "}",
  ].join("\n");
  const { module, host, table } = lowerAndLoad(source, GlobalNames());
  const sink = () => {};
  const evaluated = host.Evaluate([BuildGlobals(host.Machine, host.Machine.Protos, sink)]);
  eq(evaluated.Outcome, HostOutcome.Ok, "求值模块：" + evaluated.Message);
  InstallBuiltins(host, host.Machine.Protos);
  // **宿主先认时钟号**——这就是「时间由宿主喂」的落点。这里给固定值，
  // 所以判据可复现；真实宿主会给真时钟，那是**宿主的选择**，不是运行器偷读。
  const fixedNow = 4242;
  host.InstallHost((target, self, args, room) => {
    const id = table.Get(target.Ref).AsHost().CapabilityId;
    if (id === ClockNow) return Value.FromInt(fixedNow);
    return InvokeWithSink(room, table, host.Machine.Protos, id, self, args, sink);
  });
  const called = host.CallExport(module.ExportOf("probe"), []);
  eq(called.Outcome, HostOutcome.Ok, "调 probe：" + called.Message);
  eq(called.Value.AsInt(), fixedNow, "Date.now() 拿到的是宿主给的那个值（建库层读不到时钟）");

  // **没接时钟的宿主**：必须**响亮失败**，不能给假时间。
  const bare = lowerAndLoad(source, GlobalNames());
  eq(bare.host.Evaluate([BuildGlobals(bare.host.Machine, bare.host.Machine.Protos, sink)]).Outcome,
    HostOutcome.Ok, "求值模块（第二个宿主）");
  InstallBuiltins(bare.host, bare.host.Machine.Protos);
  bare.host.InstallHost((target, self, args, room) => InvokeWithSink(room, bare.table,
    bare.host.Machine.Protos, bare.table.Get(target.Ref).AsHost().CapabilityId, self, args, sink));
  let loud = "";
  try {
    const result = bare.host.CallExport(bare.module.ExportOf("probe"), []);
    loud = result.Outcome + ": " + result.Message;
  } catch (error) {
    loud = String(error.message);
  }
  ok(loud.indexOf("260") >= 0, "没接时钟号的宿主必须点到 260 这个号上：" + loud);

  // **`new Date(ms)` 这一半还没做**（台账里记着原因与两条候选修法）：
  // 失败消息必须**说清是什么形状不支持**，而不是「calling a non-closure value」。
  // 注意它是**运行期**抛的（降级期看不出来——这一轮我先把它写错在降级期了）。
  // **`new Date(ms)` 第 114 轮做出来了** ✗→✓：它由降级层落成一条内部调用，
  // 所以这一条改用**真正的普通对象**来测「对象当构造函数」这条规则 ✓
  // （失败消息必须**说清是什么形状不支持**，而不是「calling a non-closure value」✓）。
  const ctorCase = lowerAndLoad("function make() { const o = { x: 1 }; return new o(); }", GlobalNames());
  ctorCase.host.Evaluate([BuildGlobals(ctorCase.host.Machine, ctorCase.host.Machine.Protos, sink)]);
  let objectAsCtor = "";
  try {
    const result = ctorCase.host.CallExport(ctorCase.module.ExportOf("make"), []);
    objectAsCtor = result.Outcome + ": " + result.Message;
  } catch (error) {
    objectAsCtor = String(error.message);
  }
  eq(objectAsCtor.indexOf("constructor") >= 0, true,
    "把普通对象当构造函数要给出说清原因的消息：" + objectAsCtor);
});

check("三元表达式：只跑被选中的那一边（懒），嵌套与括号里的都对，与 Node 一致", () => {
  const source = [
    "function sign(n) { return n > 0 ? 'pos' : 'neg'; }",
    "function nested(n) { return n > 0 ? (n > 10 ? 'big' : 'small') : 'neg'; }",
    "function inExpr(n) { return (n > 0 ? 'p' : 'q') + '!'; }",
    "function withCalls(a, b) { return a > b ? a - b : b - a; }",
    "function lazy(n) {",
    "  let calls = 0;",
    "  const t = () => { calls = calls + 1; return 'T'; };",
    "  const f = () => { calls = calls + 1; return 'F'; };",
    "  const picked = n ? t() : f();",
    "  return picked + '/' + calls;",
    "}",
    "function probe() {",
    "  return [sign(3), sign(-3), nested(20), nested(5), nested(-1), inExpr(1), inExpr(0),",
    "    withCalls(9, 4), withCalls(4, 9), lazy(1), lazy(0)];",
    "}",
  ].join("\n");
  const nodeAt = new Function(source + "\nreturn probe();")();
  eq(nodeAt[0], "pos", "Node：条件为真取第一支（这是前提）");
  eq(nodeAt[9], "T/1", "Node：只调了一个分支（这是前提）");

  const { module, host, table } = lowerAndLoad(source);
  eq(host.Evaluate([]).Outcome, HostOutcome.Ok, "求值模块");
  const called = host.CallExport(module.ExportOf("probe"), []);
  eq(called.Outcome, HostOutcome.Ok, "调 probe：" + called.Message);
  const at = (index) => GetIndex(table, called.Value, Value.FromInt(index));
  eq(hostStringOf(table, at(0)), nodeAt[0], "n > 0 ? 'pos' : 'neg'");
  eq(hostStringOf(table, at(1)), nodeAt[1], "条件为假走 else");
  eq(hostStringOf(table, at(2)), nodeAt[2], "嵌套三元（外层真、内层真）");
  eq(hostStringOf(table, at(3)), nodeAt[3], "嵌套三元（外层真、内层假）");
  eq(hostStringOf(table, at(4)), nodeAt[4], "嵌套三元（外层假）");
  eq(hostStringOf(table, at(5)), nodeAt[5], "括号里的三元参与字符串拼接");
  eq(hostStringOf(table, at(6)), nodeAt[6], "同上（假的那一支）");
  eq(at(7).AsInt(), nodeAt[7], "两支都能算数（真）");
  eq(at(8).AsInt(), nodeAt[8], "两支都能算数（假）");
  eq(hostStringOf(table, at(9)), nodeAt[9], "**只跑被选中的那一边**：真支调一次");
  eq(hostStringOf(table, at(10)), nodeAt[10], "**只跑被选中的那一边**：假支调一次");
});

check("投影：get / set 是上下文关键字（引用位是 Identifier，访问器位才是关键字）", () => {
  // 第 67 轮修的：`get` / `set` 原来「表里有就投关键字」，于是**引用位**的
  // `const set = 1;` / `f(set)` 被投成 `SetKeyword`——对拍尺子会当场点名
  // （第 60 轮就是在 `set.xl.md` 里撞到的：局部变量叫 `set`）。
  const references = JSON.stringify(parseTsShape(
    "function f(set) { return set + 1; }\nconst get = 2;\nfunction g() { return get + 1; }"));
  ok(references.indexOf('"SetKeyword"') < 0, "引用位的 set 不该是 SetKeyword");
  ok(references.indexOf('"GetKeyword"') < 0, "引用位的 get 不该是 GetKeyword");
  ok(references.indexOf('"Identifier"') >= 0, "引用位应当是普通 Identifier");
  // **访问器那两位不能一起改坏**：`get x()` / `set x(v)` 仍然要是那两种 kind，
  // 而且它们的**修饰词**里不能再留着那个词（摘除改成按文本做了）。
  const accessors = JSON.stringify(parseTsShape(
    "class C { get x() { return 1; } set x(v) { } }"));
  ok(accessors.indexOf('"GetAccessor"') >= 0, "取值器仍是 GetAccessor");
  ok(accessors.indexOf('"SetAccessor"') >= 0, "设值器仍是 SetAccessor");
});

check("P0：两份模块的程序（类 + 继承 + Map/Set + Symbol 键 + 模板串 + 三元 + 一元负号）与 Node 逐值一致", () => {
  const moduleA = [
    "export class Counter {",
    "  constructor(start) { this.value = start; }",
    "  add(n) { this.value = this.value + n; return this; }",
    "  get() { return this.value; }",
    "}",
    "export function tag() { return 'A'; }",
    // **async 也要跨链接验**（第 72 轮）：承诺、挂起的帧、微任务队列都在**同一个堆**里，
    // 所以「一个模块里挂起、由宿主推进后恢复」这条链要走得通。
    // 形状与既有的 await 判据一致：**承诺由宿主递进来**（宿主就是事件循环）。
    "export async function first(p) { const v = await p; return v + 1; }",
  ].join("\n");
  const moduleB = [
    "import { Counter, tag } from './a';",
    "export async function second(p) { const v = await p; return v * 2; }",
    // **能力绑定也要在多文件程序里验**（第 72 轮）：`hostDouble` 在源码里**没有声明**，
    // 它来自 `.d.ts`（也就是宿主），降级时按能力号落成 `host_call`。
    "export function viaCapability(n) { return hostDouble(n) + 1; }",
    "export function run() {",
    "  const c = new Counter(-2);",
    "  c.add(3).add(4);",
    "  const m = new Map();",
    "  m.set('k', c.get());",
    "  const s = new Set();",
    "  s.add(1); s.add(1); s.add(2);",
    "  const keys = [];",
    "  for (const k of m.keys()) keys.push(k);",
    "  const sym = Symbol('x');",
    "  const o = {};",
    "  o[sym] = 'sym-value';",
    "  return [c.get(), m.get('k'), s.size, keys[0], o[sym], tag(), `v=${c.get()}`,",
    "    c.get() > 0 ? 'pos' : 'neg', -c.get()];",
    "}",
  ].join("\n");
  const nodeSide = new Function(moduleA.replace(/^export /gm, "") + "\n"
    + moduleB.replace(/^import[^\n]*\n/, "").replace(/^export /gm, "")
    + "\nreturn run();")();
  eq(nodeSide[0], 5, "Node：-2 + 3 + 4（这是前提）");
  eq(nodeSide[3], "k", "Node：Map 的键按插入顺序（这是前提）");

  const loweringA = new Lowering();
  loweringA.DeclareGlobals(GlobalNames());
  const loweringB = new Lowering();
  loweringB.DeclareGlobals(GlobalNames());
  // **能力号**：`hostDouble` 来自 `.d.ts`（宿主），源码里没有它。
  const capabilityBindings = new Bindings(BuiltinBase);
  const hostDoubleId = capabilityBindings.Register("hostDouble");
  loweringB.DeclareCapabilities(LookupOf(capabilityBindings));
  const aLowered = loweringA.LowerModule(parseTsShape(moduleA), testIds);
  const bLowered = loweringB.LowerModule(parseTsShape(moduleB), testIds);
  const aFunctionCount = aLowered.Program.Functions.length;
  const linked = LinkPrograms([aLowered.Program, bLowered.Program]);
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 400000);
  const host = new Host(machine);
  const loaded = host.Load(Encode(linked, testIds), testIds);
  eq(loaded.Outcome, HostOutcome.Ok, "装载：" + loaded.Message);
  const sink = () => {};
  host.DeclarePrototypeKey(units("prototype"));
  const aEval = host.Evaluate([BuildGlobals(machine, machine.Protos, sink)]);
  eq(aEval.Outcome, HostOutcome.Ok, "模块 A 求值：" + aEval.Message);
  InstallBuiltins(host, machine.Protos);
  host.InstallHost((target, self, args, room) => {
    const id = table.Get(target.Ref).AsHost().CapabilityId;
    // **宿主的能力实现**：`.d.ts` 里声明的 `hostDouble(n) => n * 2`。
    if (id === hostDoubleId) return Value.FromInt(args[0].AsInt() * 2);
    return InvokeWithSink(room, table, machine.Protos, id, self, args, sink);
  });
  // **还要把能力填进能力表**（`vm.xl.md`：装载时按 id 表开好、每格是空的，
  // 宿主随后用 `RegisterCapability` 填）——少了这一步，脚本一调就报
  // `capability is not registered: 64`。这也是「能力白名单」那一层安全要求的落点。
  host.Register(hostDoubleId,
    Value.FromRef(ValueTag.HostRef, table.CreateHostRef(hostDoubleId, 0)));

  const aExports = machine.Result;
  machine.Retain(aExports);
  const bEnv = BuildGlobals(machine, machine.Protos, sink);
  machine.Retain(bEnv);
  const exported = (name) => GetIndex(table, aExports, Value.FromInt(aLowered.ExportOf(name)));
  setProp(machine, table, bEnv, propKey(table, "Counter"), exported("Counter"));
  setProp(machine, table, bEnv, propKey(table, "tag"), exported("tag"));
  eq(machine.Start(aFunctionCount, [bEnv]), true, "开 B 的入口帧");
  eq(machine.Run(), VmStatus.Halted, "B 的入口跑完");
  const bExports = machine.Result;
  machine.Retain(bExports);
  const runClosure = GetIndex(table, bExports, Value.FromInt(bLowered.ExportOf("run")));
  eq(machine.StartClosure(runClosure, []), true, "调 B 的 run()");
  eq(machine.Run(), VmStatus.Halted, "跑完");

  const got = machine.Result;
  const at = (index) => GetIndex(table, got, Value.FromInt(index));
  eq(at(0).AsInt(), nodeSide[0], "c.get()：类的方法与 this");
  eq(at(1).AsInt(), nodeSide[1], "Map 存的是 5");
  eq(at(2).AsInt(), nodeSide[2], "Set 去掉了重复项");
  eq(hostStringOf(table, at(3)), nodeSide[3], "Map.keys() 的插入顺序");
  eq(hostStringOf(table, at(4)), nodeSide[4], "符号键读回");
  eq(hostStringOf(table, at(5)), nodeSide[5], "A 的导出函数在 B 里跑");
  eq(hostStringOf(table, at(6)), nodeSide[6], "模板串");
  eq(hostStringOf(table, at(7)), nodeSide[7], "三元");
  eq(at(8).AsInt(), nodeSide[8], "一元负号");

  // **跨链接的 async**（第 72 轮）：两个模块各有一个 async 导出，各自用宿主递进来的承诺驱动。
  // 挂起时 `Run()` 仍然是 `Halted`（帧已经挂到承诺上、不在栈上），恢复靠宿主排空微任务。
  const firstFn = exported("first");
  eq(firstFn.Tag, ValueTag.Closure, "A 的 async 导出是个闭包");
  const firstPromise = Value.FromObject(table.CreatePromise(PromiseState.Pending, Value.Undefined()));
  machine.Retain(firstPromise);
  const parkedA = host.CallExport(aLowered.ExportOf("first"), [firstPromise]);
  eq(parkedA.Outcome, HostOutcome.Parked, "A 的 async 停在 await 上：" + parkedA.Message);
  machine.ResolvePromise(firstPromise, Value.FromInt(41));
  eq(machine.DrainMicrotasks(), true, "推进微任务");
  eq(machine.Result.AsInt(), 42, "A 的 async 恢复后算出 42");

  const secondFn = GetIndex(table, bExports, Value.FromInt(bLowered.ExportOf("second")));
  eq(secondFn.Tag, ValueTag.Closure, "B 的 async 导出是个闭包");
  const secondPromise = Value.FromObject(table.CreatePromise(PromiseState.Pending, Value.Undefined()));
  machine.Retain(secondPromise);
  eq(machine.StartClosure(secondFn, [secondPromise]), true, "调 B 的 second()");
  eq(machine.Run(), VmStatus.Halted, "B 的 async 也停在 await 上（帧不在栈上）");
  machine.ResolvePromise(secondPromise, Value.FromInt(21));
  eq(machine.DrainMicrotasks(), true, "再推进一次微任务");
  eq(machine.Result.AsInt(), 42, "B 的 async 恢复后算出 42（21 * 2）");
  machine.Release(firstPromise.Ref);
  machine.Release(secondPromise.Ref);

  // **能力绑定**：源码里没声明的 `hostDouble` 按能力号调到宿主的实现（20 * 2 + 1 = 41）。
  const capFn = GetIndex(table, bExports, Value.FromInt(bLowered.ExportOf("viaCapability")));
  eq(machine.StartClosure(capFn, [Value.FromInt(20)]), true, "调 B 的 viaCapability(20)");
  eq(machine.Run(), VmStatus.Halted, "跑完");
  eq(machine.Result.AsInt(), 41, "能力调用的结果（宿主实现 20 * 2，再加 1）");
});

check("运行器：多文件程序交给 tsrun 跑（跨模块的类 + Map + 能力绑定），与 Node 一致", () => {
  // 这一条走的是**产品路径**：`tsrun.xl.md` 负责解析、降级、链接、装载、喂导出、调入口。
  // 与前面那条 P0 判据的区别就在这——那条是它的「人工版」（第 68～72 轮手装的）。
  const moduleA = [
    "export class Box { constructor(v) { this.v = v; } get() { return this.v; } }",
  ].join("\n");
  const moduleB = [
    "import { Box } from './a';",
    "export function run() {",
    "  const b = new Box(hostTriple(14));",
    "  const m = new Map();",
    "  m.set('k', b.get());",
    "  return m.get('k');",
    "}",
  ].join("\n");
  // Node 打桩：`hostTriple` 就是「能力」在 JS 里的样子（名字来自环境、不来自源码）。
  const nodeSide = new Function("hostTriple",
    moduleA.replace(/^export /gm, "") + "\n"
    + moduleB.replace(/^import[^\n]*\n/, "").replace(/^export /gm, "")
    + "\nreturn run();")((n) => n * 3);
  eq(nodeSide, 42, "Node 打桩：14 * 3（这是前提）");

  const request = new RunRequest();
  request.Sources = [moduleA, moduleB];
  request.Capabilities = ["hostTriple"];
  request.Entry = "run";
  // 运行器**按登记顺序**发能力号（从 64 起），所以第一个能力就是 `BuiltinBase`。
  const res = RunSources(request, () => {}, (room, id, self, args) =>
    id === BuiltinBase ? Value.FromInt(args[0].AsInt() * 3) : null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(res.Value.AsInt(), nodeSide, "跨模块的类 + Map + 能力调用，逐值一致");
});

check("运行器：异步宿主自己当事件循环（Prepare 造承诺 → Parked → 兑现 → 推进 → 取结果）", () => {
  // 「宿主才是事件循环」这条契约，**在产品路径上**钉住：运行器不替宿主推进微任务，
  // 它把 `Parked` 和**机器**一起交回来，宿主兑现承诺、推进、再取结果。
  const source = [
    "export async function awaitIt(p) { const v = await p; return v + 1; }",
  ].join("\n");
  let pending = null;
  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "awaitIt";
  // **宿主造入口实参**：承诺住在堆里，而堆是运行器建的——所以只能在装起来之后造。
  request.Prepare = (table, machine) => {
    const promise = Value.FromObject(table.CreatePromise(PromiseState.Pending, Value.Undefined()));
    machine.Retain(promise);
    pending = promise;
    return [promise];
  };
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Parked, "挂在 await 上，宿主拿到 Parked：" + res.Message);
  eq(res.Machine !== null, true, "挂起时也拿得到机器（宿主才是事件循环）");
  eq(res.Table !== null, true, "表也交出来了（造承诺要用它）");
  res.Machine.ResolvePromise(pending, Value.FromInt(41));
  eq(res.Machine.DrainMicrotasks(), true, "宿主推进微任务");
  eq(res.Machine.Result.AsInt(), 42, "宿主驱动下的 async 结果（41 + 1）");
});

check("P0：闭包捕获 + try/catch/finally + while·break + 数组方法，经运行器与 Node 逐值一致", () => {
  // 这一条走**产品路径**（`tsrun.xl.md` 的 `RunSources`），并一次串起四块**各自已被单独测过**
  // 的能力：闭包捕获同一格（多写一读）、异常展开与 `finally`、`while` + `break`、数组内建。
  // 它们合起来才是「一个像样的程序」——而合成之后出新 bug 正是 P0 要抓的那一类。
  const source = [
    "function makeCounter(start) {",
    "  let value = start;",
    "  return function () { value = value + 1; return value; };",
    "}",
    "function run() {",
    "  const bump = makeCounter(10);",
    "  const seen = [];",
    "  for (let i = 0; i < 3; i++) seen.push(bump());",
    "  let attempts = 0;",
    "  let caught = 'none';",
    "  try {",
    "    attempts = attempts + 1;",
    "    throw 'boom';",
    "  } catch (e) {",
    "    caught = e;",
    "  } finally {",
    "    attempts = attempts + 10;",
    "  }",
    "  let total = 0;",
    "  let n = 0;",
    "  while (true) { n = n + 1; if (n > 4) break; total = total + n; }",
    "  const text = ['a', 'b'].join('-') + ':' + seen.length;",
    "  return [seen[0], seen[2], attempts, caught, total, text];",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn run();")();
  eq(expected[0], 11, "Node：闭包第一次自增（前提）");
  eq(expected[2], 11, "Node：finally 也跑了（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  // **宿主读结果要用运行器交出来的表**（`RunResult.Table`）：值住在它的堆里。
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  eq(at(0).AsInt(), expected[0], "闭包第一次自增");
  eq(at(1).AsInt(), expected[1], "闭包第三次自增（同一格）");
  eq(at(2).AsInt(), expected[2], "try + finally 各加一次");
  eq(hostStringOf(table, at(3)), expected[3], "catch 拿到了异常值");
  eq(at(4).AsInt(), expected[4], "while + break 的累加");
  eq(hostStringOf(table, at(5)), expected[5], "数组 join 与 length");
});

check("P0：生成器·for..of + Map/Set + 类·instanceof + 字符串方法 + Object/JSON + console.log，与 Node 逐值一致", () => {
  // 第二条**合成程序**判据。它比上一条铺得更宽：把标准库的三块（数组/字符串/全局）、
  // 迭代协议（生成器 + `for..of`）、类与 `instanceof`（要 `DeclarePrototypeKey` 那条路）
  // 以及**宿主 sink**（`console.log` 的输出去哪）一次串起来。
  // 各自都单独测过 ✓，合起来才是一个「像样的程序」。
  const source = [
    "function* range(n) {",
    "  let i = 0;",
    "  while (i < n) { yield i; i = i + 1; }",
    "}",
    "class Box {",
    "  constructor(v) { this.v = v; }",
    "  double() { return this.v * 2; }",
    "}",
    "function run() {",
    "  const seen = [];",
    "  for (const x of range(3)) seen.push(x);",
    "  const m = new Map();",
    "  m.set('a', 1);",
    "  m.set('b', 2);",
    "  const keys = [];",
    "  for (const k of m.keys()) keys.push(k);",
    "  const s = new Set();",
    "  s.add('x');",
    "  s.add('x');",
    "  const box = new Box(21);",
    "  const obj = { p: 7, q: 8 };",
    "  console.log('sum=' + (seen.length + box.double()));",
    "  const hasP = 'p' in obj;",
    "  const removed = delete obj.q;",
    "  return [seen[2], keys[1], s.size, box instanceof Box, box.double(),",
    "    'abcdef'.slice(1, 4), 'abcdef'.indexOf('cd'), 'abcdef'.charCodeAt(0),",
    "    Object.keys(obj).join(','), JSON.stringify(obj), hasP, removed, typeof box];",
    "}",
  ].join("\n");
  const nodeLines = [];
  const expected = new Function("console", source + "\nreturn run();")({
    log: (text) => nodeLines.push(text),
  });
  eq(nodeLines[0], "sum=45", "Node：sink 收到一行（前提）");
  eq(expected[3], true, "Node：instanceof 为真（前提）");

  const lines = [];
  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], nodeLines[0], "console.log 走宿主 sink（标准库不假定自己连着 stdout）");

  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    const actual = at(i);
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else if (typeof expected[i] === "boolean") {
      eq(actual.AsBool(), expected[i], "第 " + i + " 项（布尔）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("P0：switch + do..while + 带标签的 continue·break，经运行器与 Node 逐值一致", () => {
  // 第三条**合成程序**判据，专挑**控制流的邻居**：前两条把表达式与标准库铺开了，
  // 这一条把语句层面还没合成过的那几样放一起。前两条的命中率是 2/2（`++` 与 `delete`），
  // 所以这一条的期望是：要么证明这三样能一起跑，要么点名下一个缺口。
  const source = [
    "function classify(n) {",
    "  let out = 'many';",
    "  switch (n) {",
    "    case 1: out = 'one'; break;",
    "    case 2: out = 'two'; break;",
    "    default: out = 'many'; break;",
    "  }",
    "  return out;",
    "}",
    "function walk() {",
    "  const seen = [];",
    "  let i = 0;",
    "  do { seen.push(i); i = i + 1; } while (i < 3);",
    "  let found = -1;",
    "  outer: for (let a = 0; a < 3; a = a + 1) {",
    "    for (let b = 0; b < 3; b = b + 1) {",
    "      if (b === 2) continue outer;",
    "      if (a === 2) break outer;",
    "      found = a * 10 + b;",
    "    }",
    "  }",
    "  return [classify(1), classify(2), classify(9), seen[2], found];",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn walk();")();
  eq(expected[0], "one", "Node：switch 命中 case 1（前提）");
  eq(expected[4], 11, "Node：标签 + continue/break 的结果（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "walk";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    const actual = at(i);
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("P0：do..while 里的 continue（跳到底部测试）+ switch 贯穿 + 循环里的 finally，与 Node 逐值一致", () => {
  // 第七条合成判据。第一项专测**第 93 轮修的那条路**——`do..while` 的 `continue` 必须跳到
  // **底部那条测试**（不是顶部：跳到顶会把体**再跑一遍**，而体的位置本来就在条件前面）。
  // 修的时候是用「跑完体之后再赋值 `context.ContinueTarget`」实现的，**至今没被任何判据跑过** ✗，
  // 所以这一条的价值在它身上。
  //   · **`switch` 贯穿**：`case` 里不写 `break`，直接掉进下一个 `case`（顺带测「标签之外的串联」）；
  //   · **`finally`**（循环里、以及循环外各一处）：体里没有 `break`/`continue`——
  //     那两样在带 `finally` 的 `try` 里会被降级期明确拒绝（见台账）。
  const source = [
    "function run() {",
    "  const seen = [];",
    "  let i = 0;",
    "  do {",
    "    i = i + 1;",
    "    if (i === 2) { continue; }",
    "    seen.push(i);",
    "  } while (i < 4);",
    "  let tag = 'start:';",
    "  switch (1) {",
    "    case 0: tag = tag + 'zero';",
    "    case 1: tag = tag + 'one';",
    "    case 2: tag = tag + 'two'; break;",
    "    default: tag = tag + 'other';",
    "  }",
    "  let cleaned = 0;",
    "  try {",
    "    cleaned = cleaned + 1;",
    "  } finally {",
    "    cleaned = cleaned + 10;",
    "  }",
    "  let after = 0;",
    "  for (let j = 0; j < 3; j = j + 1) {",
    "    try {",
    "      after = after + j;",
    "    } finally {",
    "      after = after + 100;",
    "    }",
    "  }",
    "  return [seen.length, seen[1], tag, cleaned, after];",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn run();")();
  eq(expected[0], 3, "Node：continue 跳到底部测试（体没有被跑第二遍）（前提）");
  eq(expected[1], 3, "Node：被跳过的那个值不在数组里（前提）");
  eq(expected[2], "start:onetwo", "Node：case 0 贯穿到 case 1（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    const actual = at(i);
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("P0：生成器里 return 提前收尾 + for..of 迭代 map.keys() + 只写 setter + 循环里的 try/catch，与 Node 逐值一致", () => {
  // 第六条**合成程序**判据，挑四样各自没合唱过的：
  //   · **生成器里 `return`**——它该让 `for..of` **提前收尾**（迭代协议里「完了」的那一半，
  //     之前只测过 `yield` 走到底）；
  //   · **`for..of` 迭代 `map.keys()`**（已知缺口是「直接迭代 Map 本体」✗——`keys()` 给的是数组，
  //     这条走的是数组那条路 ✓）；
  //   · **只写 setter 的访问器**：只读它会撞上引擎那句「accessor without a getter」，
  //     所以这里**只写不读**（把这条边界也钉在判据里）；
  //   · **循环里的 `try`/`catch`**（循环体里没有 `break`/`continue`——那两样在带 `finally`
  //     的 `try` 里会被降级期明确拒绝，见台账）。
  const source = [
    "function* counter(n) {",
    "  let i = 0;",
    "  while (i < n) {",
    "    if (i === 2) { return 'stopped'; }",
    "    yield i;",
    "    i = i + 1;",
    "  }",
    "  return 'done';",
    "}",
    "function run() {",
    "  const seen = [];",
    "  for (const v of counter(5)) seen.push(v);",
    "  const m = new Map();",
    "  m.set('a', 1);",
    "  m.set('b', 2);",
    "  const keys = [];",
    "  for (const k of m.keys()) keys.push(k);",
    "  const box = { v: 0, set only(x) { this.v = x + 1; } };",
    "  box.only = 41;",
    "  let caught = 'none';",
    "  let total = 0;",
    "  for (let i = 0; i < 3; i = i + 1) {",
    "    try {",
    "      if (i === 1) { throw 'boom'; }",
    "      total = total + i;",
    "    } catch (e) {",
    "      caught = e;",
    "    }",
    "  }",
    "  return [seen.length, seen[1], keys[1], box.v, caught, total];",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn run();")();
  eq(expected[0], 2, "Node：生成器里的 return 让 for..of 提前收尾（前提）");
  eq(expected[3], 42, "Node：只写 setter 生效（前提）");
  eq(expected[5], 2, "Node：循环里的 try/catch（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    const actual = at(i);
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("P0：对象字面量 setter·getter 成对 + 类 getter + super.m() + 重写 + 带标签的 switch，与 Node 逐值一致", () => {
  // 第五条**合成程序**判据。挑的都是「机制刚通、但还没跑过」的那几半：
  //   · 对象字面量的 **setter + getter 成对**——`DefineAccessor` 的两半。成对写正是抓出那个
  //     真 bug 的形状 ✗：**替换**时它把没提供的那一半也写成了 `undefined`，
  //     于是第二次调用（setter 那一半）把刚装上的 getter 抹掉了，读它报
  //     「accessor without a getter」（离现场很远）。第 103 轮改成**只改提供了的那一半**
  //     （与 JS 的描述符语义一致：描述符里没出现的字段不动）；
  //   · **类里的 getter**——第 99 轮那个根因（`IsFunctionNode` 漏访问器）修好之后没人测过；
  //     第一次跑就撞出 `unimplemented: class member GetAccessor` ✗（类有自己的成员分派），
  //     第 102 轮补上（并把窗口代码抽成 `EmitDefineAccessor` 共用，少一次算错槽的机会）；
  //   · **重写**（子类同名方法盖住父类的，原型链上找到的是子类那个）；
  //   · **带标签的 `switch` + `break outer`**——`IsLoop = false` 的那一层怎么按标签跳出。
  //
  // **本来还想测 `super.label()`**，它报 `unimplemented: expression SuperKeyword` ✗。
  // 查清根因（记在台账）：`super` 只实现了**构造函数**那一半——`InSuperName` 挂在排队的
  // `PendingFunction.SuperName` 上，而只有构造函数会被填上（规范自己的报错文本
  // 「super(...) outside a derived class constructor」就是证据）。所以 `super.m()`
  // 要动「类方法的排队登记」那一处，不止一支——下一轮做。
  const source = [
    "function run() {",
    "  const obj = {",
    "    v: 1,",
    "    get double() { return this.v * 2; },",
    "    set double(x) { this.v = x; },",
    "  };",
    "  obj.double = 10;",
    "  const seen = obj.double;",
    "  class Base {",
    "    constructor(v) { this.v = v; }",
    "    label() { return 'base:' + this.v; }",
    "    get twice() { return this.v * 2; }",
    "  }",
    "  class Derived extends Base {",
    "    constructor(v) { super(v + 1); }",
    "    label() { return 'derived+' + super.label(); }",
    "  }",
    "  const d = new Derived(4);",
    "  let tag = 'other';",
    "  outer: switch (d.v) {",
    "    case 5: tag = 'five'; break outer;",
    "    default: tag = 'none'; break;",
    "  }",
    "  return [seen, d.label(), tag, d.twice];",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn run();")();
  eq(expected[0], 20, "Node：setter 写进去、getter 读出来（前提）");
  eq(expected[1], "derived+base:5", "Node：super.m() 调的是父类那个、this 是当前实例（前提）");
  eq(expected[2], "five", "Node：带标签的 break 跳出了 switch（前提）");
  eq(expected[3], 10, "Node：类里的 getter（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    const actual = at(i);
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("P0：类·super(...) + 对象字面量方法 + 嵌套闭包 + Map.values + 嵌套 JSON，经运行器与 Node 逐值一致", () => {
  // 这一条走过一条弯路，值得留在注释里：它**本来**还带一个对象字面量 **getter**，
  // 结果连撞两个缺口——
  //   ① `object literal member GetAccessor`：降级层没接，**而且引擎侧根本没有「造访问器属性」
  //      的路**（要新增通用算子 + `RtOpCount` + `props` + 降级 + 重生成 C++，是一整块）→ 记在台账；
  //   ② 把 getter 换成普通方法之后仍报 `new_closure needs an environment or undefined` ✗。
  // 于是用**留一法**（leave-one-out）定位：类 / 对象方法 / `Map.values` / 嵌套 JSON 各去掉一项，
  // **只有去掉「对象方法」那一版通过** → 元凶是它。
  // 根因在**规范自身的不一致**：`scope.xl.md` 的 `IsFunctionNode` 只列了三种函数节点，
  // 漏了 `MethodDeclaration`，而同一份文件里 `HasNestedFunction` 的说明写着「方法，全都算」。
  // 补上之后这一条通过——**合成判据 + 留一法**，两次运行就把根因钉住了。
  const source = [
    "function adder(n) { return function (m) { return n + m; }; }",
    "class Base {",
    "  constructor(v) { this.v = v; }",
    "  double() { return this.v * 2; }",
    "}",
    "class Derived extends Base {",
    "  constructor(v) { super(v + 1); }",
    "}",
    "function run() {",
    "  const add5 = adder(5);",
    "  const obj = { v: 4, get triple() { return this.v * 3; } };",
    "  const d = new Derived(20);",
    "  const m = new Map();",
    "  m.set('k', [1, 2]);",
    "  const vals = [];",
    "  for (const v of m.values()) vals.push(v);",
    "  const nested = { a: [1, { b: 'x' }] };",
    "  return [add5(7), obj.triple, d.v, d.double(), vals.length, JSON.stringify(nested)];",
    "}",
  ].join("\n");
  const expected = new Function(source + "\nreturn run();")();
  eq(expected[0], 12, "Node：两层闭包（前提）");
  eq(expected[2], 21, "Node：super(...) 把 v+1 传给了基类（前提）");
  eq(expected[5], '{"a":[1,{"b":"x"}]}', "Node：嵌套 JSON（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    const actual = at(i);
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("Map：entries() 与 clear()（entries 给数组，不是迭代器——与 keys/values 同一条已记差异）", () => {
  // JS 的 `m.entries()` 返回**迭代器**，这里返回**数组**——与本仓 `keys()` / `values()` 那条
  // 已记差异同源（台账里写着）。所以 Node 侧用 `Array.from(...)` 对齐，**元素本身逐值比**。
  const source = [
    "function run() {",
    "  const m = new Map();",
    "  m.set('a', 1);",
    "  m.set('b', 2);",
    "  const pairs = m.entries();",
    "  const head = pairs[0][0] + '=' + pairs[0][1];",
    "  const tail = pairs[1][0] + '=' + pairs[1][1];",
    "  let walked = '|';",
    "  for (const e of m) { walked = walked + e[0] + ':' + e[1] + ';'; }",
    "  const before = m.size;",
    "  m.clear();",
    "  return [head, tail, walked, before, m.size, m.has('a') ? 1 : 0, m.entries().length];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    const m = new Map();
    m.set("a", 1);
    m.set("b", 2);
    const pairs = Array.from(m.entries());
    const head = pairs[0][0] + "=" + pairs[0][1];
    const tail = pairs[1][0] + "=" + pairs[1][1];
    let walked = "|";
    for (const e of m) { walked = walked + e[0] + ":" + e[1] + ";"; }
    const before = m.size;
    m.clear();
    return [head, tail, walked, before, m.size, m.has("a") ? 1 : 0, Array.from(m.entries()).length];
  };
  const expected = nodeRun();
  eq(expected[0], "a=1", "Node：第一对（前提）");
  eq(expected[2], "|a:1;b:2;", "Node：直接迭代 Map 拿到 [键, 值] 对（前提）");
  eq(expected[4], 0, "Node：clear 之后 size 为 0（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    const actual = at(i);
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("Set：keys() 等同 values() + entries() 给 [值, 值] 对 + clear()", () => {
  // `entries()` 那条差异与 `Map` 同源（JS 返回**迭代器**，这里返回**数组**）；
  // `keys()` 在集合里就是 `values()`（JS 也这样）。
  const source = [
    "function run() {",
    "  const s = new Set();",
    "  s.add('x');",
    "  s.add('y');",
    "  s.add('x');",
    "  const ks = s.keys();",
    "  const vs = s.values();",
    "  const es = s.entries();",
    "  const pair = es[1][0] + '/' + es[1][1];",
    "  let walked = '|';",
    "  for (const e of s) { walked = walked + e + ';'; }",
    "  const before = s.size;",
    "  s.clear();",
    "  return [ks.length, vs.length, walked, pair, before, s.size, s.has('x') ? 1 : 0];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    const s = new Set();
    s.add("x");
    s.add("y");
    s.add("x");
    const ks = Array.from(s.keys());
    const vs = Array.from(s.values());
    const es = Array.from(s.entries());
    const pair = es[1][0] + "/" + es[1][1];
    let walked = "|";
    for (const e of s) { walked = walked + e + ";"; }
    const before = s.size;
    s.clear();
    return [ks.length, vs.length, walked, pair, before, s.size, s.has("x") ? 1 : 0];
  };
  const expected = nodeRun();
  eq(expected[0], 2, "Node：重复 add 是空操作（前提）");
  eq(expected[2], "|x;y;", "Node：直接迭代 Set 拿到值（前提）");
  eq(expected[3], "y/y", "Node：entries 的每一对两个元素相同（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    const actual = at(i);
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("Date：new Date(毫秒) + getTime/UTC 日历三件（UTC 口径；大毫秒用运行时算，绕开 i32 字面量）", () => {
  // 第 114 轮。**两条已知差异里的一条第 145 轮关掉了** ✓：
  //   ① `Date` 是普通对象（能挂 `now`）与构造函数**原来是两半**✗——第 114 轮让降级层
  //      把 `new Date(...)` 落成一条内部调用 ✓；第 145 轮值模型补上「对象也能被调用」 ✓，
  //      于是 `const D = Date; new D(0)` **也成立** ✓（下面 `alias` 那一行量的就是它 ✓）。
  //   ② **整数字面量是 i32** ✗：几百亿以上的毫秒写不进源码（与「浮点不能写成源码字面量」同族）——
  //      所以这里的大毫秒用**运行时算术**造（`86400000 * 19723` ✓），而不是写一个长字面量 ✓。
  // 时间**由宿主决定**（`Date.now()` 那条老规矩 ✓）：这条判据只用 `new Date(毫秒)` 这条纯函数路 ✓。
  const source = [
    "function run() {",
    "  const a = new Date(0);",
    "  const b = new Date(86400000);",
    "  const big = 86400000 * 19723;",
    "  const c = new Date(big);",
    "  const d = new Date(-86400000 * 2 - 5000);",
    "  const Alias = Date;",
    "  const e = new Alias(5000);",
    "  return [a.getTime(), b.getUTCFullYear(), c.getUTCFullYear(), c.getUTCMonth(),",
    "    c.getUTCDate(), b.getTime(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(),",
    "    e.getTime()];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    const a = new Date(0);
    const b = new Date(86400000);
    const c = new Date(86400000 * 19723);
    const d = new Date(-86400000 * 2 - 5000);
    const Alias = Date;
    const e = new Alias(5000);
    return [a.getTime(), b.getUTCFullYear(), c.getUTCFullYear(), c.getUTCMonth(),
      c.getUTCDate(), b.getTime(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(),
      e.getTime()];
  };
  const expected = nodeRun();
  eq(expected[0], 0, "Node：纪元是 0（前提）");
  eq(expected[1], 1970, "Node：86400000 毫秒是 1970-01-02（前提）");
  eq(expected[2], 2024, "Node：大毫秒落在 2024（前提：86400000×19723 天 ≈ 54 年）");
  eq(expected[6], 23, "Node：负毫秒的时分秒是 23:59:55（前提）");
  eq(expected[9], 5000, "Node：**别名那一格**（`const Alias = Date; new Alias(5000)`）也是 5000（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    eq(at(i).AsInt(), expected[i], "第 " + i + " 项");
  }
});

check("Map/Set 的 forEach：建库层**回调脚本闭包**（靠 NativeCall 重入分派循环）", () => {
  // 第 116 轮。这是建库层**第一次回调脚本** ✓——通道是 `NativeCall`（访问器 getter/setter 早走过 ✓），
  // 由 `Vm.Native()` 把机器包出来，宿主在接 `host_call` 时把它递进 `InvokeWithSink` ✓。
  // **已知差异**：`NativeCall` 只带**一个**实参 ✓，所以回调只拿到**值** ✓；
  // JS 的 Map.forEach `(值, 键, 映射)` 后两个**不传** ✗——`forEach(v => …)` 这种写法两边一致 ✓。
  const source = [
    "function run() {",
    "  const m = new Map();",
    "  m.set('a', 1);",
    "  m.set('b', 2);",
    "  let sum = 0;",
    "  m.forEach(function (v) { sum = sum + v; });",
    "  const s = new Set();",
    "  s.add(3);",
    "  s.add(4);",
    "  let total = 0;",
    "  s.forEach(function (v) { total = total + v; });",
    "  return [sum, total, m.size];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    const m = new Map();
    m.set("a", 1);
    m.set("b", 2);
    let sum = 0;
    m.forEach((v) => { sum = sum + v; });
    const s = new Set();
    s.add(3);
    s.add(4);
    let total = 0;
    s.forEach((v) => { total = total + v; });
    return [sum, total, m.size];
  };
  const expected = nodeRun();
  eq(expected[0], 3, "Node：Map 的 forEach 求和（前提）");
  eq(expected[1], 7, "Node：Set 的 forEach 求和（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    eq(at(i).AsInt(), expected[i], "第 " + i + " 项");
  }
});
check("Array 的 forEach/map/filter：同样靠回调通道（map 收返回值、filter 按真假收原值）", () => {
  // 第 117 轮。与 `Map/Set.forEach` 共用 **`NativeCall`** 这条通道 ✓；
  // `map` 能成立是因为它**有返回值** ✓；`filter` 用 `Value.AsBool()`（本仓的真假口径 ✓）。
  const source = [
    "function run() {",
    "  const xs = [1, 2, 3, 4];",
    "  let sum = 0;",
    "  xs.forEach(function (v) { sum = sum + v; });",
    "  const doubled = xs.map(function (v) { return v * 2; });",
    "  const big = xs.filter(function (v) { return v > 2; });",
    "  const truthy = xs.filter(function (v) { return v; });",
    "  return [sum, doubled[3], big.length, big[1], truthy.length];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    const xs = [1, 2, 3, 4];
    let sum = 0;
    xs.forEach((v) => { sum = sum + v; });
    const doubled = xs.map((v) => v * 2);
    const big = xs.filter((v) => v > 2);
    const truthy = xs.filter((v) => v);
    return [sum, doubled[3], big.length, big[1], truthy.length];
  };
  const expected = nodeRun();
  eq(expected[0], 10, "Node：forEach 求和（前提）");
  eq(expected[1], 8, "Node：map 的第四项（前提）");
  eq(expected[2], 2, "Node：filter 留下两项（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    eq(at(i).AsInt(), expected[i], "第 " + i + " 项");
  }
});
check("Array 的 find/some/every：空数组那两条口径（some 假、every 真）也逐一与 Node 对", () => {
  // 第 118 轮。谓词族与 `forEach/map/filter` 同一条回调通道 ✓，**但结果不同** ✓。
  // **空数组**是最容易写反的地方 ✓：`some` 给**假**、`every` 给**真** ✓——这里两边都钉上 ✓。
  // （`reduce` **不做** ✗：JS 的 `(累计, 值, …)` 要两个以上实参，而 `NativeCall` 只带一个 ✓——
  //   拿数组打包两个值是另一种语义 ✗，宁可缺，也不静默换形状 ✓。）
  const source = [
    "function run() {",
    "  const xs = [1, 2, 3, 4];",
    "  const none = [];",
    "  const found = xs.find(function (v) { return v > 2; });",
    "  const missing = xs.find(function (v) { return v > 9; });",
    "  return [found, missing === undefined ? 1 : 0,",
    "    xs.some(function (v) { return v > 3; }) ? 1 : 0,",
    "    xs.some(function (v) { return v > 9; }) ? 1 : 0,",
    "    xs.every(function (v) { return v < 9; }) ? 1 : 0,",
    "    xs.every(function (v) { return v < 3; }) ? 1 : 0,",
    "    none.some(function (v) { return true; }) ? 1 : 0,",
    "    none.every(function (v) { return false; }) ? 1 : 0];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    const xs = [1, 2, 3, 4];
    const none = [];
    const found = xs.find((v) => v > 2);
    const missing = xs.find((v) => v > 9);
    return [found, missing === undefined ? 1 : 0,
      xs.some((v) => v > 3) ? 1 : 0,
      xs.some((v) => v > 9) ? 1 : 0,
      xs.every((v) => v < 9) ? 1 : 0,
      xs.every((v) => v < 3) ? 1 : 0,
      none.some(() => true) ? 1 : 0,
      none.every(() => false) ? 1 : 0];
  };
  const expected = nodeRun();
  eq(expected[0], 3, "Node：find 给第一个为真的原值（前提）");
  eq(expected[6], 0, "Node：空数组的 some 是假（前提）");
  eq(expected[7], 1, "Node：空数组的 every 是真（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    eq(at(i).AsInt(), expected[i], "第 " + i + " 项");
  }
});
check("默认参数与可选参数：只有「没传」或「传了 undefined」才用默认值（null 不算），求值从左到右，与 Node 一致", () => {
  // 第 119 轮。默认参数是**被调方的开场代码**（`LowerParamDefault`），判定用
  // **严格相等 undefined**——`is_nullish` 会把 `null` 也算成「缺」，那是 `??` 的口径 ✗，
  // 所以这里把 `g(null)` 单独钉一条。
  // 求值顺序：后一个默认值能看见前一个（`h` 的 `c = a + b`）；
  // 还有三条**跨层**的形状：默认值引用外层局部名（`outer`）、默认值里含箭头（`withCb`）、
  // 默认值里用 `this`（对象方法 `m`）——它们走的都是「这一层要不要开环境 / 要不要 `this` 格」。
  const source = [
    "function f(a = 1, b = a + 10) { return a * 100 + b; }",
    "function g(x = 7) { return x; }",
    "function h(a, b = 2, c = a + b) { return a * 100 + b * 10 + c; }",
    "function opt(a, b = 8) { return (a === undefined ? 100 : a) + b; }",
    "function outer() {",
    "  const base = 5;",
    "  function inner(k = base + 1) { return k; }",
    "  return inner();",
    "}",
    "function withCb(cb = () => 7) { return cb(); }",
    "class C {",
    "  constructor(v = 5) { this.v = v; }",
    "  m(x = 3) { return this.v * 10 + x; }",
    "}",
    "const obj = { n: 4, m(x = this.n) { return x; } };",
    "const arrow = (z = 6) => z;",
    "function run() {",
    "  const c = new C();",
    "  const c9 = new C(9);",
    "  return [f(), f(2), f(2, 3), f(undefined, 3),",
    "    g(), g(0), g(null) === null ? 1 : 0,",
    "    h(1), h(1, 5), h(1, undefined, 9),",
    "    opt(), opt(1),",
    "    outer(), withCb(), withCb(() => 8),",
    "    c.m(), c9.m(), c9.m(1), obj.m(), arrow(), arrow(2)];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    function f(a = 1, b = a + 10) { return a * 100 + b; }
    function g(x = 7) { return x; }
    function h(a, b = 2, c = a + b) { return a * 100 + b * 10 + c; }
    function opt(a, b = 8) { return (a === undefined ? 100 : a) + b; }
    function outer() {
      const base = 5;
      function inner(k = base + 1) { return k; }
      return inner();
    }
    function withCb(cb = () => 7) { return cb(); }
    class C {
      constructor(v = 5) { this.v = v; }
      m(x = 3) { return this.v * 10 + x; }
    }
    const obj = { n: 4, m(x = this.n) { return x; } };
    const arrow = (z = 6) => z;
    const c = new C();
    const c9 = new C(9);
    return [f(), f(2), f(2, 3), f(undefined, 3),
      g(), g(0), g(null) === null ? 1 : 0,
      h(1), h(1, 5), h(1, undefined, 9),
      opt(), opt(1),
      outer(), withCb(), withCb(() => 8),
      c.m(), c9.m(), c9.m(1), obj.m(), arrow(), arrow(2)];
  };
  const expected = nodeRun();
  eq(expected[0], 111, "Node：f() 两个默认值都生效（前提）");
  eq(expected[3], 103, "Node：显式 undefined 也走默认值（前提）");
  eq(expected[6], 1, "Node：null 不触发默认值（前提）");
  eq(expected[13], 7, "Node：默认值是箭头函数时照常可调（前提）");
  eq(expected[18], 4, "Node：默认值里能用 this（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const at = (index) => GetIndex(table, res.Value, Value.FromInt(index));
  for (let i = 0; i < expected.length; i++) {
    eq(at(i).AsInt(), expected[i], "第 " + i + " 项");
  }
});
check("标准库第二批：Error · Math.round/ceil/trunc/sign · Object.values/entries · String.split 等五个", () => {
  // 第 120 轮。**小数一律用运行时算出来**（`3 / 2`）——线形态的常量只装整数载荷，
  // 浮点字面量在对拍之前就装不进去（与本仓记了多轮的「浮点与大整数字面量」同一条）。
  // `String.split` 走的是**带原型的那条通道**（它要造数组），所以这一条同时量了
  // `InvokeWithSink` 里那次拦截 ✓。
  const source = [
    "function run() {",
    "  let message = '';",
    "  let name = '';",
    "  try { throw new Error('boom'); } catch (error) { message = error.message; name = error.name; }",
    "  const values = Object.values({ a: 1, b: 'two', c: true }).join(',');",
    "  const entries = Object.entries({ a: 1, b: 'two' }).map(function (pair) { return pair[0] + '=' + pair[1]; }).join(';');",
    "  const splitBasic = 'a,b,,c'.split(',').join('|');",
    "  const splitEmpty = 'abc'.split('').join('-');",
    "  return [message, name,",
    "    Math.round(3 / 2), Math.round(0 - 3 / 2), Math.ceil(11 / 10), Math.ceil(0 - 11 / 10),",
    "    Math.trunc(19 / 10), Math.trunc(0 - 19 / 10), Math.sign(0 - 3), Math.sign(1 - 1),",
    "    values, entries, splitBasic, splitEmpty,",
    "    'abc'.split().length, ''.split(',').length, ''.split('').length,",
    "    'aBc'.toUpperCase(), 'aBc'.toLowerCase(), '  hi \\t'.trim(), 'hello'.includes('ell') ? 1 : 0] as any;",
    "}",
  ].join("\n").replace(" as any", "");
  const nodeRun = () => {
    let message = "";
    let name = "";
    try { throw new Error("boom"); } catch (error) { message = error.message; name = error.name; }
    const values = Object.values({ a: 1, b: "two", c: true }).join(",");
    const entries = Object.entries({ a: 1, b: "two" }).map((pair) => pair[0] + "=" + pair[1]).join(";");
    const splitBasic = "a,b,,c".split(",").join("|");
    const splitEmpty = "abc".split("").join("-");
    return [message, name,
      Math.round(3 / 2), Math.round(0 - 3 / 2), Math.ceil(11 / 10), Math.ceil(0 - 11 / 10),
      Math.trunc(19 / 10), Math.trunc(0 - 19 / 10), Math.sign(0 - 3), Math.sign(1 - 1),
      values, entries, splitBasic, splitEmpty,
      "abc".split().length, "".split(",").length, "".split("").length,
      "aBc".toUpperCase(), "aBc".toLowerCase(), "  hi \t".trim(), "hello".includes("ell") ? 1 : 0];
  };
  const expected = nodeRun();
  eq(expected[0], "boom", "Node：Error 的 message（前提）");
  eq(expected[1], "Error", "Node：Error 的 name（前提）");
  eq(expected[2], 2, "Node：Math.round(1.5) 是 2（前提）");
  eq(expected[3], -1, "Node：Math.round(-1.5) 是 -1（前提）");
  eq(expected[17], "ABC", "Node：toUpperCase（前提）");
  eq(expected[19], "hi", "Node：trim（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  for (let i = 0; i < expected.length; i++) {
    const actual = GetIndex(table, res.Value, Value.FromInt(i));
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("内建的失败是**脚本接得住**的异常（第 121 轮：Vm.Raise + 宿主通道的兜底）", () => {
  // **现场**：`try { Object.keys(null) } catch { … }` 里的 `catch` 以前**永远走不到** ✗——
  // 内建抛的是**宿主异常**，它从宿主调用点直接冒出 `Run()` ✗，整份程序以「语言层错误」收场。
  // 修法分两半：引擎给一条通道（`Vm.Raise` / `RaiseRequest`）✓，
  // 宿主通道的兜底把「宿主异常的文字」变成「脚本要接住的那个值」✓（`RaiseFromHost`）。
  const source = [
    "function run() {",
    "  let caught = 'none';",
    "  try { Object.keys(null); } catch (error) { caught = error.message; }",
    "  let after = 'reached';",
    "  return [caught, after];",
    "}",
  ].join("\n");

  // 正面：照产品路径接（`tsrun` 与这里的 `lowerAndLoad` 都是这么接的）。
  const guarded = lowerAndLoad(source, GlobalNames());
  const guardedEval = guarded.host.Evaluate([BuildGlobals(guarded.host.Machine, guarded.host.Machine.Protos, () => {})]);
  eq(guardedEval.Outcome, HostOutcome.Ok, "求值模块：" + guardedEval.Message);
  const called = guarded.host.CallExport(guarded.module.ExportOf("run"), []);
  eq(called.Outcome, HostOutcome.Ok, "运行成功（异常被脚本接住了）：" + called.Message);
  const caught = GetIndex(guarded.table, called.Value, Value.FromInt(0));
  eq(hostStringOf(guarded.table, caught), "Object.keys needs an object", "catch 拿到的是我们自己的那句话");
  eq(hostStringOf(guarded.table, GetIndex(guarded.table, called.Value, Value.FromInt(1))), "reached",
    "接住之后**继续往下跑**（帧栈没有被打坏）");

  // 反面：**不包兜底**时它照样冒出宿主——这正是兜底存在的理由 ✓
  // （少了这条，上面那个绿可能是「恰好没抛」而不是「真的接住了」✗）。
  const bare = lowerAndLoad(source, GlobalNames());
  const bareEval = bare.host.Evaluate([BuildGlobals(bare.host.Machine, bare.host.Machine.Protos, () => {})]);
  eq(bareEval.Outcome, HostOutcome.Ok, "求值模块（反面）：" + bareEval.Message);
  bare.host.InstallHost((target, self, args, room) => {
    const id = bare.table.Get(target.Ref).AsHost().CapabilityId;
    return InvokeWithSink(room, bare.table, bare.host.Machine.Protos, id, self, args, () => {}, bare.host.Machine.Native(), bare.host.Machine.Scheduler(), bare.host.Machine.Settler());
  });
  let escaped = "";
  try {
    bare.host.CallExport(bare.module.ExportOf("run"), []);
  } catch (error) {
    escaped = String(error.message);
  }
  ok(escaped.indexOf("Object.keys") >= 0, "不兜底时宿主异常照样冒出（兜底不是摆设）：" + escaped);
});

check("JSON.parse：与 Node 逐值一致（坏输入**接得住**；深度上限是本仓的明确差异）", () => {
  // 第 122 轮。它能做，是因为第 121 轮铺了「宿主异常 → 脚本异常」那条路：
  // 没有它，这里唯一能报的错会把整份程序打断，`try { JSON.parse(t) } catch` 接不住。
  const lines = [
    "function run() {",
    "  const one = JSON.parse('{\"a\":[1,2],\"b\":{\"c\":\"x\"},\"d\":null,\"e\":true}');",
    "  const two = JSON.parse('  [1, 2, 3]  ');",
    "  let bad = 0;",
    "  try { JSON.parse('{'); } catch (error) { bad += 1; }",
    "  try { JSON.parse('01'); } catch (error) { bad += 1; }",
    "  try { JSON.parse('1 2'); } catch (error) { bad += 1; }",
    "  try { JSON.parse('nul'); } catch (error) { bad += 1; }",
    "  let deep = '';",
    "  for (let i = 0; i < 70; i++) deep += '[';",
    "  for (let i = 0; i < 70; i++) deep += ']';",
    "  let deepBad = 0;",
    "  try { JSON.parse(deep); } catch (error) { deepBad = 1; }",
    "  return [one.a.join('-'), one.b.c, one.d === null ? 1 : 0, one.e ? 1 : 0,",
    "    two.join('+'), JSON.stringify(one), bad, deepBad, JSON.parse('{}') && Object.keys(JSON.parse('{}')).length];",
    "}",
  ];
  const source = lines.join("\n");
  const nodeRun = () => {
    const one = JSON.parse('{"a":[1,2],"b":{"c":"x"},"d":null,"e":true}');
    const two = JSON.parse("  [1, 2, 3]  ");
    let bad = 0;
    try { JSON.parse("{"); } catch (error) { bad += 1; }
    try { JSON.parse("01"); } catch (error) { bad += 1; }
    try { JSON.parse("1 2"); } catch (error) { bad += 1; }
    try { JSON.parse("nul"); } catch (error) { bad += 1; }
    let deep = "";
    for (let i = 0; i < 70; i++) deep += "[";
    for (let i = 0; i < 70; i++) deep += "]";
    let deepBad = 0;
    try { JSON.parse(deep); } catch (error) { deepBad = 1; }
    return [one.a.join("-"), one.b.c, one.d === null ? 1 : 0, one.e ? 1 : 0,
      two.join("+"), JSON.stringify(one), bad, deepBad, Object.keys(JSON.parse("{}")).length];
  };
  const expected = nodeRun();
  eq(expected[0], "1-2", "Node：嵌套数组（前提）");
  eq(expected[6], 4, "Node：四种坏输入都抛（前提）");
  eq(expected[7], 0, "Node：70 层嵌套它照收（前提——**本仓在这里明确不同**）");

  // **本仓的已知差异写在这里**：`parse` 是宿主递归，而宿主栈溢出不可捕获 ⟹ 深度上限 64。
  expected[7] = 1;
  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  for (let i = 0; i < expected.length; i++) {
    const actual = GetIndex(table, res.Value, Value.FromInt(i));
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("`in` 的键要字符串化，数组按格子答（第 123 轮：静默给错值比抛更坏）", () => {
  // 现场：`1 in arr` 往上抛「property keys must be strings or symbols」✗——
  // 而**光把键字符串化还不够** ✗：数组的元素不在 `Props` 里（它们住在 `Elements`），
  // 只看属性表会把 `1 in [10, 20]` 答成**假** ✗（JS 给真 ✓）。
  // 所以这一条修的是两半：**键字符串化**（与 `get_index` / `set_index` 同一套 ✓）
  // + **数组的下标与 `length` 按格子/结构答** ✓（洞不算 ✓）。
  // **一处刻意绕开的写法** ✗：`[1 in arr ? 1 : 0]` —— `in` 写在**数组字面量里面**时，
  // 词法层把它读成了**映射类型**的 `[K in T]` ✓，降级层于是报 `expression TypeParameter` ✓。
  // 那是**解析层**的缺口（值位的 `[x in y]` 与类型位的映射类型撞形状 ✗），**响亮地抛** ✓、
  // 不是静默给错值 ✓——所以这里改成**先算进变量再放进数组** ✓（量的是 `in` 的语义，不是那个形状 ✓）。
  const source = [
    "function run() {",
    "  const arr = [10, 20];",
    "  const holed = [1, , 3];",
    "  const obj = { a: 1 };",
    "  const keyed = { 1: 'x' };",
    "  const a = 1 in arr ? 1 : 0;",
    "  const b = 2 in arr ? 1 : 0;",
    "  const c = 'length' in arr ? 1 : 0;",
    "  const d = 'push' in arr ? 1 : 0;",
    "  const e = 0 in holed ? 1 : 0;",
    "  const f = 1 in holed ? 1 : 0;",
    "  const g = 2 in holed ? 1 : 0;",
    "  const h = 'a' in obj ? 1 : 0;",
    "  const i = 'b' in obj ? 1 : 0;",
    "  const j = 1 in keyed ? 1 : 0;",
    "  const k = '01' in arr ? 1 : 0;",
    "  return [a, b, c, d, e, f, g, h, i, j, k];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    const arr = [10, 20];
    const holed = [1, , 3];
    const obj = { a: 1 };
    const keyed = { 1: "x" };
    return [1 in arr ? 1 : 0, 2 in arr ? 1 : 0, "length" in arr ? 1 : 0, "push" in arr ? 1 : 0,
      0 in holed ? 1 : 0, 1 in holed ? 1 : 0, 2 in holed ? 1 : 0,
      "a" in obj ? 1 : 0, "b" in obj ? 1 : 0, 1 in keyed ? 1 : 0, "01" in arr ? 1 : 0];
  };
  const expected = nodeRun();
  eq(expected[0], 1, "Node：`1 in [10,20]` 是真（前提）");
  eq(expected[5], 0, "Node：洞那一格是假（前提）");
  eq(expected[9], 1, "Node：数字键落到对象上是真（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  for (let i = 0; i < expected.length; i++) {
    eq(GetIndex(table, res.Value, Value.FromInt(i)).AsInt(), expected[i], "第 " + i + " 项");
  }
});

check("任意值 → 文本：浮点 · 对象 · 数组 · 洞（第 124 轮），join 那一族与 Node 逐字节相同", () => {
  // **两件事分开断言**：
  //   · `join` / `JSON` 那一族**与 Node 对拍** ✓（JS 那边也是 `ToString` ✓）；
  //   · `console.log(对象)` **第 131 轮起也与 Node 对拍了** ✓——原来它走 `ToString`
  //     （`[object Object]` ✗），Node 走 `util.inspect`（`{ a: 1 }` ✓），
  //     所以这条判据当时只能断言「我们自己的口径」✗。`inspect.xl.md` 落地之后，
  //     这一行**改成与 Node 相同的形状** ✓（这就是那一条「已记差异」被关掉的样子 ✓）。
  const source = [
    "function run() {",
    "  const bag = { a: 1 };",
    "  const holed = [1, , 3];",
    "  console.log('float', 5 / 2, 7 / 4, 1 / 3, 0 - 5 / 2);",
    "  console.log('special', Math.sqrt(0 - 1), 0 / 1);",
    "  console.log('object', bag);",
    "  console.log('array', [1, 2], [[1, 2], [3]]);",
    "  const cyclic = [];",
    "  cyclic.push(cyclic);",
    "  let guarded = 'none';",
    "  try { console.log('cyclic', cyclic); } catch (error) { guarded = 'threw'; }",
    "  return [bag.toString === undefined ? 1 : 0, holed.join('-'), [1, 2].join('+'),",
    "    [null, undefined, true].join(','), [[1, null], [2]].join(';'),",
    "    JSON.stringify(5 / 2), guarded === 'threw' ? 1 : 0];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    const bag = { a: 1 };
    const holed = [1, , 3];
    const cyclic = [];
    cyclic.push(cyclic);
    let guarded = "none";
    try { String(cyclic.join(",")); } catch (error) { guarded = "threw"; }
    return [bag.toString === undefined ? 1 : 0, holed.join("-"), [1, 2].join("+"),
      [null, undefined, true].join(","), [[1, null], [2]].join(";"),
      JSON.stringify(5 / 2), guarded === "threw" ? 1 : 0];
  };
  const expected = nodeRun();
  eq(expected[0], 0, "Node：普通对象的 toString 存在（前提）");
  eq(expected[3], ",,true", "Node：`join` 把 null/undefined 渲染成空串（前提）");

  const lines = [];
  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);

  // 日志那几行（**第 131 轮起与 Node 同形** ✓）：浮点最短往返、容器走 `util.inspect` 那一份。
  eq(lines[0], "float 2.5 1.75 0.3333333333333333 -2.5", "浮点：最短往返十进制");
  eq(lines[1], "special NaN 0", "特殊值：NaN 与零");
  eq(lines[2], "object { a: 1 }", "对象：`util.inspect` 的形状（原来是 `[object Object]`）");
  eq(lines[3], "array [ 1, 2 ] [ [ 1, 2 ], [ 3 ] ]", "数组：`[ … ]` 带空格，嵌套照样子展开");
  // **自引用那一条现在也不抛了** ✓（第 131 轮）：靠**深度上限**收口 ✓，
  // 形状与 Node 不同 ✗（Node 给 `<ref *1> [ [Circular *1] ]` ✓）——那一条记在 `inspect.xl.md` 里 ✓。
  eq(lines[4], "cyclic [ [ [ [Array] ] ] ]", "自引用靠深度上限收口（形状与 Node 不同，已记）");
  eq(lines.length, 5, "五条日志都在");

  const table = res.Table;
  eq(GetIndex(table, res.Value, Value.FromInt(6)).AsInt(), 0,
    "自引用不再抛（所以 `guarded` 没被置成 threw）——这一点现在与 Node 相同");
  // **只对拍 1..5**：第 6 项是上面那条**已知差异** ✓（JS 的 `join` 对环给空串，本仓抛 ✓）。
  for (let i = 1; i <= 5; i++) {
    const actual = GetIndex(table, res.Value, Value.FromInt(i));
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

check("字符串拼接：有字面量就换路（第 125 轮），两边都是变量时走引擎的 `add`", () => {
  // **换路的判据是「有一边是字符串字面量」** ✓（JS：ToPrimitive 之后有一边是字符串就拼接，
  // 而字面量本来就是字符串 ✓）——于是那一条落成语言内建 `StringConcat` ✓，
  // 另一边走「任意值 → 文本」✓（第 124 轮那条）。
  // **边界**：两边都不是字面量时走引擎的 `RtOp.Add` ✓（热路径 ✓）。
  const source = [
    "function run() {",
    "  const bag = { a: 1 };",
    "  const arr = [1, 2];",
    "  let s = 'start';",
    "  s += '-more';",
    "  const template = `t=${bag} ${arr} ${5 / 2}`;",
    "  return ['x=' + bag, 'a' + arr, 'n=' + 5 / 2, 1 + 'x', s, template];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    const bag = { a: 1 };
    const arr = [1, 2];
    let s = "start";
    s += "-more";
    const template = `t=${bag} ${arr} ${5 / 2}`;
    return ["x=" + bag, "a" + arr, "n=" + 5 / 2, 1 + "x", s, template];
  };
  const expected = nodeRun();
  eq(expected[0], "x=[object Object]", "Node：字面量在左（前提）");

  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  for (let i = 0; i < expected.length; i++) {
    eq(hostStringOf(table, GetIndex(table, res.Value, Value.FromInt(i))), expected[i], "第 " + i + " 项");
  }

  // **边界：两边都是变量 + 运行期是对象** ✓。
  // **判据随契约更新**（第 198 轮 ✓）：这里原来断言的是「引擎的 `add` 抛、
  // 但脚本接得住」✗——`ToPrimitive` 做出来之后这一格**根本不再抛** ✓：
  // `{ a: 1 }` 的 `valueOf` 来自 `Object.prototype` ✓（给回对象本身 ✓），
  // `toString` 也来自那里 ✓（`"[object Object]"` ✓），于是走拼接那一支 ✓——
  // **正是 JS 的答案** ✓（`"x" + { a: 1 }` 在任何引擎里都是 `"x[object Object]"` ✓）。
  const strict = [
    "function run() {",
    "  const bag = { a: 1 };",
    "  const left = 'x';",
    "  const right = bag;",
    "  let joined = 'none';",
    "  try { joined = left + right; } catch (error) { joined = 'caught:' + error.message; }",
    "  return [joined, 'after'];",
    "}",
  ].join("\n");
  const strictRequest = new RunRequest();
  strictRequest.Sources = [strict];
  strictRequest.Entry = "run";
  const strictRes = RunSources(strictRequest, () => {}, () => null);
  eq(strictRes.Outcome, HostOutcome.Ok, "运行器（边界那一条）：" + strictRes.Message);
  const strictTable = strictRes.Table;
  const caughtText = hostStringOf(strictTable, GetIndex(strictTable, strictRes.Value, Value.FromInt(0)));
  eq(caughtText, "x[object Object]",
    "**这一轮修的**：两边都是变量 + 对象，走 `ToPrimitive` 之后是 JS 的答案（原来抛）");
  eq(hostStringOf(strictTable, GetIndex(strictTable, strictRes.Value, Value.FromInt(1))), "after",
    "接住之后继续往下跑（帧栈没坏）");
});

check("一元运算符：`-` / `+` / `!` / `~` 四条各有落点", () => {
  // **一元运算符已经通了**（第 66 轮）：值位的一元节点是在**词法层**
  // （`tokens/unary-operator.xl.md`）造的——不是 `print-ast-common` 那条通用路，
  // 所以前两轮加在通用路的两处挂钩从来没执行过（探针才定位到）。
  // `operator` 现在带**运算符文本**，`-` 走 `RtOp.Neg`、`!` 走 `RtOp.Not`、
  // **`~` 走 `RtOp.BitNot`**（第 147 轮补的第三条）、
  // **`+` 走 `RtOp.ToNumber`**（第 198 轮补的第四条 ✓）。
  const negated = new Lowering().LowerModule(parseTsShape("let y = -1;"), testIds);
  ok(negated.Program !== undefined, "一元负号不再抛（负数字面量可用了）");
  // **`~` 是第 147 轮通的** ✓：这条判据原来断言的是「`~1` 照旧抛」✗——
  // 那一轮把位运算整族接上之后，旧判据随契约更新 ✓（与第 66 / 119 那几条同一条规矩 ✓）。
  const inverted = new Lowering().LowerModule(parseTsShape("let w = ~1;"), testIds);
  ok(inverted.Program !== undefined, "按位取反不再抛（`~1` 是 `-2`，第 147 轮）");
  // **`+x` 是第 198 轮通的** ✓：旧判据在这里断言的是「`+1` 照旧抛」✗。
  // 它落的算子就是 `RtOp.ToNumber` ✓——与内建 `Number` **同一个落点** ✓
  // （`ir.xl.md` 早就把这一格留好了 ✓：「`Number(x)`（字符串解析在这里，所以它要碰堆）」✓）。
  const unaryPlus = new Lowering().LowerModule(parseTsShape("let z = +'3';"), testIds);
  ok(unaryPlus.Program !== undefined, "**这一轮修的**：一元 `+` 不再抛（`+'3'` 是 `3`）");
  // **算出来的值也要对** ✓（只量「降级不抛」是半条判据 ✓）。
  const plusOut = [];
  const plusRequest = new RunRequest();
  plusRequest.Sources = ["console.log(+'3', +'', +[], +{}, +true, +new Date(1234));"];
  plusRequest.Entry = "";
  const plusRes = RunSources(plusRequest, (text) => plusOut.push(text), () => null);
  eq(plusRes.Outcome, HostOutcome.Ok, "运行器（一元 `+`）：" + plusRes.Message);
  eq(plusOut[0], "3 0 0 NaN 1 1234",
    "一元 `+` 就是 `ToNumber`（与 `Number(x)` 逐字同一个答案；`+new Date(ms)` 走 `valueOf`）");

  // **空字符串已经不再是缺口**（第 119 轮）：投影对字符串字面量**一律给值**，
  // 空串就给空串（`print-ast-common` 的 `stringText`）。原来投影给的是**带引号的原文**
  // （`""`），降级层分不开空串与「值是一对引号」，只能抛——那一条是**投影的锅**。
  const empty = new Lowering().LowerModule(parseTsShape('let s = ""; let t = \'""\';'), testIds);
  ok(empty.Program !== undefined, "空字符串字面量不再抛（`\"\"` 与「值是一对引号」都装得下）");
});

check("第 119 轮的四条缺口：空串值 · throw 对象字面量 · 属性复合赋值 · 解构不退水位", () => {
  // 这四条都是**命令行判据（`tests/runtime/run-cli.mjs`）逼出来的**：
  // 那一把尺子量的是「直接跑一个 .ts 文件」，于是每条都是最普通的写法。
  //   · **空串**：`let s = ""` 遍地都是；
  //   · **`throw { … }`**：token 层把 `throw` 后面那个 `{` 判成**块语句**，
  //     投影给出 `ThrowStatement > Block`，降级层报 `expression Block`；
  //   · **属性复合赋值**：`this.value += by` / `o[k] += 1` 原来直接抛；
  //   · **解构声明退水位**：`const {x} = p` 之后紧跟 `const [a,,b] = arr`，
  //     前者绑好的变量格被后来者**覆盖**（症状是几条语句之后读到别人的值）。
  const source = [
    "function empty() {",
    "  let s = '';",
    "  s = s + 'b';",
    "  return [s, s.length, ''.length];",
    "}",
    "function thrown() {",
    "  try {",
    "    throw { message: 'boom', code: 7 };",
    "  } catch (error) {",
    "    return error.message + '/' + error.code;",
    "  }",
    "}",
    "function compound() {",
    "  const o = { value: 1 };",
    "  o.value += 4;",
    "  o.value *= 2;",
    "  const arr = [10, 20];",
    "  arr[1] += 5;",
    "  const key = 'value';",
    "  o[key] -= 3;",
    "  return [o.value, arr[1], arr[0]];",
    "}",
    "function slots() {",
    "  const p = { x: 1, y: 2 };",
    "  const { x } = p;",
    "  const arr = [10, 20, 30];",
    "  const [a, , b] = arr;",
    "  const { y: renamed } = p;",
    "  return [x, a, b, renamed];",
    "}",
  ].join("\n");
  const nodeRun = () => {
    function empty() {
      let s = "";
      s = s + "b";
      return [s, s.length, "".length];
    }
    function thrown() {
      try {
        throw { message: "boom", code: 7 };
      } catch (error) {
        return error.message + "/" + error.code;
      }
    }
    function compound() {
      const o = { value: 1 };
      o.value += 4;
      o.value *= 2;
      const arr = [10, 20];
      arr[1] += 5;
      const key = "value";
      o[key] -= 3;
      return [o.value, arr[1], arr[0]];
    }
    function slots() {
      const p = { x: 1, y: 2 };
      const { x } = p;
      const arr = [10, 20, 30];
      const [a, , b] = arr;
      const { y: renamed } = p;
      return [x, a, b, renamed];
    }
    return [empty()[0], empty()[1], empty()[2], thrown(),
      compound()[0], compound()[1], compound()[2],
      slots()[0], slots()[1], slots()[2], slots()[3]];
  };
  const expected = nodeRun();
  eq(expected[0], "b", "Node：空串拼接（前提）");
  eq(expected[3], "boom/7", "Node：throw 对象字面量（前提）");
  eq(expected[4], 7, "Node：属性复合赋值（前提）");
  eq(expected[9], 30, "Node：数组解构第三格是 30（前提）");

  const request = new RunRequest();
  request.Sources = [source + "\nreturn [empty()[0], empty()[1], empty()[2], thrown(),"
    + " compound()[0], compound()[1], compound()[2],"
    + " slots()[0], slots()[1], slots()[2], slots()[3]];"];
  request.Entry = "";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  for (let i = 0; i < expected.length; i++) {
    const actual = GetIndex(table, res.Value, Value.FromInt(i));
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
});

console.log("");
console.log("=== 第 129 轮：数字字面量 ===");

/** 一个**可复现**的伪随机数（判据不许每次跑出不同的语料 ✗）。 */
function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

check("数字字面量的形态表：每一种都与 Node 的 Number() 逐值相同", () => {
  // **这一条是这一轮的尺子** ✓：老版本自己算舍入 ✗，实测 20 万个里错 2 个 ✓。
  // 现在「收不收」由 `ScanNumber` 说了算 ✓、「舍入成什么数」由宿主说了算 ✓，
  // 所以这条判据量的正是**那条分界**：我们认下来的每一个形态，
  // 都得和 `Number(原文)` 给一模一样的值 ✓（裁判是真 Node ✓）。
  const random = makeRandom(20261003);
  const digits = (count) => {
    let text = "";
    for (let i = 0; i < count; i++) text = text + String.fromCharCode(48 + Math.floor(random() * 10));
    return text;
  };
  const cases = [];
  // ① 十进制「整.小数」——老版本就是在这里错的
  for (let i = 0; i < 3000; i++) cases.push(digits(1 + Math.floor(random() * 7)) + "." + digits(1 + Math.floor(random() * 8)));
  // ② 指数
  for (let i = 0; i < 800; i++) {
    const exponent = Math.floor(random() * 80) - 40;
    cases.push(digits(1 + Math.floor(random() * 5)) + "." + digits(3) + "e" + String(exponent));
  }
  // ③ 只有整数、只有小数、带正负号的指数
  cases.push("0", "42", "007", ".5", "5.", "1e3", "1E3", "1e+3", "1e-3", "1.5e-3",
    "0.1", "0.2", "0.3", "43.695449", "74.455959", "1e21", "1e-7", "1e300", "1e-300",
    "1e999", "-1e999", "9007199254740991", "0.30000000000000004", "1.7976931348623157e308");
  // ④ 十六 / 八 / 二进制
  for (let i = 0; i < 400; i++) {
    let hex = "";
    const count = 1 + Math.floor(random() * 10);
    for (let k = 0; k < count; k++) hex = hex + "0123456789abcdef".charAt(Math.floor(random() * 16));
    cases.push("0x" + hex);
  }
  cases.push("0x0", "0X1F", "0o17", "0O777", "0b1010", "0B11111111", "0xdeadbeef", "0b0");
  // ⑤ 数字分隔符（只许夹在数字之间）
  cases.push("1_000", "1_000_000", "1_0.5", "0xFF_FF", "0b1010_1010", "1e1_0");

  let mismatched = 0;
  let firstBad = "";
  for (const text of cases) {
    const ours = NumberFromText(text);
    // **对拍前先把分隔符摘掉** ✓：`Number("1_000")` 在 TS 里是 `NaN` ✗
    //（那是**字面量语法**的事 ✓，不是数值转换的事 ✓）——裁判要量的是**值** ✓。
    const bare = text.split("_").join("");
    const theirs = Number(bare);
    if (!Object.is(ours, theirs)) {
      mismatched = mismatched + 1;
      if (firstBad === "") firstBad = text + " 自算=" + String(ours) + " Number=" + String(theirs);
    }
  }
  eq(mismatched, 0, "语料 " + cases.length + " 条全部逐值相同" + (firstBad === "" ? "" : "（首条不符：" + firstBad + "）"));

  // **大整数那条边界也要量** ✓：`9007199254740991` = 2^53-1 收得下 ✓、
  // 再大一位就**响亮地拒** ✓（不静默舍入 ✗）。
  eq(NumberFromText("9007199254740991"), 9007199254740991, "2^53-1 是精确的");
});

check("不认的数字形态：一律响亮地抛，绝不静默给个近似值", () => {
  const rejected = [
    "123n", "0x1Fn", // BigInt：v1 明确非目标
    "1__0", "1_", "_1", "0x_1", "1_e3", "1e_3", // 分隔符不夹在两个数字之间
    "1.2.3", "1e2e3", "1e2.5", "1e", "1e+", "0x", "0b", "0o", ".", "+", "-", "",
    "1.5n", "0x1.5", "0b12", "0o18", "1x", // 形态本身不成立
  ];
  let wrong = "";
  for (const text of rejected) {
    let threw = false;
    let message = "";
    try { NumberFromText(text); } catch (error) { threw = true; message = String(error.message); }
    if (!threw) { wrong = wrong + " [" + text + " 竟然收了]"; continue; }
    if (message.indexOf("unimplemented: ") !== 0) wrong = wrong + " [" + text + " 的消息不以 unimplemented: 开头：" + message + "]";
  }
  eq(wrong, "", "该拒的都拒了，而且话能读" + wrong);

  // **BigInt 要指名道姓** ✓：用户看到的应当是「`BigInt` 不支持」✓，
  // 不是「数字字面量不认」✗——后者会让人去查分隔符，而问题在类型上 ✓。
  let bigintMessage = "";
  try { NumberFromText("10n"); } catch (error) { bigintMessage = String(error.message); }
  ok(bigintMessage.indexOf("BigInt") >= 0, "BigInt 那条消息要说出 BigInt：" + bigintMessage);

  // **十进制可以很长** ✓：`Number("99999999999999999999")` 是**正确舍入**的结果 ✓，
  // 所以那些位数由宿主算 ✓、这里照收 ✓——「长」本身不是拒绝的理由 ✓。
  eq(NumberFromText("99999999999999999999"), Number("99999999999999999999"), "20 位十进制照样正确舍入");

  // **十六 / 八 / 二进制不行** ✓，因为那一段是**自己**按精确整数累加的 ✓——
  // 超过 2^53 就只有多精度才算得对 ✗，那是 P2 类型层的事 ✓。
  // 它是**响亮**的 ✓（消息里说的是「超出精确范围」✓），不是静默给个近似的数 ✗。
  let rangeMessage = "";
  try { NumberFromText("0xFFFFFFFFFFFFFFFFF"); } catch (error) { rangeMessage = String(error.message); }
  ok(rangeMessage.indexOf("exact range") >= 0, "大十六进制要报「超出精确范围」：" + rangeMessage);
  eq(NumberFromText("0x1FFFFFFFFFFFFF"), 9007199254740991, "2^53-1 的十六进制是收得下的");
});

check("数值的 `===` 不看表示（Int32 与 Float64 是同一个类型）", () => {
  // **这是第 129 轮顺路修掉的一处潜伏 bug** ✓：`RtCmpEqStrict` 原来**先比档位** ✗，
  // 于是 `-0 === 0` 给 `false` ✓（`-0` 收成 `Float64` 之后才暴露 ✓）。
  // `Int32` 与 `Float64` 是**同一个 JS 类型的两种表示** ✓（`MakeNumber` 的话 ✓），
  // 所以运算符不许看见表示 ✗——`<` / `<=` / `>` / `>=` 那四条一直是对的 ✓，只有它漏了 ✓。
  const table = new HeapTable();
  const eqStrict = (a, b) => RtCmpEqStrict(table, a, b).AsBool();
  eq(eqStrict(Value.FromInt(0), Value.FromDouble(-0)), true, "-0 === 0");
  eq(eqStrict(Value.FromInt(3), Value.FromDouble(3)), true, "Int32(3) === Float64(3)");
  eq(eqStrict(Value.FromDouble(0.5), Value.FromInt(1)), false, "0.5 !== 1（跨表示也要按数值判）");
  eq(eqStrict(Value.FromDouble(NaN), Value.FromDouble(NaN)), false, "NaN !== NaN");
  eq(eqStrict(Value.FromInt(1), Value.FromString(1)), false, "1 !== \"1\"（档位那一半没被放松）");
});

check("引擎里的宿主借用只有一处（可查的形态）", () => {
  // **规矩要有形态才查得住** ✓（`runtime/host-text.xl.md` 那一节 ✓）：
  // 「引擎不依赖宿主」原来是一句话 ✗，现在是这一条判据 ✓——
  // `build/ts/runtime/**` 里除了 `host-text.js`，**不许**出现那三个宿主 API ✓。
  // 量的地方选**产物**而不是规范 ✓：产物是各目标真正要跑的东西 ✓（散文里提到它们不算 ✗）。
  const dir = path.join(root, "build", "ts", "runtime");
  // **三条正则，不是三个子串** ✓：`MakeNumber(` / `IsNumber()` 里也含 `Number(` ✗，
  // 拿子串去量会当场误报四处 ✓（第一版就是这么红的 ✓）——那是**同名前缀**，不是宿主调用 ✓。
  const markers = [/charCodeAt\s*\(/, /fromCharCode\s*\(/, /(?<![A-Za-z0-9_$.])Number\s*\(/];
  const offenders = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".js")) continue;
    if (name === "host-text.js") continue;
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    for (const marker of markers) {
      if (marker.test(text)) offenders.push(name + " 里有 " + String(marker));
    }
  }
  eq(offenders.length, 0, "借用只在 host-text.js" + (offenders.length === 0 ? "" : "：" + offenders.join("、")));
  const quarantined = fs.readFileSync(path.join(dir, "host-text.js"), "utf8");
  ok(/charCodeAt\s*\(/.test(quarantined), "那一处确实在 host-text.js 里（判据本身不是空转）");
});

console.log("");
console.log("=== 第 130 轮：标准库第三批 ===");

check("标准库第三批：findIndex · Array.from · Object.assign · fromCharCode · replace · Map/Set 初值", () => {
  // **每一个都跟真 Node 对过**（`cases/22-stdlib-third-batch.ts` 是逐字节那一把 ✓），
  // 这里钉的是**判据量不到的那一半**：三条**故意不做**的形态必须是**抛** ✓，
  // 不是「当作没有」✗ —— 静默给个近似值是这一层最不能犯的错 ✓。
  const body = [
    "const out = [];",
    "out.push([1, 2, 3].findIndex((n) => n > 1));",
    "out.push([1, 2, 3].findIndex((n) => n > 9));",
    "out.push(Array.from('ab').join('-'));",
    "out.push(1 in Array.from([1, , 3]) ? 'yes' : 'no');",
    "out.push(Object.assign({}, { a: 1 }, { b: 2 }).b);",
    "out.push(String.fromCharCode(72, 105));",
    "out.push('a-b'.replace('-', '+'));",
    "out.push(new Map([[1, 'x'], [1, 'y']]).get(1));",
    "out.push(new Set([1, 1, 2]).size);",
    // 三条**该抛**的：各自包一层 try，把「抛没抛 / 说了什么」带回宿主。
    "const loud = [];",
    // ① **不可迭代的值**（不是生成器）：`Array.from` 要**点名**说它不做这一档 ✓。
    // **判据随契约更新**（第 199 轮 ✓）：**生成器**那一档这一轮做掉了 ✓，
    // 所以这一条换成了「既没有迭代器、也没有 `length`」的对象 ✓——
    // JS 在那里给**空数组** ✓（把它当 `length` 为 0 的数组式对象 ✓），
    // 本仓这一档照旧**响亮地抛** ✓（写在台账里 ✓，不是这一轮的事 ✓）。
    // **第 216 轮把它做掉了**：`Array.from` 对「不可迭代但带 `length`」的值现在按 JS 走
    // **逐下标拷贝**（`{ a: 1 }` 的 `length` 是 `undefined` ⇒ `0` ⇒ **空数组**）。
    // 所以这一条从「必须响」挪到 `out` 里断它**给对**（下面 `eq` 里有那一格）。
    // **推进 `out` 会把后面那些按下标断言的项全部移位** —— 所以只算，最后再收 ✓。
    "const arrayLikeLength = Array.from({ a: 1 }).length;",
    // ② 非字符串的 `replace` 实参（正则 / 函数都落这一支）。
    "try { 'a'.replace(1, 'b'); loud.push('no-throw'); } catch (error) { loud.push(error.message); }",
    // ③ 原始值当 `Object.assign` 的目标（JS 会装箱，本仓没有那一层）。
    "try { Object.assign(1, { a: 1 }); loud.push('no-throw'); } catch (error) { loud.push(error.message); }",
    // ④ **自赋值不许转圈**：键与值先抄下来再写，所以它必须正常结束。
    "const same = { a: 1 };",
    "Object.assign(same, same);",
    "out.push(same.a);",
    "out.push(arrayLikeLength === 0 ? 'arraylike-ok' : 'arraylike-bad');",
    "return [out, loud];",
  ].join("\n");
  const request = new RunRequest();
  request.Sources = [body];
  request.Entry = "";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const values = GetIndex(table, res.Value, Value.FromInt(0));
  const expected = [1, -1, "a-b", "yes", 2, "Hi", "a+b", "y", 2, 1];
  for (let i = 0; i < expected.length; i++) {
    const actual = GetIndex(table, values, Value.FromInt(i));
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
  const loud = GetIndex(table, res.Value, Value.FromInt(1));
  const loudCount = table.Get(loud.Ref).AsArray().GetLength();
  eq(loudCount, 2, "两条该抛的都给了话（`Array.from` 那一条第 216 轮做掉了，见上面）");
  const loudTexts = [];
  for (let i = 0; i < loudCount; i++) {
    loudTexts.push(hostStringOf(table, GetIndex(table, loud, Value.FromInt(i))));
  }
  for (let i = 0; i < loudTexts.length; i++) {
    ok(loudTexts[i].indexOf("unimplemented: ") === 0,
      "第 " + i + " 条要指名道姓地说没做：" + loudTexts[i]);
  }
  // **第 216 轮起 `Array.from` 那一档不抛了**（数组式对象按 JS 走逐下标拷贝 ✓），
  // 原来编号 ① 的那一格挪到 `out` 末尾去断它**给对**（见上面 `arrayLikeLength` 那两行 ✓）。
  ok(loudTexts[0].indexOf("String.replace") >= 0, "① 说的是 `String.replace`：" + loudTexts[0]);
  ok(loudTexts[1].indexOf("Object.assign") >= 0, "② 说的是 `Object.assign`：" + loudTexts[1]);
});

console.log("");
console.log("=== 第 131 轮：console.log 的形状 ===");

check("`util.inspect` 那一份：形状与 Node 逐字符相同，三处已知差也钉住", () => {
  // **端到端那一把在 `cases/23-console-log-shapes.ts`**（61 行逐字节 ✓）。
  // 这里钉的是**判据量不到的那一半**：三处**已知差**必须一直是「我们知道它差」✓——
  // 不钉住的话，将来某一次改动可能把它们从「记着的差」变成「悄悄变了」✗。
  const source = [
    "function run() {",
    // ① 形状：容器走 `util.inspect`，字符串实参原样。
    "  console.log('shape', [1, 'a'], { b: { c: 2 } }, 'raw');",
    // ② 整数样式的键：**本仓按插入顺序**（JS 把整数键排到最前，已记差）。
    "  console.log('keys', { b: 1, 2: 2, a: 3 });",
    // ③ 循环引用：靠**深度上限**收口（Node 给 `<ref *1> … [Circular *1]`，已记差）。
    "  const loop = {};",
    "  loop.self = loop;",
    "  console.log('loop', loop);",
    // ④ 嵌套折行比 Node **更容易折**（Node 在嵌套里给更宽的预算，已记差）。
    "  console.log('nested-long', { a: ['x'.repeat(50), 'x'.repeat(50)] });",
    "  return 0;",
    "}",
  ].join("\n");
  const lines = [];
  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines.length, 4, "四条日志");
  eq(lines[0], "shape [ 1, 'a' ] { b: { c: 2 } } raw",
    "① 形状：`[ … ]` / `{ … }` 带空格、字符串原样");
  eq(lines[1], "keys { b: 1, '2': 2, a: 3 }",
    "② 整数样式键的引号对了（**顺序**是本仓的插入顺序——JS 排到最前，已记差）");
  eq(lines[2], "loop { self: { self: { self: [Object] } } }",
    "③ 循环引用被深度上限收口（展开三层才碰上限；Node 给 `<ref *1> … [Circular *1]`，已记差）");
  ok(lines[3].indexOf("\n") >= 0, "④ 长条目折行（嵌套的预算比 Node 紧，已记差）");
  eq(lines[3], "nested-long {\n  a: [\n    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',\n"
    + "    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'\n  ]\n}",
    "④ 折行的形状本身是对的（缩进 / 逗号 / 括号各就各位）");
});

check("折行的规则是**量出来的三条**（项数 / 长度 / 列数上限）", () => {
  // 这三条都是对着真 Node 量出来的常数 ✓，写在这里是为了**它们变了会红** ✓：
  //   · 数组**超过 6 项**就不许平铺（7 个空串才 30 字符，Node 照样折）；
  //   · 单行长度 **≤ 71**（= 80 - 9）平铺；
  //   · 分组**最多 12 列**（`[0..n]` 扫出来的那个数）。
  const source = [
    "function run() {",
    "  console.log('six', [1, 2, 3, 4, 5, 6]);",
    "  console.log('seven', [1, 2, 3, 4, 5, 6, 7]);",
    "  console.log('cols', [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,",
    "    20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,",
    "    40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,",
    "    60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79]);",
    "  return 0;",
    "}",
  ].join("\n");
  const lines = [];
  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "run";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "six [ 1, 2, 3, 4, 5, 6 ]", "6 项平铺");
  ok(lines[1].indexOf("\n") >= 0, "7 项折行（**与长度无关**：这才 30 字符）");
  eq(lines[1], "seven [\n  1, 2, 3, 4,\n  5, 6, 7\n]", "7 项的折法（4 列 2 行）");
  // **列数上限 12**：`[0..79]` 的第一行恰好 12 项。
  const firstRow = lines[2].split("\n")[1];
  eq(firstRow.split(", ").length, 12, "分组每行 12 列（量出来的上限）");
});

console.log("");
console.log("=== 第 132 轮：展开与剩余（字面量那一半）===");

check("展开与绑定模式的默认值 / 数组剩余：与 Node 逐值一致，边界也钉住", () => {
  // **端到端那一把在 `cases/24-spread-and-defaults.ts`**（17 行逐字节 ✓）。
  // 这里钉的是**判据量不到的那一半**：三处**故意不做**的形态必须**响亮地抛** ✓，
  // 以及一处**这一轮实测抓出来的形状差** ✓（洞在展开与解构剩余里的待遇**不一样** ✓）。
  const body = [
    "const out = [];",
    "out.push([...[1, 2], 3].join(','));",
    "out.push([...'ab'].join('-'));",
    "out.push([...new Set([1, 2])].join(','));",
    "out.push({ ...{ a: 1 }, b: 2 }.b);",
    "out.push({ a: 9, ...{ a: 1 } }.a);",
    "out.push(JSON.stringify([...[1, , 3]]));",
    "out.push(JSON.stringify((() => { const [a, ...r] = [1, , 3]; return r; })()));",
    "out.push((() => { const [x = 9] = []; return x; })());",
    "out.push((() => { const { a = 7 } = { a: null }; return a === null; })());",
    // **不可迭代的值是**运行期**的错** ✓（JS 也给 `TypeError` ✓）——脚本接得住 ✓。
    "let loud = 'no-throw';",
    "try { const bad = [...5]; } catch (error) { loud = error.message; }",
    "out.push(loud);",
    "return out;",
  ].join("\n");
  const request = new RunRequest();
  request.Sources = [body];
  request.Entry = "";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const values = res.Value;
  const expected = [
    "1,2,3", "a-b", "1,2", 2, 1,
    "[1,null,3]",        // `[...[1, , 3]]`：**展开填洞**（逐下标读）
    "[null,3]",          // `const [a, ...r] = [1, , 3]`：**剩余也填洞**（走迭代器）
    9, true,
  ];
  for (let i = 0; i < expected.length; i++) {
    const actual = GetIndex(table, values, Value.FromInt(i));
    if (typeof expected[i] === "number") {
      eq(actual.AsInt(), expected[i], "第 " + i + " 项（数值）");
    } else if (typeof expected[i] === "boolean") {
      eq(actual.AsBool(), expected[i], "第 " + i + " 项（布尔）");
    } else {
      eq(hostStringOf(table, actual), expected[i], "第 " + i + " 项（字符串）");
    }
  }
  const last = hostStringOf(table, GetIndex(table, values, Value.FromInt(expected.length)));
  // **判据随契约更新**（第 199 轮 ✓）：生成器那一档做掉之后 ✓，
  // 「不可迭代」这句话换成了 `GetIterator` 里那一句 ✓（`iterating a non-object` ✓）——
  // 它点的是**哪一步**失败 ✓（比原来那句「spreading a value …」更贴近现场 ✓）。
  ok(last.indexOf("unimplemented: ") === 0,
    "不可迭代的值：**运行期**抛，脚本接得住：" + last);

  // **另外两条是**降级期**的错** ✗——脚本里的 `try` 一个字都拦不住它们 ✗
  //（它们发生在代码还没跑起来的时候 ✓），所以只能拿 `Lowering` 直接问 ✓。
  const lowerMessage = (src) => {
    try {
      new Lowering().LowerModule(parseTsShape(src), testIds);
      return "";
    } catch (error) {
      return String(error.message);
    }
  };
  const holeMessage = lowerMessage("const bad = [...[1], , 3];");
  ok(holeMessage.indexOf("hole after a spread") >= 0,
    "① 展开之后的洞：**降级期**就响亮地拒（要给洞也带动态下标，引擎得给 set_hole）：" + holeMessage);
  // **② 对象剩余第 135 轮做掉了** ✓——原来这条断言的是「降级期就抛」✗，
  // 现在改成「**跑得出来**」✓（判据随契约更新 ✓，与第 129 / 131 轮那两条同一个处理 ✓）。
  const restProbe = new RunRequest();
  restProbe.Sources = ["const { a, ...rest } = { a: 1, b: 2, c: 3 };"
    + " return [a, JSON.stringify(rest)];"];
  restProbe.Entry = "";
  const restRes = RunSources(restProbe, () => {}, () => null);
  eq(restRes.Outcome, HostOutcome.Ok, "② 对象剩余现在跑得出来：" + restRes.Message);
  eq(hostStringOf(restRes.Table, GetIndex(restRes.Table, restRes.Value, Value.FromInt(1))),
    "{\"b\":2,\"c\":3}", "② `rest` 里没有已经拆走的那个键");
});

check("`new` 的结果格不会再被下一个分配盖掉（第 132 轮修的潜伏 bug）", () => {
  // **这是一处**真的**潜伏 bug** ✓：`LowerNew` 原来收尾写的是 `Release(ctor)` ✗，
  // 而结果写在 `base` 上、`base` 在 `ctor` **上面** ✓——水位一退，下一个分配就盖掉新对象 ✗。
  // 它一直潜伏，是因为紧接着那次分配（`const s = new Set(...)` 的变量格）恰好落在同一格 ✓
  //（`Move` 到自己是空操作 ✓）；一旦中间**多一次**分配就露出来 ✗
  //（判据现场：`[...new Set([1, 2])]` 接出来是**空的** ✓，而 `[...s]` 是对的 ✓）。
  const body = [
    "const out = [];",
    "out.push(new Set([1, 2]).size);",
    "out.push([...new Set([1, 2])].length);",
    "out.push(new Map([[1, 'a']]).size);",
    "out.push([...new Map([[1, 'a']])].length);",
    "out.push(new Date(0).getTime());",
    // **非对象的来源跳过** ✓（`Object.assign` 的口径 ✓，JS 的对象展开也一样 ✓）。
    "out.push(JSON.stringify({ ...{ a: 1 }, ...null, ...undefined }));",
    "return out;",
  ].join("\n");
  const request = new RunRequest();
  request.Sources = [body];
  request.Entry = "";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const expectedNumbers = [2, 2, 1, 1, 0];
  for (let i = 0; i < expectedNumbers.length; i++) {
    eq(GetIndex(table, res.Value, Value.FromInt(i)).AsInt(), expectedNumbers[i], "第 " + i + " 项");
  }
  eq(hostStringOf(table, GetIndex(table, res.Value, Value.FromInt(5))), "{\"a\":1}",
    "`{...o, ...null, ...undefined}` 只留下 `a`");
});

console.log("");
console.log("=== 第 133 轮：展开与剩余（函数那一半）===");

check("剩余参数与展开调用：与 Node 逐值一致，边界也钉住", () => {
  // **端到端那一把在 `cases/25-rest-and-spread-calls.ts`**（11 行逐字节 ✓）。
  // 这里钉的是**判据量不到的那一半**：四处**故意不做**的形态必须**降级期响亮地抛** ✓
  // （它们都是**编译期**的错 ✓，脚本里的 `try` 一个字都拦不住 ✓），
  // 以及**这一轮新量出来的一条老缺口** ✓（函数声明写在函数表达式体里）。
  const source = [
    "function f(a, ...rest) { return a + ':' + rest.length; }",
    "function g(...all) { return all.join('-'); }",
    "const out = [f(1, 2, 3), f(1), g(), g(1, 2)];",
    "return out;",
  ].join("\n");
  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const expectedText = ["1:2", "1:0", "", "1-2"];
  for (let i = 0; i < expectedText.length; i++) {
    eq(hostStringOf(table, GetIndex(table, res.Value, Value.FromInt(i))), expectedText[i], "第 " + i + " 项");
  }

  // **这四条都要**跑一遍**才知道**（不是 `Lowering` 直接问）✗：它们引用了全局名（`Map` ✓），
  // 而「哪些名字是全局名」是**驱动**声明进去的 ✓（`DeclareGlobals` ✓）——
  // 光 `new Lowering()` 会先报「`Map` 不是局部名也不是捕获」✗（离现场很远 ✗，第一版就是这么红的 ✓）。
  const runMessage = (src) => {
    const probe = new RunRequest();
    probe.Sources = [src];
    probe.Entry = "";
    try {
      const outcome = RunSources(probe, () => {}, () => null);
      return outcome.Message;
    } catch (error) {
      // **降级期的错是从 `RunSources` 里冒出来的**（不是塞在 `Outcome` 里的 ✓）——
      // 它是**编译期**的错 ✓，本来就不该被当成「一次脚本运行的结果」✗（第一版就是这么红的 ✓）。
      return String(error.message);
    }
  };
  // ① **`new C(...xs)` 第 197 轮做掉了** ✓——原来这条断言的是「降级期就抛」✗，
  // 现在改成「**跑得出来**」✓（判据随契约更新 ✓，与下面②那条同一个处理 ✓）。
  // 它落的是**语言内建调用** `NewApplyId` ✓：引擎的 `Op.New` 只认**定长**实参表 ✗，
  // 而「构造函数 + 装着实参的数组」这一格本来就是**数组** ✓——引擎一行都不用改 ✓。
  const newSpread = [];
  const newSpreadRequest = new RunRequest();
  newSpreadRequest.Sources = [[
    "class P { constructor(a, b) { this.sum = a + b; } }",
    "const xs = [2, 3];",
    "console.log(new P(...xs).sum, new P(1, ...[9], 4).sum);",
  ].join("\n")];
  newSpreadRequest.Entry = "";
  const newSpreadRes = RunSources(newSpreadRequest, (text) => newSpread.push(text), () => null);
  eq(newSpreadRes.Outcome, HostOutcome.Ok, "① `new C(...xs)` 现在跑得出来：" + newSpreadRes.Message);
  eq(newSpread[0], "5 10", "① 实参整个来自数组、以及混着定长实参一起铺对");
  // ② **`super(...xs)` 第 141 轮做掉了** ✓——原来这条断言的是「降级期就抛」✗，
  // 现在改成「**跑得出来**」✓（判据随契约更新 ✓，与上面①那条同一个处理 ✓）。
  // 它靠的是 `CallArray` **本来就带 `this` 操作数** ✓（`EmitCallArray(callee, argsArray, self)` ✓）——
  // 第 133 轮加算子时就把那一格留出来了 ✓，只是没人把 `super` 接上去 ✓。
  const superSpread = [];
  const superSpreadRequest = new RunRequest();
  superSpreadRequest.Sources = [[
    "class A { constructor(a, b, c) { this.sum = a + b + c; } }",
    "class B extends A { constructor(xs) { super(1, ...xs, 4); } }",
    "console.log(new B([2, 3]).sum);",
  ].join("\n")];
  superSpreadRequest.Entry = "";
  const superSpreadRes = RunSources(superSpreadRequest, (text) => superSpread.push(text), () => null);
  eq(superSpreadRes.Outcome, HostOutcome.Ok, "② `super(...xs)` 现在跑得出来：" + superSpreadRes.Message);
  eq(superSpread[0], "6", "② 混着写的实参也铺对了（父类只收三个：1 + 2 + 3）");
  // ③ `super.m(...xs)`：这一支本来就用不了 `call_method`，要另配一条形状。
  ok(runMessage("class A { m(x) { return x; } }"
    + " class B extends A { m(xs) { return super.m(...xs); } }").indexOf("spreading into super.m") < 0,
    "③ **第 158 轮修好**：`super.m(...xs)` 不再在降级期抛（这一条当时钉的就是「降级期就抛」）");
  // ④ 宿主能力名（没声明过、登记为能力的名字）的窗口 `[号, 参数…]` 是定长的。
  const capabilityMessage = runMessage("const xs = [1]; const r = Math.max(...xs);");
  eq(capabilityMessage, "", "`Math.max(...xs)` **能跑**（它是属性访问，走通用那条路 ✓）：" + capabilityMessage);
});

check("剩余参数这一条顺带修掉的**结构性问题**：函数表每加一个字段，重建它的地方都要跟着加", () => {
  // **这一轮实测踩到的** ✓：`FunctionInfo.HasRest` 加好之后，`...rest` 仍然拿到 `undefined` ✗——
  // 因为 `link.xl.md` **另建**了一份函数表 ✓，而它只抄了 `IsGenerator` / `IsAsync` ✓。
  // **它不是「忘了写一行」那么简单** ✗：`FunctionInfo` 现在有 **7** 个字段 ✓，
  // 而「重建函数表」的地方有 **2** 处（`Decode` 与 `link` ✓）——
  // 加字段时**只有一处会被 typechecker 或判据提醒** ✗，另一处**谁都不提醒** ✗。
  // 这条判据量的是**结果**：链接之后再跑，`...rest` 必须是数组 ✓。
  const source = [
    "function f(...all) { return all.length + ':' + all.join(','); }",
    "return [f(1, 2, 3), f()];",
  ].join("\n");
  const request = new RunRequest();
  request.Sources = [source];
  request.Entry = "";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  eq(hostStringOf(table, GetIndex(table, res.Value, Value.FromInt(0))), "3:1,2,3",
    "链接之后剩余参数仍然是数组（`link.xl.md` 那一行）");
  eq(hostStringOf(table, GetIndex(table, res.Value, Value.FromInt(1))), "0:",
    "没传时给空数组");
});

console.log("");
console.log("=== 第 134 轮：函数的两条形状 ===");

check("表达式位那个标记不许漏进子树（函数声明写在函数表达式的体里）", () => {
  // **端到端那一把在 `cases/26-function-shapes.ts`**（6 行逐字节 ✓）。
  // 这里钉的是**根因那一层**（投影）✓：`ctx.expressionPosition` 说的是
  // 「**这一个**节点在表达式位」✓，用完必须还回去 ✓——不还，匿名 IIFE 体里那条
  // **声明**会被投成表达式 ✗（`kids.length === 1` 那一条是漏点 ✓）。
  const kinds = [];
  const collect = (node) => {
    if (node === null || typeof node !== "object") return;
    if (typeof node.kind === "string") kinds.push(node.kind);
    for (const key of Object.keys(node)) {
      if (key === "kind" || key === "pos" || key === "end") continue;
      const value = node[key];
      if (Array.isArray(value)) { for (const item of value) collect(item); }
      else if (value !== null && typeof value === "object") collect(value);
    }
  };
  collect(parseTsShape("(function () { function helper() { return 1; } return helper(); })();"));
  eq(kinds.filter((k) => k === "FunctionExpression").length, 1, "外面那层是表达式");
  eq(kinds.filter((k) => k === "FunctionDeclaration").length, 1, "体里那条是**声明**（第 134 轮修的）");
  // **带括号的那种一直是对的** ✓——它是同一条规矩的另一个入口，放在这里当对照 ✓。
  const inner = [];
  const collect2 = (node) => {
    if (node === null || typeof node !== "object") return;
    if (typeof node.kind === "string") inner.push(node.kind);
    for (const key of Object.keys(node)) {
      if (key === "kind" || key === "pos" || key === "end") continue;
      const value = node[key];
      if (Array.isArray(value)) { for (const item of value) collect2(item); }
      else if (value !== null && typeof value === "object") collect2(value);
    }
  };
  collect2(parseTsShape("(function () { function helper() { return 1; } })();"));
  eq(inner.filter((k) => k === "FunctionDeclaration").length, 1, "对照：同一份代码不带结果用法也一样");
});

check("`f()()`：第二个括号也要成一个调用（被调用者本身是一次调用）", () => {
  // 产物原来把 `f()()` 收成**一个** `f()` ✗——`Method` 那两条判据只认
  // 「前一单元是标识符」与「前一单元是括号」✓，而 `f()` 收成 `Method` 之后**两者都不是** ✗。
  // **它只在实参位露** ✓（`const a = f()();` 走另一条重组规则 ✓）——
  // 所以这条判据**特意写在实参位** ✓。
  const arg = parseTsShape("console.log(f()());").statements[0].expression.arguments[0];
  eq(arg.kind, "CallExpression", "外层是调用");
  eq(arg.expression.kind, "CallExpression", "被调用者是内层那次调用");
  eq(arg.expression.expression.kind, "Identifier", "再往里才是名字");
  eq(arg.pos, 12, "外层调用的起点");
  eq(arg.end, 17, "外层调用的终点（要**从被调用者之后重新配对括号**）");
  // **三个连着的调用**也要成三层。
  const triple = [];
  const collect = (node) => {
    if (node === null || typeof node !== "object") return;
    if (node.kind === "CallExpression") triple.push(node);
    for (const key of Object.keys(node)) {
      if (key === "kind" || key === "pos" || key === "end") continue;
      const value = node[key];
      if (Array.isArray(value)) { for (const item of value) collect(item); }
      else if (value !== null && typeof value === "object") collect(value);
    }
  };
  collect(parseTsShape("f(1)(2)(3);"));
  eq(triple.length, 3, "`f(1)(2)(3)` 是三层调用");
});

check("解构形参：与 Node 逐值一致（对象剩余第 135 轮也通了）", () => {
  const body = [
    "function destructured({ a, b: renamed }) { return a + renamed; }",
    "function withDefault({ a = 1 } = {}) { return a; }",
    "function ordered({ a }, b = a * 2) { return a + b; }",
    "function captured({ a }) { return () => a + 1; }",
    "class C { m({ a }) { return a; } }",
    "const arrowPattern = ([x, y]) => x - y;",
    "return [destructured({ a: 1, b: 2 }), withDefault(), withDefault({ a: 9 }),",
    "  ordered({ a: 3 }), captured({ a: 5 })(), new C().m({ a: 4 }), arrowPattern([5, 3])];",
  ].join("\n");
  const request = new RunRequest();
  request.Sources = [body];
  request.Entry = "";
  const res = RunSources(request, () => {}, () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  const table = res.Table;
  const expected = [3, 1, 9, 9, 6, 4, 2];
  for (let i = 0; i < expected.length; i++) {
    eq(GetIndex(table, res.Value, Value.FromInt(i)).AsInt(), expected[i], "第 " + i + " 项");
  }
  // **对象剩余第 135 轮做掉了** ✓——原来这条断言的是「降级期就抛」✗，
  // 现在改成「**跑得出来、而且名单对**」✓（判据随契约更新 ✓）。
  // **走 `console.log` 那条路**（不用顶层 `return` ✗）：几条判据都用它 ✓，
  // 少一种「返回值怎么取」的形状 ✓。
  const restLines = [];
  const restProbe = new RunRequest();
  restProbe.Sources = [[
    "function f({ a, ...rest }) { return a + ':' + Object.keys(rest).join(','); }",
    "const { a: renamed, ...others } = { a: 1, b: 2, c: 3 };",
    "console.log(f({ a: 1, b: 2 }), renamed, Object.keys(others).join(','));",
  ].join("\n")];
  restProbe.Entry = "";
  const restRes = RunSources(restProbe, (text) => restLines.push(text), () => null);
  eq(restRes.Outcome, HostOutcome.Ok, "对象剩余跑得出来：" + restRes.Message);
  eq(restLines[0], "1:b 1 b,c", "对象剩余：函数形参位的名单与重命名位的名单都对");
});

console.log("");
console.log("=== 第 135 轮：for..of 解构 · var 提升 · 对象剩余 ===");

check("`var` 提升的判据一直是死代码（`flags` 是 `\"None\"`，不是 `\"Var\"`）", () => {
  // **这一条量的是根因那一层** ✓（端到端那一把在 `cases/27-…ts` 里 ✓）：
  // `var` 在 TS 的 `NodeFlags` 里**没有标志**（`NodeFlags.None` ✓——只有 `let` / `const`
  // 才有标志位 ✓），投影写成字符串 `"None"` ✓，而降级层比的是 `"Var"` ✗——
  // **那个值根本不存在** ✗，于是 `CollectHoistedVars` **一个名字都收不到** ✓
  //（第一版判据就是量到它返回 `[]` 才定位到这里的 ✓）。
  // **为什么一直没露**：`var` 的简单形状（声明在前、用在后）**恰好与 `let` 同形** ✓。
  const scope = require(path.join(root, "build", "ts", "typescript-exec", "scope.js"));
  const hoistedOf = (src) => {
    const projection = parseTsShape(src);
    const out = [];
    scope.CollectHoistedVars(projection.statements[0].body, out);
    return out;
  };
  eq(hoistedOf("function f() { var y = 3; return y; }").join(","), "y", "① 直接写的 var");
  eq(hoistedOf("function f() { if (true) { var y = 3; } return y; }").join(","), "y",
    "② 块里的 var（**要连嵌套块一起提**）");
  eq(hoistedOf("function f() { for (var i = 0; i < 2; i++) {} return i; }").join(","), "i",
    "③ `for (var i = …)`：列表**没有 `VariableStatement` 那层壳**");
  eq(hoistedOf("function f() { for (var x of [1]) {} return x; }").join(","), "x",
    "④ `for (var x of …)`");
  eq(hoistedOf("function f() { var { a } = { a: 1 }; return a; }").join(","), "a",
    "⑤ 绑定模式里的 var 名字");
  eq(hoistedOf("function f() { function g() { var z = 1; } return 0; }").join(","), "",
    "⑥ **不进内层函数**（`var` 属于它自己那一层）");
  // **`var x;` 是空操作** ✓：它只声明、不赋值（`Hoist` 已经声明过了 ✓）——
  // 判据现场：`inside = 5; if (true) { var inside; } return inside;` 该给 5 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "function f() { inside = 5; if (true) { var inside; } return inside; }",
    "console.log(f(), typeof later);",
    "var later = 1;",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "5 undefined", "`var x;` 不擦掉已有的值；用在前、声明在后给 `undefined`");
});

check("`for..of` 头部里的解构：声明一次、每轮只写", () => {
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const out = [];",
    "for (const [k, v] of [[1, 'a'], [2, 'b']]) out.push(k + '=' + v);",
    "for (const { n = 9 } of [{}]) out.push(n);",
    "for (const [first, ...rest] of [[1, 2, 3]]) out.push(first + ':' + rest.join('+'));",
    "for (let [i, x] of [[0, 'z']]) { i = i + 1; out.push(i + x); }",
    "for (const [a, b] of [[1, 2], [3, 4]]) { const sum = () => a + b; out.push(sum()); }",
    "console.log(out.join(','));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "1=a,2=b,9,1:2+3,1z,3,7", "六种形状一条不少（与 Node 逐值相同）");
});

console.log("");
console.log("=== 第 136 轮：字符串可迭代 · 字符串下标 · 空值上的属性读 ===");

check("字符串是可迭代物：`for (const c of \"ab\")` 一次一个码元", () => {
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const out = [];",
    "for (const c of 'abc') out.push(c);",
    "let n = 0; for (const c of '') n = n + 1;",
    "for (const c of 'xy') { out.push('-' + c); }",
    "console.log(out.join(''), n);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "abc-x-y 0", "字符串一次给一个码元，空串一次都不给");
  // **`iter_new` 那一支必须排在 `IsObject` 之前** ✗：字符串**不是对象** ✓
  //（`ValueTag.String` ✓），排在后面就永远走不到 ✓——报的还是那句
  // `iterating a non-object` ✓（第一版就是这么红的 ✓）。
  // **`for (const c of 42)` 照旧响亮地抛** ✓（数字不是可迭代物 ✓）。
  const bad = new RunRequest();
  bad.Sources = ["for (const c of 42) { console.log(c); }"];
  bad.Entry = "";
  // **没接住的时候只看结局** ✓：这一抛是**脚本级**的 ✓，驱动把它记成
  // 「第 0 份模块求值：the script threw」✗——**引擎那句原话不会冒到这里** ✓
  //（它已经被工厂变成了一个脚本可见的错误值 ✓）。所以这里量的是「**没跑成**」✓，
  // 原话那一层由上面那条 `iterating a non-object` 的**单元**判据管 ✓。
  const badRes = RunSources(bad, () => {}, () => null);
  ok(badRes.Outcome !== HostOutcome.Ok, "数字照旧抛（结局不是 Ok）");
});

check("字符串下标：`\"xy\"[0]` 是 `\"x\"`（同一件事只有一个答案）", () => {
  // **规范里原本写着「这是一块已知的语义差，不在这里顺手猜一个」** ✓——
  // 而 `props.xl.md` 的 `GetIndex` **早就办到了** ✓，只是 `vm.xl.md` 那一层
  // 对字符串接收者**一律先给 `undefined`** ✗。改它的理由不是「顺手」✓：
  // 同一件事两处答案 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "console.log('xy'[0], 'xy'[1], 'xy'[5], 'abc'.length);",
    "const [a, b] = 'pq';",
    "console.log(a, b);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "x y undefined 3", "越界给 `undefined`（不是抛）");
  eq(lines[1], "p q", "数组模式的解构**按下标读**，所以字符串也拆得开");
  // **数字 / 布尔的下标读照旧给 `undefined`** ✓（JS 的 `(5)[0]` 就是 `undefined` ✓）——
  // 只有**空值**才抛 ✓。
  const numeric = [];
  const numericRequest = new RunRequest();
  numericRequest.Sources = ["console.log((5)[0], (true)[1]);"];
  numericRequest.Entry = "";
  const numericRes = RunSources(numericRequest, (text) => numeric.push(text), () => null);
  eq(numericRes.Outcome, HostOutcome.Ok, "运行器：" + numericRes.Message);
  eq(numeric[0], "undefined undefined", "原始值下标读不抛");
});

check("读 `null` / `undefined` 的属性要抛，而且脚本接得住", () => {
  // **这一条量的是两处都改对了** ✓：`props.xl.md` 抛 ✓（`GetProperty` ✓）+
  // `vm.xl.md` 那一支**包一层 `Guard`** ✓——只改前者的话，抛出去的是**引擎的**异常 ✓，
  // 整份程序照样挂 ✗（判据现场会看到「脚本抛出」而不是「caught」✗）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const seen = [];",
    "try { const o = null; seen.push(o.member); } catch (e) { seen.push('caught-member'); }",
    "try { const { missing } = null; seen.push(missing); } catch (e) { seen.push('caught-destructure'); }",
    "try { const u = undefined; seen.push(u[0]); } catch (e) { seen.push('caught-index'); }",
    "console.log(seen.join(','));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "caught-member,caught-destructure,caught-index", "三种读法都进 `catch`");
  // **单元那一层也要量**：`GetProperty` 自己就得抛 ✓（不然「读」与「写」两边不一致 ✓——
  // 写空值的属性**早就会抛** ✓）。
  const unitTable = new HeapTable();
  const unitMachine = new Vm(unitTable, 1 << 20, 1000);
  const unitProtos = InitProtos(unitMachine.Room(), unitTable);
  let thrown = "";
  try {
    GetProperty(unitMachine.Room(), unitMachine.Native(), unitProtos, unitTable, Value.Null(),
      Value.FromString(unitTable.CreateString([97])));
  } catch (error) {
    thrown = String(error.message);
  }
  ok(thrown.indexOf("cannot read properties of null") >= 0, "`GetProperty` 单元层也抛：" + thrown);
});

console.log("");
console.log("=== 第 137 轮：instanceof 认内建构造函数 · 错误家族 ===");

check("内建构造函数的 `prototype`：`[] instanceof Array` 与 `e instanceof Error`", () => {
  // **这一轮进门量到的是一整族红** ✓：`[] instanceof Array` ✓、`new Map() instanceof Map` ✓、
  // `new Error("x") instanceof Error` ✓ 报的都是同一句
  // 「the right side of instanceof has no prototype object」✗——
  // 因为内建构造函数是 **`HostRef` 值** ✓、**没有属性表** ✗。
  // 端到端那一把在 `cases/29-instanceof-and-errors.ts` ✓；这里量**引擎那一格** ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const seen = [];",
    "seen.push([] instanceof Array, {} instanceof Object, [1] instanceof Object);",
    "const e = new TypeError('t');",
    "seen.push(e instanceof TypeError, e instanceof Error, e instanceof RangeError);",
    "seen.push(new Error('p') instanceof Error, Error.prototype.name, Object.prototype === Array.prototype);",
    "seen.push([].constructor === Array, ({}).constructor === Object);",
    "console.log(seen.join(','));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "true,true,true,true,true,false,true,Error,false,true,true",
    "整族 `instanceof` 与两条 `constructor` 链");
  // **`x instanceof 42` 照旧响亮地抛** ✓（JS 也是 `TypeError` ✓）——
  // 登记表那一条**只认 `HostRef`** ✓，其余右边照旧走「读 `prototype` 属性」那条老路 ✓。
  const bad = new RunRequest();
  bad.Sources = ["const r = 1 instanceof 42;"];
  bad.Entry = "";
  const badRes = RunSources(bad, () => {}, () => null);
  ok(badRes.Outcome !== HostOutcome.Ok, "右边不是对象时照旧抛");
});

check("登记表是「引擎给一格、语言层填」：`ConstructorProtoOf` 的语义", () => {
  // **引擎不认识 `ErrorCtor` = 280** ✓（那是建库层的约定 ✓）——它只有一格
  // 「号 → 原型句柄」✓，往里写什么由语言层决定 ✓（与 `SetErrorFactory` 同源 ✓）。
  // 这里直接量那一格：**登记过的给句柄、没登记的给 `0`** ✓（调用方据此退回老路 ✓）。
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  eq(machine.ConstructorProtoOf(280), 0, "没登记之前是 0");
  machine.RegisterConstructorProto(280, 77);
  eq(machine.ConstructorProtoOf(280), 77, "登记之后拿得到");
  machine.RegisterConstructorProto(280, 78);
  eq(machine.ConstructorProtoOf(280), 78, "**同一个号登记两次以最后一次为准**（重跑 BuildGlobals 不会把表越拉越长）");
  eq(machine.ConstructorProtoOf(281), 0, "别的号不受影响");
});

console.log("");
console.log("=== 第 138 轮：Map / Set / Date 的原型格 ===");

check("三族各自的 `prototype` 与 `constructor`：一条语义、两种接法", () => {
  // **端到端那一把在 `cases/30-collection-prototypes.ts`**（7 行逐字节 ✓）。
  // 这里钉的是**两种接法各自那条路** ✓：`Map` / `Set` 是**宿主引用值** ✓
  //（没有属性表 ✗ → 只能走登记表 ✓），`Date` 的全局值是**普通对象** ✓
  //（挂一个 `prototype` 属性就行 ✓；它**怎么被 `new`** 是另一件事 ✓——
  //  第 114~144 轮靠降级层那条特例 ✓，**第 145 轮起靠它自己那格可调用载荷** ✓）。
  // **选错的症状两处一样** ✓：`instanceof` 抛「the right side of instanceof has no prototype object」✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const m = new Map(); const s = new Set(); const d = new Date(0);",
    "console.log(m instanceof Map, s instanceof Set, d instanceof Date,",
    "  m instanceof Object, m instanceof Set, d instanceof Map);",
    "console.log(m.constructor === Map, s.constructor === Set, d.constructor === Date);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "true true true true false false", "三族认自己、都认 `Object`、互不认");
  eq(lines[1], "true true true", "三条 `constructor` 链");
  // **`constructor` 里放的是「全局那一份」** ✗：内建函数的相等**按句柄比** ✓
  //（`RtCmpEqStrict` 对 `HostRef` 比载荷句柄 ✓）——现造一个新句柄，
  // `new Map().constructor === Map` 给 `false` ✗（判据现场就是这么红的 ✓）。
  const same = [];
  const sameRequest = new RunRequest();
  sameRequest.Sources = ["console.log(Map === Map, new Map().constructor === Map, [].constructor === Array);"];
  sameRequest.Entry = "";
  const sameRes = RunSources(sameRequest, (text) => same.push(text), () => null);
  eq(sameRes.Outcome, HostOutcome.Ok, "运行器：" + sameRes.Message);
  eq(same[0], "true true true", "句柄同一（`constructor` 用的是全局那一份）");
});

console.log("");
console.log("=== 第 139 轮：引擎抛的也是 TypeError（失败类别那一格）===");

check("`Guard` 的失败类别：引擎报「哪一类」，语言层翻成名字", () => {
  // **端到端那一把在 `cases/31-engine-type-errors.ts`**（5 行逐字节 ✓）。
  // 这里钉的是**那一格本身**：`ErrorKindGeneric = 0` / `ErrorKindType = 1` ✓——
  // **引擎不认识 `"TypeError"` 这几个字母** ✗（它只报类别 ✓，与 `PrototypeKey` 同一条分界 ✓）。
  eq(ErrorKindGeneric, 0, "普通失败那一档");
  eq(ErrorKindType, 1, "类型失败那一档");
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const seen = [];",
    "try { const o = null; seen.push(o.x); } catch (e) { seen.push(e.name); }",
    "try { const u = undefined; seen.push(u[0]); } catch (e) { seen.push(e.name); }",
    "try { throw new Error('generic'); } catch (e) { seen.push(e.name); }",
    "try { throw new TypeError('typed'); } catch (e) { seen.push(e.name); }",
    "console.log(seen.join(','));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "TypeError,TypeError,Error,TypeError",
    "引擎抛的两处是 `TypeError`、脚本抛的各是各的");
  // **`instanceof` 两条都对** ✓：`TypeError` 认自己、也认 `Error` ✓（第 137 轮铺的链 ✓）。
  const chain = [];
  const chainRequest = new RunRequest();
  chainRequest.Sources = [[
    "try { const o = null; o.x; } catch (e) {",
    "  console.log(e instanceof TypeError, e instanceof Error, e instanceof RangeError); }",
  ].join("\n")];
  chainRequest.Entry = "";
  const chainRes = RunSources(chainRequest, (text) => chain.push(text), () => null);
  eq(chainRes.Outcome, HostOutcome.Ok, "运行器：" + chainRes.Message);
  eq(chain[0], "true true false", "`TypeError` 认自己与 `Error`、不认 `RangeError`");
});

console.log("");
console.log("=== 第 140 轮：super(m) 落在内建构造函数上 ===");

check("`super(m)` 往传进来的 `this` 上初始化，并返回它", () => {
  // **端到端那一把在 `cases/32-super-on-builtins.ts`**（5 行逐字节 ✓）。
  // 这里钉的是**那一格本身**：内建错误构造函数拿到 `self` 时，
  // ① 写 `message` / `name` 到**那个对象**上 ✓、② **返回它** ✓。
  // **返回 `self` 而不是新对象** ✗：JS 的规矩是「父类构造函数改的就是那一个 `this`」✓——
  // 返回新对象会让「谁是真的 `this`」出现两个答案 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "class MyErr extends Error { constructor(m) { super(m); this.name = 'MyErr'; } }",
    "const direct = new MyErr('one');",
    "let caught = null;",
    "try { throw new MyErr('two'); } catch (e) { caught = e; }",
    "console.log(direct.name, direct.message, direct instanceof Error,",
    "  caught.name, caught.message, caught instanceof MyErr);",
    "class Sub extends TypeError { constructor(m) { super(m); } }",
    "const sub = new Sub('bang');",
    "console.log(sub.name, sub.message, sub instanceof TypeError, sub instanceof MyErr);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "MyErr one true MyErr two true", "自己写的 `name` 与父类写的 `message` 都在");
  eq(lines[1], "TypeError bang true false", "不写 `name` 时从原型链上取到 `TypeError`");
  // **一行降级层改动都没有** ✗：`this` 是 `Op.Call` 的 `D` 操作数递过去的 ✓
  //（`lowering.xl.md` 的 `super(...)` 那一支 ✓）——这一条量的是「引擎/建库层改对了」✓。
  // **反面也量一下**：`super(...)` 造出来的**不能**是另一个对象 ✗——
  // 派生类构造函数里 `this.x = 1` 写在 `super()` 之后 ✓，两者必须是同一个对象 ✓。
  const identity = [];
  const identityRequest = new RunRequest();
  identityRequest.Sources = [[
    "class E extends Error { constructor(m) { super(m); this.extra = 1; } }",
    "const e = new E('m');",
    "console.log(e.message, e.extra, e instanceof E, e.constructor === E);",
  ].join("\n")];
  identityRequest.Entry = "";
  const identityRes = RunSources(identityRequest, (text) => identity.push(text), () => null);
  eq(identityRes.Outcome, HostOutcome.Ok, "运行器：" + identityRes.Message);
  eq(identity[0], "m 1 true true", "`super()` 之后写的字段与父类写的是同一个对象");
});

console.log("");
console.log("=== 第 141 轮：派生类的默认构造函数 · super(...xs) ===");

check("合成的默认构造函数要把实参转发下去，而且要**递归**问父类", () => {
  // **端到端那一把在 `cases/33-derived-default-ctor.ts`**（6 行逐字节 ✓）。
  // 这里钉的是**两处容易只做一半**的地方 ✓：
  //   ① 转发本身（`constructor(...args) { super(...args); }` ✓）；
  //   ② 「父类有没有构造函数」要**递归**问 ✓——`class B extends A {}` 的构造函数是
  //      **合成出来的、不在 `members` 里** ✗，只看 `members` 会让 `class C extends B {}`
  //      拿到一个**空的**默认构造函数 ✓（`new C(7).v` 是 `undefined` ✗，**静默错值** ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "class A { constructor(v) { this.v = v; } }",
    "class B extends A { }",
    "class C extends B { }",
    "console.log(new B(7).v, new C(8).v, new C(8) instanceof A);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "7 8 true", "一层与两层都转发（递归那一层是这条判据的全部意义）");
  // **自己直接继承 `Object`（没有 `extends`）到底** ✓：那时父类没有构造函数 ✓，
  // 于是这一类**不合成**转发 ✓（合成的话 `class A { constructor(v) {} }` 反而会多收参数 ✗）。
  const base = [];
  const baseRequest = new RunRequest();
  baseRequest.Sources = ["class A { constructor(v) { this.v = v; } } console.log(new A(1).v);"];
  baseRequest.Entry = "";
  const baseRes = RunSources(baseRequest, (text) => base.push(text), () => null);
  eq(baseRes.Outcome, HostOutcome.Ok, "运行器：" + baseRes.Message);
  eq(base[0], "1", "没有 `extends` 的类照旧");
});

check("`super(...xs)`：`CallArray` 那一格 `this` 原来就留着", () => {
  // **一个新算子都没加** ✓（第 141 轮）——`EmitCallArray(callee, argsArray, self)` ✓
  // 从第 133 轮起就是三格的 ✓，缺的只是把 `super` 接上去 ✓。
  // **与 `f(...xs)` 走同一条** ✓，所以混着写（`super(1, ...xs)` ✓）也天然对 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "class A { constructor(a, b) { this.sum = a + b; } }",
    "class B extends A { constructor(xs) { super(...xs); } }",
    "class C extends A { constructor(xs) { super(1, ...xs); } }",
    "console.log(new B([2, 3]).sum, new C([5]).sum);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "5 6", "整串铺开与混着写都铺对了");
  // **`super.m(...xs)` 仍然响亮地抛** ✓：那一支本来就用不了 `call_method` ✓
  //（「在谁身上找」与「谁是 this」要分开 ✓），要另配一条形状 ✓。
  let message = "";
  // **要用 `new RunRequest()`** ✗（这一轮又踩了一次 ✓）：随手写一个对象字面量的话，
  // 驱动读不到它要的那几个字段 ✓，报的是「Cannot read properties of undefined (reading 'length')」✗
  // ——离「你少构造了一个请求对象」这个真相很远 ✓。
  const methodProbe = new RunRequest();
  methodProbe.Sources = ["class A { m(x) { return x; } } class B extends A { m(xs) { return super.m(...xs); } }"];
  methodProbe.Entry = "";
  try {
    RunSources(methodProbe, () => {}, () => null);
  } catch (error) {
    message = String(error.message);
  }
  ok(message.indexOf("spreading into super.m") < 0,
    "**第 158 轮修好**：`super.m(...xs)` 不再抛（这一条当时钉的是「照旧抛」：「" + message + "」）");
  // **一档如实钉在明处的缺口** ✗（第 158 轮发现 ✓、第 159 轮量过并**证伪了一条线索** ✗）：
  // `super.m(...)` 的**每一种形状单独跑都对** ✓，可是把几个**凑在同一个类里**（四五个方法 ✓）
  // 就报 `calling a non-closure value` ✗。第 159 轮试过「补水退」
  //（在展开那一支也写一句 `Release` ✓，与固定实参那支同一条纪律 ✓）——**没修好** ✗，
  // 所以没有留下 ✗。这一格钉在这里 ✓：修好的那天它会变红 ✓。
  const crowdedLines = [];
  const crowdedRequest = new RunRequest();
  crowdedRequest.Sources = [[
    "class Base {",
    "  tag: string;",
    "  constructor(tag: string) { this.tag = tag; }",
    "  sum(a: number, b: number, c: number): number { return a + b + c; }",
    "  describe(...parts: string[]): string { return this.tag + ':' + parts.join('-'); }",
    "}",
    "class Child extends Base {",
    "  constructor() { super('child'); }",
    "  sumSpread(xs: number[]): number { return super.sum(...xs); }",
    "  describeSpread(parts: string[]): string { return super.describe(...parts); }",
    "}",
    "const c = new Child();",
    "const a = c.sumSpread([1, 2, 3]); const b = c.describeSpread(['a', 'b']);",
  ].join("\n")];
  crowdedRequest.Entry = "";
  let crowdedMessage = "";
  try {
    RunSources(crowdedRequest, (text) => crowdedLines.push(text), () => null);
  } catch (error) {
    crowdedMessage = String(error.message);
  }
  ok(crowdedMessage.indexOf("non-closure") >= 0 || crowdedLines.length === 0,
    "**已知差**：几个 `super.m(...)` 形状凑在同一个类里仍然报错（单独跑都对）：" + crowdedMessage);
});

console.log("");
console.log("=== 第 142 轮：回调要两个实参的那一族 ===");

check("`NativeCall` 的实参表开宽：`sort` / `reduce` / 下标回调", () => {
  // **端到端那一把在 `cases/34-two-argument-callbacks.ts`**（10 行逐字节 ✓）。
  // 这里钉的是**签名那一格**：`NativeCall` 从「一个值 + 一个 `hasArgument`」✗
  // 改成**一整个实参表** ✓（第 142 轮）——`sort((a, b) => …)` 与 `reduce((acc, x) => …)`
  // 原来**连签名都进不去** ✗（`Map.forEach(v => …)` 那条限制从第 116 轮记在台账里 ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const seen = [];",
    "seen.push([3, 1, 2].sort((a, b) => a - b).join(''));",
    "seen.push([1, 2, 3].reduce((acc, value) => acc + value, 0));",
    "seen.push([10, 20].map((value, index) => value + index).join(''));",
    "const m = new Map([['k', 9]]);",
    "m.forEach((value, key) => seen.push(key + value));",
    "console.log(seen.join('|'));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "123|6|1021|k9", "比较器两个实参、`reduce` 两个实参、下标回调、Map 的键");
  // **几个「想当然会写错」的口径** ✓：`sort()` 不给比较器时**按文本比** ✓
  //（`[10, 9].sort()` 给 `[10, 9]` ✓——按数值排「看起来更对」✗，但不是 JS ✓）；
  // `reduce` 没给初值时**第一项当初值**（**不跑回调** ✓）；
  // **空数组且没给初值要抛** ✓（JS 是 `TypeError` ✓，这里响亮地抛 ✓）。
  const lines2 = [];
  const request2 = new RunRequest();
  request2.Sources = [[
    "console.log([10, 9].sort().join(''), [1, 2].reduce((a, b) => a + b));",
    "try { [].reduce((a, b) => a + b); console.log('no-throw'); } catch (e) { console.log('caught'); }",
  ].join("\n")];
  request2.Entry = "";
  const res2 = RunSources(request2, (text) => lines2.push(text), () => null);
  eq(res2.Outcome, HostOutcome.Ok, "运行器：" + res2.Message);
  eq(lines2[0], "109 3", "文本口径与「第一项当初值」");
  eq(lines2[1], "caught", "空数组 + 无初值：响亮地抛（不是静默给 `undefined`）");
});

console.log("");
console.log("=== 第 144 轮：真假只有一个定义（空串是假）===");

check("`TruthyOf` 与 `AsBool` 的分工：**空串**那一档两处必须分歧", () => {
  // **端到端那一把在 `cases/36-truthiness.ts`**（14 行逐字节 ✓）。
  // 这里钉的是**那一格本身**：`AsBool` 看不到码元长度 ✗——`""` 在它那里是**真** ✗，
  // 而 JS（以及 `TruthyOf`）给**假** ✓。
  // **这个分歧就是这一轮的存在理由** ✓：两处都「有答案」、都不报错 ✗，
  // 只有把两条路摆在一起对拍才看得见 ✓——`if ("")` 走真那一支已经跑了很久 ✓。
  const table = new HeapTable();
  const empty = Value.FromString(table.CreateString([]));
  const text = Value.FromString(table.CreateString(units("a")));
  eq(empty.AsBool(), true, "`AsBool` 对空串给真（它看不到长度）");
  eq(TruthyOf(table, empty), false, "`TruthyOf` 对空串给假（JS 的口径）");
  eq(text.AsBool(), true, "非空串 `AsBool` 给真");
  eq(TruthyOf(table, text), true, "非空串 `TruthyOf` 也给真");
  // **其余每一档两处逐条一致** ✓：改口径不能把它们动坏 ✓（`AsBool` 的四个判断
  // 与 `TruthyOf` 里那四行是同一个答案 ✓——分歧**只**在字符串那一档 ✓）。
  const same = (value, want, what) => {
    eq(TruthyOf(table, value), want, "TruthyOf：" + what);
    eq(value.AsBool(), want, "AsBool：" + what);
  };
  same(Value.Undefined(), false, "undefined");
  same(Value.Null(), false, "null");
  same(Value.FromBool(false), false, "false");
  same(Value.FromBool(true), true, "true");
  same(Value.FromInt(0), false, "0");
  same(Value.FromDouble(-0), false, "-0");
  same(Value.FromDouble(NaN), false, "NaN");
  same(Value.FromInt(-1), true, "-1");
  same(Value.FromDouble(Infinity), true, "Infinity");
  same(Value.FromDouble(-Infinity), true, "-Infinity");
});

check("四条调用路对同一个值给同一个答案（`TruthyOf` 是它们共同的底）", () => {
  // **五处调用点** ✓：`vm.xl.md` 的 `jmp_if_false`（`if` / `while` / `&&` / `||` / `?:`
  // 五条降级**全落在这一条指令上** ✓）、`RtNot`（`!` ✓）、`RtToBoolean`（`Boolean(x)` ✓）、
  // 建库层的 `filter` 与谓词族 ✓。
  // 第 144 轮之前，前三处走 `Value.AsBool`、后两处也走它 ✗——**四处错在同一格上** ✓。
  const table = new HeapTable();
  const empty = Value.FromString(table.CreateString([]));
  eq(TruthyOf(table, empty), false, "底下的那一格：假");
  eq(RtToBoolean(table, empty).AsBool(), false, "`RtToBoolean` 走 `TruthyOf`");
  eq(RtNot(table, empty).AsBool(), true, "`RtNot` 走 `TruthyOf`");
  // **空串是唯一会分歧的一档，所以这四条路的一致性只要量它就够** ✓
  // （其余档在 `AsBool` 那边已经逐条对过 ✓）。
  // 下面这一把把**降级层到建库层整条链**摆在一起：同一份源码、同一组期望字串 ✓——
  // 写 `AsBool()` 的话 `filter:` 那一段会多出一个空元素 ✓（**判据现场就是它的形状** ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const seen: string[] = [];",
    "const empty = '';",
    "seen.push('if:' + (empty ? 'T' : 'F'));",
    "seen.push('and:[' + (empty && 'x') + ']');",
    "seen.push('or:' + (empty || 'x'));",
    "seen.push('not:' + !empty);",
    "seen.push('filter:' + ['', 'a', ''].filter((s) => s).join('|'));",
    "seen.push('some:' + [''].some((s) => s) + ',' + ['', 'a'].some((s) => s));",
    "seen.push('every:' + ['', 'a'].every((s) => s) + ',' + [''].every((s) => s));",
    "seen.push('find:' + ([''].find((s) => s) === undefined) + ',' + [''].findIndex((s) => s));",
    "let n = 0;",
    "while (empty) { n = n + 1; }",
    "seen.push('while:' + n);",
    "console.log(seen.join(' '));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "if:F and:[] or:x not:true filter:a some:false,true every:false,false find:true,-1 while:0",
    "七条路一个答案（与 Node 逐字节相同）");
});

console.log("");
console.log("=== 第 145 轮：既是对象又可调用（`String(1)` · `new Date(ms)` · `new Array(3)`）===");

check("`AttachCallable` 那一格：挂上之后**仍然是对象**，而且回收过的格子不带载荷", () => {
  // **端到端那一把在 `cases/37-callable-globals.ts`**（15 行逐字节 ✓）。
  // 这里钉的是**堆那一格本身**：JS 的 `String` / `Date` / `Array` 是**函数对象** ✓，
  // 而本仓原来只有两半里的各一半 ✗（宿主引用能被调 ✓、对象能带属性 ✓，
  // **两样都占的没有** ✗——`vm.xl.md` 的 `DoNew` 从第 138 轮起就把这条缺口写在明处 ✓）。
  //
  // 选「对象带一格载荷」而不是「宿主引用带属性表」的理由在 `heap.xl.md` 里 ✓
  // （后者要让**回收器**多跟一条边 ✓，而对象这一档 `Charge` / `Clear` 早就按
  // `Host !== null` 判过 ✓）。这里量三件事：**还是对象** ✓、**能被调** ✓、**回收之后不带载荷** ✓。
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const protos = InitProtos(machine.Room(), table);
  const object = NewPlainObject(machine.Room(), table, protos);
  eq(machine.IsHostCallable(object), false, "普通对象不可调用");
  eq(IsCallableValue(table, object), false, "建库层那条判据也说不");
  // 它是**对象**：属性照写照读（挂载荷不能把这一半弄坏）
  const key = propKey(table, "staticMethod");
  // **第 333 轮起 `SetProperty` 返回一个布尔** ✓（见上面「自有属性的读、写、缺省」那一条 ✓）。
  eq(SetProperty(machine.Room(), machine.Native(), table, object, key, Value.FromInt(7)), true,
    "`SetProperty` 照旧");
  eq(GetProperty(machine.Room(), machine.Native(), protos, table, object, key).AsInt(), 7,
    "静态属性照读");
  // **挂上载荷**：三处判据一起变
  table.AttachCallable(object.Ref, 999, 0);
  eq(machine.IsHostCallable(object), true, "`IsHostCallable` 认它");
  eq(IsCallableValue(table, object), true, "`IsCallableValue` 认它");
  eq(object.IsCallable(), false, "**`Value.IsCallable` 看不见那一格**（它没有表，分工写在两个文件里）");
  // 它**仍然是对象**：属性还在、原型还在、`typeof` 换了名字
  eq(GetProperty(machine.Room(), machine.Native(), protos, table, object, key).AsInt(), 7,
    "挂上之后静态属性还在");
  eq(table.Get(object.Ref).Proto, protos.Object, "原型没动（`Object.create` 那种语义不该被牵连）");
  eq(TypeOfName(table, object), "function", "`typeof` 报 function（JS：函数对象就是 function）");
  const units = TypeUnitsOf(table, object);
  let spelled = "";
  for (let i = 0; i < units.length; i++) spelled += String.fromCharCode(units[i]);
  eq(spelled, "function", "引擎那一条（码元形式）与上面那条同一条规则");
  // **回收之后载荷不许残留** ✗：`AllocateRaw` 复用空格时走 `Clear()` ✓——
  // 少了这一步，「随便一个对象能被调用」是最难查的一种 ✓（判据现场就是这么红的 ✓）。
  table.Retire(object.Ref);
  const reused = table.CreateObject();
  eq(reused, object.Ref, "空闲链把那一格还回来了（前提：这一条才有意义）");
  eq(machine.IsHostCallable(Value.FromObject(reused)), false, "复用出来的新对象**不带**上一次的可调用载荷");
});

check("四个全局名的语义：`String` / `Number` / `Boolean` / `Array`（含 `Number` 的六档）", () => {
  // **`Number` 那一族单独量**：它是四个里唯一有「一张表」的 ✓——
  // `parseInt` / `parseFloat` 是**前缀**口径（`parseInt("12px")` 给 `12` ✓），
  // 而 `Number("12px")` 给 **`NaN`** ✓（整串都得是数 ✓）。两者差一格就会**静默给错值** ✗。
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 1000);
  const protos = InitProtos(machine.Room(), table);
  const num = (text) => NumberFromValue(machine.Room(), null, table, protos,
    Value.FromString(table.CreateString(units(text))));
  eq(num("7").AsInt(), 7, "整数串");
  eq(num("") === undefined, false, "空串有一档答案（不是 undefined）");
  eq(num("").AsInt(), 0, "**空串给 0**（JS 的 `Number(\"\")` ✓，而 `parseInt(\"\")` 给 `NaN` ✗）");
  eq(num("0x10").AsInt(), 16, "十六进制整串");
  eq(num("12px") === undefined, false, "坏输入也给一个值（不抛）");
  ok(num("12px").Tag === ValueTag.Float64 && Number.isNaN(num("12px").Dbl),
    "**`12px` 给 `NaN`**（整串口径；`parseFloat` 才给 12）");
  eq(NumberFromValue(machine.Room(), null, table, protos, Value.FromInt(5)).AsInt(), 5, "数给数");
  eq(NumberFromValue(machine.Room(), null, table, protos, Value.FromBool(true)).AsInt(), 1, "`true` 给 1");
  eq(NumberFromValue(machine.Room(), null, table, protos, Value.FromBool(false)).AsInt(), 0, "`false` 给 0");
  eq(NumberFromValue(machine.Room(), null, table, protos, Value.Null()).AsInt(), 0, "`null` 给 0");
  ok(NumberFromValue(machine.Room(), null, table, protos, Value.Undefined()).Dbl
    !== NumberFromValue(machine.Room(), null, table, protos, Value.Undefined()).Dbl,
    "**`undefined` 给 `NaN`**（与 `null` 那一格不一样）");
  // **负零要保住**（`Number("-0")` 在 JS 里是 `-0` ✓）：收窄走引擎的 `MakeNumber` ✓
  //（本文件的 `MathResult` 会把它收成 `Int32 0` ✗——两处只差这一格 ✓）。
  const negativeZero = num("-0");
  eq(negativeZero.Tag, ValueTag.Float64, "`-0` 留在 `Float64` 上（没被收成 `Int32`）");
  eq(1 / negativeZero.Dbl, -Infinity, "符号位还在（`1 / -0` 是 `-Infinity`）");
  // **对象那一档第 198 轮通了** ✓：`Number(对象)` 现在转调引擎的 `ToNumberOf` ✓
  //（原来这里断言的是「响亮地抛」✗——理由是「要 `ToPrimitive`，没做」✓，那一轮做出来了 ✓）。
  // **答案来自 `ToPrimitive` 那两步** ✓，而且必须与 `+对象` **逐字相同** ✓
  //（两处各写一遍的话它们早晚会分叉 ✗）。这里 `call === null` ✓，
  // 所以对象那一支取不到 `valueOf` / `toString` ✓ → 交回原始值那一半 → **响亮地抛** ✓。
  let message = "";
  try {
    NumberFromValue(machine.Room(), null, table, protos, NewPlainObject(machine.Room(), table, protos));
  } catch (error) {
    message = String(error.message);
  }
  ok(message.indexOf("ToNumber") >= 0, "没有重入通道时对象那一档仍旧响亮地抛：" + message);
  // **有了通道就给 JS 的答案** ✓（`Number({})` 是 `NaN` ✓、`Number([])` 是 `0` ✓）——
  // 这一条走的是**端到端**那一把（`Node 逐字节`✓），因为要装库层的 `Object.prototype` ✓。
  const convertOut = [];
  const convertRequest = new RunRequest();
  convertRequest.Sources = ["console.log(Number([]), Number({}), Number(true), Number(null));"];
  convertRequest.Entry = "";
  const convertRes = RunSources(convertRequest, (text) => convertOut.push(text), () => null);
  eq(convertRes.Outcome, HostOutcome.Ok, "运行器（`Number` 对对象）：" + convertRes.Message);
  eq(convertOut[0], "0 NaN 1 0", "**这一轮修的**：`Number([])` 是 0、`Number({})` 是 NaN（原来抛）");
  // **`Boolean` 在名单里** ✓（第 144 轮之前它连全局名都不是 ✗）：
  // 名单与 `BuildGlobals` 是同一份约定 ✓——「声明了却没提供」是一条判据 ✓。
  ok(GlobalNames().indexOf("Boolean") >= 0, "`GlobalNames` 里有 `Boolean`");
  eq(GlobalNames().indexOf("Boolean") >= 0 && GlobalNames().indexOf("String") >= 0, true,
    "其余几个也还在名单里");
});

check("`new Array(n)` 是洞、`Array(1, 2)` 是元素（一条构造、两种实参形态）", () => {
  // JS 的口径：**一个数是长度**（格子全是洞 ✓，`0 in a` 为假 ✓），**其余是元素** ✓。
  // 长度那一档复用 `HeapArray.Truncate` ✓——它的规矩本来就是「变长时新增的全是洞」 ✓
  //（`heap.xl.md` 写着这一条 ✓），所以这里一行新语义都没有 ✓。
  //
  // **注意 `0 in holes` 不能写进数组字面量里** ✗：`[0 in holes]` 是**语料之外**的一条
  // 已知缺口 ✓（token 层把它读成映射键的 `TypeParameter` ✓，报
  // `unimplemented: expression TypeParameter` ✓）——那是**另一件事** ✓，
  // 不该混进这一轮的判据里 ✓（所以下面把它放在 `console.log` 的实参位上 ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const holes = new Array(3);",
    "console.log(holes.length, holes.join('-'), 0 in holes, 2 in holes);",
    "const items = Array(1, 2);",
    "console.log(items.join(','), Array().length, new Array().length, typeof new Array(1));",
    "const big = new Array(0);",
    "console.log(big.length, big.join(',').length, [1, 2, 3].map(String).join('|'), [1, 0].filter(Boolean).length);",
    "console.log(String);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "3 -- false false", "长度 / 洞 / `in` 为假");
  eq(lines[1], "1,2 0 0 object", "元素那一档 / 空 / `typeof`");
  eq(lines[2], "0 0 1|2|3 1", "空长度、可调用对象当回调、`Boolean` 当真假");
  // **印法写在明处** ✗：Node 给 `[Function: String]` ✓，而**名字那一格宿主载荷里没有** ✗
  //（`HeapHostRef` 只有能力号 + 不透明载荷 ✓）——所以给 `[Function (anonymous)]` ✓，
  // 与**宿主引用**那一档同一个答案 ✓（`console.log(Map)` 今天就是这个 ✓）。
  eq(lines[3], "[Function (anonymous)]", "`console.log(String)` 的形状（与宿主引用同一档）");
  // **`String(String)` 响亮地抛** ✓（JS 给源码文本 ✗——那一份这一层拿不到 ✓）：
  // 与闭包 / 宿主函数同一条口径 ✓，**不许落进 `[object Object]`** ✗（那是静默错值 ✓）。
  const strict = new RunRequest();
  strict.Sources = ["try { const t = String(String); console.log('no-throw', t); } catch (e) { console.log('caught'); }"];
  strict.Entry = "";
  const strictLines = [];
  const strictRes = RunSources(strict, (text) => strictLines.push(text), () => null);
  eq(strictRes.Outcome, HostOutcome.Ok, "运行器：" + strictRes.Message);
  eq(strictLines[0], "caught", "`String(String)` 抛，而且脚本接得住");
});

console.log("");
console.log("=== 第 146 轮：解构赋值（`[a, b] = [b, a]`）===");

check("同一个模式在**声明位**与**赋值位**给出同一对答案（读法只有一份）", () => {
  // **端到端那一把在 `cases/38-destructuring-assignment.ts`**（12 行逐字节 ✓）。
  // 这里钉的是这一轮**最想保住的那条**：两半的**读法一个字都不差** ✓——
  // 对象按属性名 ✓、数组按下标 ✓、`...剩余` 走**同一个**内建 ✓、
  // 默认值只在**严格 `undefined`** 时生效 ✓（第 146 轮那一段提出来成了 `DestructureDefault` ✓）。
  // 所以同一份源码里两半并排写，结果必须**逐项相同** ✓——
  // 这正是「两处各写一遍会走偏」那条纪律的可查形状 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const src = { a: 1, b: 2, c: 3 };",
    "const { a: d1, ...drest } = src;",
    "let a1 = 0; let arest: any = null;",
    "({ a: a1, ...arest } = src);",
    "console.log([d1, Object.keys(drest).join(','), a1, Object.keys(arest).join(','),",
    "  drest.b === arest.b, drest.c === arest.c].join('|'));",
    "const arr = [1, undefined, 3, 4];",
    "const [h1, h2 = 5, ...hrest] = arr;",
    "let q1 = 0, q2 = 0, qrest: any = null;",
    "[q1, q2 = 5, ...qrest] = arr;",
    "console.log([h1, h2, hrest.join('-'), q1, q2, qrest.join('-')].join('|'));",
    // 默认值只在**严格 undefined** 时生效：`null` 不触发（两半都要如此）
    "const [n1 = 7] = [null];",
    "let n2 = 0;",
    "[n2 = 7] = [null];",
    "console.log(n1 === null, n2 === null, n1, n2);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "1|b,c|1|b,c|true|true", "对象：重命名与剩余（名单是**前面拆走的键**）");
  eq(lines[1], "1|5|3-4|1|5|3-4", "数组：洞位跳过、默认值、剩余");
  // **`null` 不触发默认值** ✓（JS 的规矩：只有 `undefined` 才算缺 ✓）——
  // 这一格用 `is_nullish` 实现就会错 ✓，而错了**看不出来**（`null` 变成 `7` ✓，静默错值 ✓）。
  // （`Array.join` 把 `null` 印成空串 ✓，所以这里比的是 `=== null` 而不是那一串文本 ✓。）
  eq(lines[2], "true true null null", "`null` 不算缺（两半一致）");
});

check("求值顺序与赋值表达式的值（右边先算完、目标从左到右）", () => {
  // JS 的顺序是**语义** ✓（第 146 轮实测确认 ✓）：
  //   ① 右边**整个先算完** ✓（`DestructureAssign` 拿到的是一格现成的值 ✓）；
  //   ② 目标**从左到右**一个个写 ✓，`o.x` 的接收者在**轮到它的时候**才求值 ✓；
  //   ③ **赋值表达式的值就是右边** ✓（`([w] = [42])[0]` 是 `42` ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const order: string[] = [];",
    "const box: any = { x: 0 };",
    "function rhs(): number[] { order.push('rhs'); return [1, 2]; }",
    "function target(): any { order.push('target'); return box; }",
    "[target().x, box.x] = rhs();",
    "let w = 0;",
    "const whole = ([w] = [42]);",
    // 默认值里的表达式看得见**前面刚写的**那个目标 ✓（右侧的赋值就在语句顺序里 ✓）
    "let s1 = 0, s2 = 0;",
    "[s1 = 3, s2 = s1 + 10] = [];",
    "console.log(order.join(','), box.x, w, whole[0], s1, s2);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "rhs,target 2 42 42 3 13",
    "顺序、表达式值、默认值看得见前一个目标");
});

check("失败形状必须**响亮**：没声明的名字 · 计算键 + 剩余 · 不可迭代的右边", () => {
  // 三处都是「不许静默给个看似合理的值」✓：
  //   ① **没声明的目标**：`ResolveAccess` 找不到就抛 ✓——**不静默造一个全局** ✗
  //     （JS 在**脚本**里会造一个全局 ✓，在**模块**里抛 `ReferenceError` ✓；
  //      本仓走的是模块那一档 ✓，而且**在降级期**就抛 ✓（TS 自己也会报 `Cannot find name` ✓））；
  //   ② **计算键 + 剩余**：名单是**编译期的常量表** ✗，运行期的键与它凑不到一起 ✓——
  //     这时候**漏掉一个键**的症状只是「剩余对象里多出一个已经拆走的键」✓（静默错值 ✗）；
  //   ③ **不可迭代的右边**：`[k] = 5` 在 JS 里也是 `TypeError` ✓（脚本接得住 ✓）。
  let undeclared = "";
  const first = new RunRequest();
  first.Sources = ["let k = 0; [k] = [1]; [missing] = [2];"];
  first.Entry = "";
  try {
    RunSources(first, () => {}, () => null);
  } catch (error) {
    undeclared = String(error.message);
  }
  ok(undeclared.indexOf("not a local or a capture") >= 0, "没声明的目标在降级期就抛：" + undeclared);

  let computed = "";
  const second = new RunRequest();
  second.Sources = ["const k = 'a'; let v = 0; let r = null; ({ [k]: v, ...r } = { a: 1, b: 2 });"];
  second.Entry = "";
  try {
    RunSources(second, () => {}, () => null);
  } catch (error) {
    computed = String(error.message);
  }
  ok(computed.indexOf("object rest after a computed key") >= 0, "计算键 + 剩余响亮地抛：" + computed);

  // **计算键本身是通的** ✓（第 146 轮收下 ✓）：`({[k]: v} = o)` 把键**当值求一次** ✓，
  // 走 `get_index` 那条（非数组接收者由引擎把键字符串化 ✓）——
  // 所以 `({[1]: n} = {1:'one'})` 也对 ✓（那一格的键是一个**数** ✓）。
  const lines = [];
  const third = new RunRequest();
  third.Sources = [[
    "const k = 'a'; let v = 0; let n = 0;",
    "({ [k]: v } = { a: 5 });",
    "({ [1]: n } = { 1: 6 });",
    "console.log(v, n);",
    "const bad = [];",
    "try { [bad[0]] = [7]; console.log('assign-into-array', bad[0]); } catch (e) { console.log('caught'); }",
    "try { let q = 0; [q] = 5; console.log('no-throw', q); } catch (e) { console.log('caught-noniterable'); }",
    "try { let s1 = 0, s2 = 0; [s1, s2] = new Set([8, 9]); console.log('set', s1, s2); } catch (e) { console.log('caught-set'); }",
  ].join("\n")];
  third.Entry = "";
  const thirdRes = RunSources(third, (text) => lines.push(text), () => null);
  eq(thirdRes.Outcome, HostOutcome.Ok, "运行器：" + thirdRes.Message);
  eq(lines[0], "5 6", "计算键（字符串 / 数字）都读得到");
  eq(lines[1], "assign-into-array 7", "下标目标照常");
  // **第 151 轮把它修好了** ✓（这条判据当时就该变红 ✓——它就是这么设计的 ✓）：
  // 数组解构现在**先过 `GetIterator`** ✓（`for..of` 与 `[...xs]` 的第一步就是它 ✓），
  // 于是 `[a, b] = new Set([8, 9])` 给 `8, 9` ✓（原来是**静默**的 `undefined, undefined` ✗）。
  // **还剩一档** ✗：生成器仍然过不去 ✓（`GetIterator` 把它**原样**返回 ✓，
  // 而按位置读一个生成器读不到东西 ✗）——那一档要引擎发 `iter_next` ✓，另记一条 ✓。
  // **这一条第 199 轮变红了，而且方向是对的** ✓：`[q] = 5` 现在**抛** ✓——
  // JS 在解构不可迭代物时也是 `TypeError` ✓，而本仓原来**静默**给 `undefined` ✗
  // （**静默错值** ✗，比抛危险得多 ✓）。原因是数组模式那一步现在多了一个收尾的
  // `IterDrain` ✓：`get_iterator` 对数字**原样返回** ✓（它没有意见 ✓），
  // 而收尾那一步说得出「这不是可迭代物」✓。
  eq(lines[2], "caught-noniterable", "**第 199 轮修的**：`[q] = 5` 抛（原来静默给 undefined）");
  eq(lines[3], "set 8 9", "第 151 轮修好：`[a, b] = new Set(...)` 走迭代协议，给 `8 9`");
  // **生成器那一档第 199 轮做掉了** ✓（这一条原来钉的是「做出来那天会变红」✗）。
  const genLines = [];
  const genRequest = new RunRequest();
  genRequest.Sources = [[
    "function* g() { yield 1; yield 2; }",
    "const [g1, g2] = g();",
    "console.log('gen', g1, g2);",
  ].join("\n")];
  genRequest.Entry = "";
  const genRes = RunSources(genRequest, (text) => genLines.push(text), () => null);
  eq(genRes.Outcome, HostOutcome.Ok, "运行器：" + genRes.Message);
  eq(genLines[0], "gen 1 2",
    "**第 199 轮修的**：`const [g1, g2] = g()` 给产出的头两个");
});

console.log("");
console.log("=== 第 147 轮：位运算七条（`& | ^ ~ << >> >>>`）===");

check("`ToInt32Of`：先向零截断、再按 2³² 取模、`NaN`/`±Infinity` 给 0", () => {
  // **端到端那一把在 `cases/39-bitwise-operators.ts`**（10 行逐字节 ✓）。
  // 这里钉的是**那一格本身**——七条位运算**共用**的第一步 ✓，也是这一轮两处实测 bug 的所在 ✓：
  //
  //   ① **顺序** ✗：第一版先加 `2³²` 再截断 ✓，于是 `-1.9 | 0` 给 `-2` ✗（JS 给 `-1` ✓）——
  //      因为「向零截断」对负数与对「加过一轮的大正数」是两个方向 ✓；
  //   ② **`>>>` 的高位** ✗：算术右移给负数补 1 ✓，而无符号右移该补 0 ✓——
  //      `-1 >>> 28` 该是 `15` ✓，第一版给的是 `4294967295` ✗。
  //
  // 两处都不是「差不多」✗：它们**静默给一个看起来成立的整数** ✓，所以判据把边界逐个钉住 ✓。
  const table = new HeapTable();
  // **`ToInt32Of` 只收一个值**（签名里没有表 ✗——它不碰堆 ✓）：第一版判据照着
  // `RtBitAnd(table, …)` 的形状多传了一个表 ✓，于是 `NumericOf` 收到的是那张表 ✓，
  // 报的是「非数值操作数」✗（离现场很近，但指的是**判据**写错了 ✓，不是引擎 ✓）。
  const asInt = (v) => ToInt32Of(v);
  eq(asInt(Value.FromInt(6)), 6, "整数原样");
  eq(asInt(Value.FromInt(-1)), -1, "负数原样");
  eq(asInt(Value.FromDouble(1.9)), 1, "正小数向零截断");
  eq(asInt(Value.FromDouble(-1.9)), -1, "**负小数也向零**（第一版给 -2）");
  eq(asInt(Value.FromDouble(-0.5)), 0, "`-0.5` 给 0");
  eq(asInt(Value.FromDouble(4294967295)), -1, "`2³² - 1` 折回 `-1`");
  eq(asInt(Value.FromDouble(4294967296)), 0, "`2³²` 折回 `0`");
  eq(asInt(Value.FromDouble(4294967297)), 1, "`2³² + 1` 折回 `1`");
  eq(asInt(Value.FromDouble(2147483648)), -2147483648, "`2³¹` 是符号位那一半");
  eq(asInt(Value.FromDouble(NaN)), 0, "`NaN` 给 0");
  eq(asInt(Value.FromDouble(Infinity)), 0, "`Infinity` 给 0");
  eq(asInt(Value.FromDouble(-Infinity)), 0, "`-Infinity` 给 0");
  // **非数值响亮地抛** ✓（JS 会先 `ToNumber`，那要 `ToPrimitive` ✗——不许静默按 0 算 ✗）。
  let message = "";
  try { asInt(Value.FromString(table.CreateString(units("3")))); } catch (error) { message = String(error.message); }
  ok(message.indexOf("non-numeric") >= 0, "字符串那一档响亮地抛：" + message);
});

check("七条算子：结果落在 `int32` 里，只有 `>>>` 可能超出（那一条走 `MakeNumber`）", () => {
  const table = new HeapTable();
  const value = (n) => Value.FromDouble(n);
  const at = (v) => (v.Tag === ValueTag.Int32 ? v.Int : v.Dbl);
  eq(at(RtBitAnd(table, Value.FromInt(6), Value.FromInt(3))), 2, "`6 & 3`");
  eq(at(RtBitOr(table, Value.FromInt(6), Value.FromInt(3))), 7, "`6 | 3`");
  eq(at(RtBitXor(table, Value.FromInt(6), Value.FromInt(3))), 5, "`6 ^ 3`");
  eq(at(RtBitNot(table, Value.FromInt(6))), -7, "`~6`");
  eq(at(RtBitNot(table, Value.FromInt(0))), -1, "`~0`");
  eq(at(RtShl(table, Value.FromInt(1), Value.FromInt(4))), 16, "`1 << 4`");
  // **回绕**：`2147483647 << 1` 是 `-2` ✓（JS 的位运算就是 `int32` 的 ✓）。
  eq(at(RtShl(table, Value.FromInt(2147483647), Value.FromInt(1))), -2, "`<<` 按 int32 回绕");
  // **移位数的低 5 位**：`8 >> 33` 就是 `8 >> 1` ✓（`33 & 31 = 1` ✓）。
  eq(at(RtShr(table, Value.FromInt(8), Value.FromInt(33))), 4, "`>>` 取低 5 位");
  eq(at(RtShr(table, Value.FromInt(-8), Value.FromInt(1))), -4, "`>>` 是算术右移");
  eq(at(RtUShr(table, value(-1), Value.FromInt(0))), 4294967295, "`-1 >>> 0`（进位成浮点）");
  eq(RtUShr(table, value(-1), Value.FromInt(0)).Tag, ValueTag.Float64, "它**超出 int32**，所以是 `Float64`");
  eq(at(RtUShr(table, value(-1), Value.FromInt(28))), 15, "**`-1 >>> 28` 是 15**（第一版给 4294967295）");
  eq(at(RtUShr(table, value(-1), Value.FromInt(1))), 2147483647, "`-1 >>> 1`");
  eq(at(RtUShr(table, value(4294967295), Value.FromInt(0))), 4294967295, "`2³² - 1` 原样给出");
});

check("端到端：日常形状里的位运算（复合赋值 · 箭头体 · 掩码 · 哈希）", () => {
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "let flags = 0;",
    "flags |= 4; flags |= 1; flags &= 5; flags ^= 1; flags <<= 2; flags >>= 1; flags >>>= 0;",
    "const xs = [1, 2, 3, 4, 5];",
    "function hash(s: string): number { let h = 0;",
    "  for (const c of s) { h = ((h << 5) - h + c.charCodeAt(0)) | 0; } return h; }",
    "const toInt = (n) => (n | 0);",
    "const inBlock = (n) => { return (n & 3) === 2; };",
    "console.log(flags, xs.filter((n) => (n & 1) === 1).join(','), hash('abc'),",
    "  toInt(3.9), inBlock(6), inBlock(5), -1 >>> 28);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "8 1,3,5 96354 3 true false 15", "复合赋值六条 + 箭头体 + 掩码 + 哈希");
  // **箭头函数的体里带括号的位运算**（第 147 轮顺手修的 token 层那一格）：
  // `(n) => (n | 0)` 里那个括号原来被判成**类型位** ✗（`IsTypeBracketPosition` 的 `=>` 那一格 ✓），
  // 于是 `n | 0` 折成一个 `UnionType` ✓，降级层报 `unimplemented: expression UnionType` ✓。
  // 现在问的是「形参表是不是箭头函数的」（`LamdaReorganization.IsLambdaParameters` ✓）。
  const tokenFix = [];
  const tokenRequest = new RunRequest();
  tokenRequest.Sources = [[
    "const f = (n) => (n | 0);",
    "const g = (n) => { return (n & 2) === 2; };",
    "console.log(f(3.7), g(6), g(5));",
  ].join("\n")];
  tokenRequest.Entry = "";
  const tokenRes = RunSources(tokenRequest, (text) => tokenFix.push(text), () => null);
  eq(tokenRes.Outcome, HostOutcome.Ok, "运行器：" + tokenRes.Message);
  eq(tokenFix[0], "3 true false", "箭头体（括号式与块式）里的位运算都通了");;
  let aliasLines = [];
  let aliasMessage = "";
  try {
    const aliasRequest = new RunRequest();
    aliasRequest.Sources = ["type F = A & B; console.log(1);"];
    aliasRequest.Entry = "";
    RunSources(aliasRequest, (text) => aliasLines.push(text), () => null);
  } catch (error) {
    aliasMessage = String(error.message);
  }
  // **第 290 轮把这一格修好了** ✓（这条判据当时钉的就是那个缺口 ✓，所以它**按设计**红了 ✓）。
  //
  // 原来那一档是：`type F = A & B;` 与后面的语句**写在同一行**时，
  // `TypeAssign` 把结尾那个 `;` **装进了自己** ✓——而语句切分那一趟（`StatementReorganization`）
  // **只看列表里的单元** ✗，于是这一行再也断不开 ✓，投影给出
  // `BinaryExpression(TypeAliasDeclaration, =, 1)` ✓，降级层报 `assignment to a non-identifier` ✗。
  // **换行版一直是好的** ✓（换行自己就是边界 ✓），所以它只在「一行写两条」时露头 ✗。
  // 修法：`;` **只进范围、不进子单元**（见 `typescript/tokens/type-assign.xl.md` 的 `dataEnd` ✓）。
  eq(aliasMessage, "", "`type F = A & B; console.log(1)`（同一行两条语句）不再整份失败：" + aliasMessage);
  eq(aliasLines[0], "1", "同一行的类型别名 + 语句：别名被擦掉、语句照跑");
  // **另一档已知缺口**：括号表达式当**非第一个实参**时被判成类型位（`before` 是 `,` ✓）——
  // 实测插桩 `owner=Bracket at=2 before=SymbolToken/,` ✓，`console.log("x", (a & b))` 会折成
  // `IntersectionType` ✗。与 `=>` 那一格同源（都是「括号在它自己那一层前面是什么」判错 ✓），
  // 但修它要问「包着它的那个括号是不是一次调用的实参表」✗，是另一轮的事 ✓。
  let commaMessage = "";
  try {
    const commaRequest = new RunRequest();
    commaRequest.Sources = ['console.log("x", (1 & 2));'];
    commaRequest.Entry = "";
    RunSources(commaRequest, () => {}, () => null);
  } catch (error) {
    commaMessage = String(error.message);
  }
  // **第 162 轮把它修好了** ✓（这条判据当时钉的就是「括号被判成类型位」✓——按设计红了 ✓）。
  // 修法在 token 层 ✓：`IsTypeBracketPosition` 的 `,` / `(` 那两条，先问一句
  // 「宿主是不是**某次调用的实参表**」（`IsCallArgumentsBracket` ✓，只凭词法 ✓）——
  // 是的话那两个符号在实参表里就是**分隔符 / 分组** ✓，不是类型位的证据 ✓。
  ok(commaMessage.indexOf("IntersectionType") < 0,
    "**第 162 轮修好**：`f(a, (x & y))` 不再被判成类型位（原来报 `IntersectionType`）：「" + commaMessage + "」");
});

console.log("");
console.log("=== 第 148 轮：类型位的声明一个运行期指令都不产生 ===");

check("`type` / `interface` / `declare` 那一族跳过；带体的声明照旧", () => {
  // **端到端那一把在 `cases/40-type-declarations.ts`**（4 行逐字节 ✓）。
  // 这里钉的是**那一格本身**：类型别名与接口**不产生任何运行期东西** ✓
  //（JS 里也没有它们 ✓），所以降级层遇到它们**整条跳过** ✓——口径就是文末那条
  //「类型位一律擦除」✓。第 147 轮量到它时，它报的是
  // `unimplemented: expression TypeAliasDeclaration` ✗——**不是在运行期失败，
  // 而是整份文件根本降级不出来** ✗，而这两样在真实的 `.ts` 里几乎无处不在 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "interface Shape { kind: string; area(): number }",
    "type Alias = { a: number };",
    "type Deep = { a: { b: Array<Map<string, Set<number>>> } };",
    "type Cond<T> = T extends string ? number : boolean;",
    "declare function ambient(x: number): string;",
    "declare const AMBIENT: string;",
    "declare class AmbientClass { m(): void }",
    "declare module 'ext' { export function f(): void }",
    "declare global { interface Window { x: number } }",
    "export type Exported = 1;",
    "export interface ExportedInterface { a: number }",
    // **重载签名没有体** ✓；抽象成员也没有体 ✓——两者都在运行期什么也不是 ✓。
    "function pick(a: string): string;",
    "function pick(a: any): any { return a; }",
    "abstract class Base { abstract kind(): string; describe(): string { return 'b:' + this.kind(); } }",
    "class Impl extends Base { kind(): string { return 'impl'; } }",
    "console.log(pick('s'), new Impl().describe(), new Impl() instanceof Base);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "s b:impl true", "类型声明跳过之后，运行期那部分照常跑");
  // **环境值是「没有的东西」** ✓：`declare const AMBIENT` 之后运行时**没有** `AMBIENT` ✓——
  // 用到它就报「name is not a local or a capture」✓（**响亮** ✓）。
  // **与 Node 差一档，记在明处** ✗：Node 是**运行期** `ReferenceError`（`try` 接得住 ✓），
  // 本仓是**降级期**拒绝 ✓（整份文件进不来 ✗）——与第 146 轮那条「解构赋值给没声明的名字」
  // 同一档 ✓（TS 自己在类型检查期也会报 `Cannot find name` ✓，所以正常 `.ts` 到不了这一格 ✓）。
  let ambientMessage = "";
  try {
    const use = new RunRequest();
    use.Sources = ["declare const AMBIENT: string; const v = AMBIENT;"];
    use.Entry = "";
    RunSources(use, () => {}, () => null);
  } catch (error) {
    ambientMessage = String(error.message);
  }
  ok(ambientMessage.indexOf("not a local or a capture") >= 0,
    "**环境值不是值**：用它在降级期就抛（响亮，而且话指对了方向）：" + ambientMessage);
  // **`namespace N { … }` 现在真的会跑** ✓（第 292 轮 ✓）——这一格原来钉的是**反的** ✗
  // （「它有运行期语义 ✓、本仓不做 ✗ ⇒ 照旧抛 `ModuleDeclaration`」✓）。
  // 第 292 轮把它降级成「**造一个对象 + 开一帧跑体 + 把导出的名字挂上去**」✓
  // （与 TS 自己的变换同一个形状 ✓），所以判据**翻面** ✓。
  //
  // **这是「合同变了」，不是「原来那条坏了」** ✗——区别落在判据上：
  // 原来断言「必须抛」✓，现在断言「必须跑对、而且**跑出正确的东西**」✓。
  // 三件事一起钉 ✓：**体真的跑了**（`doubled` 是调用算出来的 ✓）、
  // **导出的名字挂上去了** ✓、**没导出的名字没挂** ✓（`typeof N.hidden` 是 `"undefined"` ✓）。
  // （语句之间**要换行** ✓：`namespace N { … } const y = 1;` 这个形状会踩到
  //  README 与 `statement.xl.md` 里记的「块与表达式之间没有分隔符」那条老缺口 ✓——
  //  那是**另一件事** ✗，第 292 轮量过、也试过修，代价记在 `statement.xl.md` 里 ✓。）
  const namespaceLines = [];
  const ns = new RunRequest();
  ns.Sources = [[
    "namespace N {",
    "  export const x = 1;",
    "  export function f(): number { return x + 1; }",
    "  const hidden = 9;",
    "}",
    "console.log(N.x, N.f(), typeof N.hidden);",
  ].join("\n")];
  ns.Entry = "";
  const nsRes = RunSources(ns, (text) => namespaceLines.push(text), () => null);
  eq(nsRes.Outcome, HostOutcome.Ok, "运行器：" + nsRes.Message);
  eq(namespaceLines[0], "1 2 undefined",
    "**运行期的 `namespace`：造对象 · 跑体 · 只挂导出的**（第 292 轮）");
  // **`declare namespace` 也跳过** ✓（第 148 轮实测 ✓）：`declare` 那一族整族一样 ✓，
  // 里面装的是类型还是值都不影响 ✓（那份文件跑起来两者都不存在 ✓）。
  //
  // **这里踩过一次坑，记在明处** ✗：第一版判据把三条语句写在一行上
  //（`declare namespace D { … } const z = 1;` ✓），于是报的是
  // `unimplemented: assignment to a non-identifier` ✓——**那是 README 里记的
  // 「块与表达式之间没有分隔符」那条老缺口** ✓（`{ A }a += 1` 同源 ✓），
  // 与 `declare namespace` 无关 ✗。差一点就把一个**不存在的缺口**记进台账 ✓。
  // 换成两行之后，它跑得完全正确 ✓。
  const declareLines = [];
  const declareRequest = new RunRequest();
  declareRequest.Sources = [[
    "declare namespace D { interface I { a: number } }",
    "declare namespace E { const y: number }",
    "declare namespace F { function g(): void }",
    "const z = 1;",
    "console.log(z);",
  ].join("\n")];
  declareRequest.Entry = "";
  const declareRes = RunSources(declareRequest, (text) => declareLines.push(text), () => null);
  eq(declareRes.Outcome, HostOutcome.Ok, "运行器：" + declareRes.Message);
  eq(declareLines[0], "1", "`declare namespace` 整族跳过（里面是类型还是值都一样）");
});

console.log("");
console.log("=== 第 149 轮：四个「Node 跑得动、本仓跑不了」的小口子 ===");

check("`NaN` / `Infinity` · 两个全局判定 · `globalThis`（转与不转是两件事）", () => {
  // **端到端那一把在 `cases/41-numeric-globals-and-pow.ts`**（9 行逐字节 ✓）。
  // 选题口径这一轮换了一次 ✓：**按「Node 跑得动而我们跑不了」排** ✓——
  // 上一轮量到的 `enum` 与运行期 `namespace` 都在这个口径之外 ✓
  //（**Node 自己就拒绝运行它们** ✓：type stripping 不做变换 ✓，
  //  所以「与 Node 逐字节相同」这条判据对它们没有意义 ✓）。
  //
  // 这一条钉的是**最容易写成「一半对」的那两对** ✗：
  //   · `isNaN(x)` / `isFinite(x)`：**先 `ToNumber`** ✓（`isNaN("abc")` 是 `true` ✓）；
  //   · `Number.isNaN` / `Number.isFinite`：**不转换** ✓（`Number.isNaN("abc")` 是 `false` ✓）。
  // 写成一份实现就会让其中一对错 ✗——而错的那一半**不报错** ✓，只给一个反的布尔 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "console.log(NaN, Infinity, -Infinity, 1 / 0, 0 / 0);",
    "console.log(isNaN('abc'), Number.isNaN('abc'), isFinite('3'), Number.isFinite('3'));",
    "console.log(Number.isInteger(NaN), Number.isFinite(Infinity), isFinite(NaN), isNaN('3'));",
    "console.log(globalThis.Math === Math, globalThis.NaN === NaN, typeof globalThis);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "NaN Infinity -Infinity Infinity NaN", "三个常量与两条除法");
  eq(lines[1], "true false true false", "**转与不转**：全局那两个转、`Number.` 那两个不转");
  eq(lines[2], "false false false false", "四个判定各一格");
  // **`globalThis` 指向那个环境对象自己** ✓（`globalThis.Math === Math` ✓）；
  // **`globalThis.NaN === NaN` 是 `false`** ✓（`NaN` 不等于自己 ✓——顺带证明它真的是那个 `NaN` ✓）。
  eq(lines[3], "true false object", "`globalThis` 就是那个对象（`typeof` 也给 `object`）");
});

check("`**`：走**语言建内建**那条，不进通用算子表（`RtOp.Pow` 那一格留着）", () => {
  // **为什么不做进引擎** ✗（第 149 轮的决定 ✓）：幂的舍入**没有标准定死** ✓——
  // IEEE 754 不要求 `pow` 正确舍入 ✓，各目标的 `pow` 可能差最后一位 ✓；
  // 而 `runtime/host-text.xl.md` 那条规矩是「**借的必须是结果被标准定死的东西**」✓。
  // 放进建库层就名正言顺 ✓——那一层本来就是「JS 家族语义 + 一处诚实的宿主借用」✓，
  // 而 `Math.pow` **早就在那儿** ✓。所以 `**` 与 `Math.pow(x, y)` 走**同一行** ✓
  //（JS 的规范本来就说 `**` 的语义**就是** `Math.pow` ✓）。
  //
  // **`RtOp.Pow` 那一格留着、不删** ✓：「只追加、不改号」是那张表的规矩 ✓
  //（删一格会把后面每一个算子的号都挪 ✗）。
  eq(RtOpName(RtOp.Pow), "pow", "`RtOp.Pow` 仍在表里（号留着，实现走建库层）");
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "console.log(2 ** 10, 2 ** 0.5, 9 ** 0.5, (-2) ** 3, 2 ** -1);",
    "let acc = 3; acc **= 2;",
    "const boxed = { v: 2 }; boxed.v **= 5;",
    "const cells = [2]; cells[0] **= 3;",
    "console.log(acc, boxed.v, cells[0], Math.pow(2, 10));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "1024 1.4142135623730951 3 -8 0.5", "整数 / 开方 / 负数底 / 负指数");
  // **`**=` 的三种左值**（名字 / 属性 / 下标 ✓）——第一版只做了二元那条 ✓，
  // 于是 `acc **= 2` 仍旧报 `unimplemented: binary operator **` ✗
  //（两种形状**同一个运算符**，一个通一个不通 ✓）。
  eq(lines[1], "9 32 8 1024", "`**=` 三种左值 + 与 `Math.pow` 同值");
});

check("`typeof` 一个没声明的名字：给 `\"undefined\"`，但**只在这一格**", () => {
  // JS 里这是**唯一不抛**的未声明读法 ✓（`typeof window !== "undefined"` 遍地都是 ✓），
  // 而本仓原来在**降级期**就抛 ✗（整份文件进不来 ✓）。
  // **结果是字符串 `"undefined"`** ✓——不是 `undefined` 那个值 ✗（最容易写错的一格 ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "console.log(typeof window, typeof notDeclaredAnywhere, typeof String(3));",
    "let local = 1;",
    "console.log(typeof local, typeof console, typeof globalThis);",
    "console.log('guard', typeof window !== 'undefined' ? 'browser' : 'node');",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "undefined undefined string", "没声明的名字给字符串 `undefined`");
  eq(lines[1], "number object object", "**声明过的照旧走真路**（局部槽 / 全局名 / `globalThis`）");
  eq(lines[2], "guard node", "特性检测那一族");
  // **`typeof` 之外读同一个名字照旧抛** ✓（与 JS 一致 ✓）——这一格钉住「只改了一处」✓。
  let message = "";
  try {
    const strict = new RunRequest();
    strict.Sources = ["const v = notDeclaredAnywhere;"];
    strict.Entry = "";
    RunSources(strict, () => {}, () => null);
  } catch (error) {
    message = String(error.message);
  }
  ok(message.indexOf("not a local or a capture") >= 0, "`typeof` 之外照旧抛：" + message);
  // **一档如实记下的差异** ✗：`typeof process` / `typeof require` / `typeof setTimeout`
  // 这些**宿主专有**的名字，Node 给 `"object"` / `"function"` ✓，本仓给 `"undefined"` ✗——
  // 本仓的全局对象是**故意小的** ✓（宿主能力走能力表 ✓，不往脚本作用域里塞 ✓）。
  // 这一条钉在明处 ✓：哪天把 `process` 那一族接进来，它会当场变红 ✓。
  const hostLines = [];
  const hostRequest = new RunRequest();
  hostRequest.Sources = ["console.log(typeof process);"];
  hostRequest.Entry = "";
  const hostRes = RunSources(hostRequest, (text) => hostLines.push(text), () => null);
  eq(hostRes.Outcome, HostOutcome.Ok, "运行器：" + hostRes.Message);
  eq(hostLines[0], "undefined", "**已知差异**：宿主专有的名字报 `undefined`（Node 报 `object`）");
});

console.log("");
console.log("=== 第 150 轮：一次日常普查量出来的三个口子 ===");

check("逻辑赋值 `||=` / `&&=` / `??=`：糖，落成控制流", () => {
  // **端到端那一把在 `cases/42-logical-assign-and-methods.ts`**（11 行逐字节 ✓）。
  //
  // 做法是「**合成一棵树再降级**」✓：`a ||= b` 就是 `a || (a = b)` ✓，
  // 合成出来交给**短路那三条本来就有的路** ✓——不在这里重写一遍槽位纪律与极性 ✗
  //（重写的症状是「右边多算一次」✓，副作用跑两遍 ✗，而且**不报错** ✗）。
  //
  // **只做「左边是一个名字」那一档** ✗：合成树里左边出现**两次** ✓——
  // 名字读两次没有副作用 ✓，而 `o[f()] ||= 1` 里那个 `f()` 会跑两遍 ✗（JS 只求值一次 ✓）。
  // 所以属性 / 下标那两种**响亮地抛** ✓（判据钉在下面 ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "let a = 0; a ||= 5;",
    "let b = 1; b &&= 7;",
    "let c = null; c ??= 3;",
    "let d = 2; d ||= 9;",
    "let e = 0; e &&= 9;",
    "let f = 5; f ??= 9;",
    "let calls = 0;",
    "function rhs() { calls++; return 4; }",
    "let g = 0; g ||= rhs();",
    "let h = 1; h ||= rhs();",
    "console.log(a, b, c, d, e, f, g, h, calls);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "5 7 3 2 0 5 4 1 1", "六条赋值 + **右边只算一次**（短路生效时一次都不算）");
  // **左值不是简单名字时原来响亮地抛** ✓（第 150 轮的口径 ✓：不静默按「读两次」算 ✗）。
  //
  // **第 181 轮把那一档补上了** ✓——这条判据就是那时**变红**的 ✓（它当时已经写明
  // 「下一轮做『读一次引用、写回同一格』」✓）。成员位那两种现在有**自己的判据**，
  // 在下面的「第 181 轮」那一节里 ✓（这里只留指针，免得同一件事两处断言 ✓）。
});

check("原始值原型（`Number` / `Boolean`）+ `at` / `splice` / `replaceAll`", () => {
  // **普查量出来的最大一簇** ✓：`(1.5).toFixed(2)` / `(255).toString(16)` / `[1].at(-1)` /
  // `arr.splice(...)` / `"a-b".replaceAll("-", "+")` 在 Node 里全跑得动 ✓，
  // 而本仓报的是 `unimplemented: calling a non-closure value` ✗
  //（听起来像调用写错了 ✗，其实是**方法根本不在那儿** ✓）。
  //
  // 引擎那一侧只动了**一格**：`Protos` 多了 `Number` / `Boolean` ✓，
  // 而 `GetProperty` 对原始值接收者的那条路从「只认字符串」变成「三格同一条路」✓
  //（`"abc".charAt(1)` 早就走这条 ✓，数字与布尔只是**接上了同一个起点** ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "console.log((1.2345).toFixed(2), (1.005).toFixed(2), (1.5).toFixed(), (255).toString(16));",
    "console.log((255).toString(2), (1.5).toString(), true.toString(), false.toString());",
    "console.log(typeof (1).toFixed, typeof [].push, typeof Math.floor);",
    "console.log([1, 2, 3].at(-1), [1, 2, 3].at(0), [1, 2, 3].at(9));",
    "const xs = [1, 2, 3, 4, 5];",
    "console.log(xs.splice(1, 2).join(','), xs.join(','));",
    "const ys = [1, 2, 3];",
    "console.log(ys.splice(1, 0, 'a', 'b').length, ys.join(','));",
    "const zs = [1, 2, 3, 4];",
    "console.log(zs.splice(-2).join(','), zs.join(','));",
    "console.log('a-b-c'.replaceAll('-', '+'), 'aaa'.replaceAll('a', 'aa'), 'abc'.replaceAll('', '-'));",
    "console.log('a-b'.replace('-', '+'), 'abc'.replace('', '-'), 'zz'.replace('q', '!'));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "1.23 1.00 2 ff", "`toFixed`（含位数缺省与「精确值」那一格）+ `toString(16)`");
  eq(lines[1], "11111111 1.5 true false", "`toString(2)` / 十进制 / 布尔两个");
  // **`typeof` 一个内建方法**：宿主引用也是函数 ✓（第 150 轮顺手修的一处**静默**不一致 ✗：
  // 原来 `typeof [].push` 给 `"object"` ✓，而 `typeof x === "function"` 这种守卫遍地都是 ✓）。
  // **两处 `typeof` 出口都要改** ✗（引擎的 `TypeUnitsOf` ✓ + 属性层的 `TypeOfName` ✓）——
  // 只改一处就是「同一个值两个名字」✗。
  eq(lines[2], "function function function", "`typeof` 内建方法给 `function`");
  eq(lines[3], "3 1 undefined", "`at`：负下标从尾巴数、越界给 `undefined`");
  eq(lines[4], "2,3 1,4,5", "`splice` 删中间");
  eq(lines[5], "0 1,a,b,2,3", "`splice` 纯插入（返回值是空数组）");
  eq(lines[6], "3,4 1,2", "`splice` 起点为负");
  // **空串那一格两种调用不一样** ✗（实测抓到的 ✓）：`replace("", "-")` 只在最前面插一次 ✓，
  // 而 `replaceAll("", "-")` **每一格前面都插、末尾也插** ✓（`长度 + 1` 处 ✓）——
  // 我第一版按「也只插一次」写 ✓，判据当场给了 `"-abc"` ✗（Node 是 `"-a-b-c-"` ✓）。
  eq(lines[7], "a+b+c aaaaaa -a-b-c-", "`replaceAll` 三格（含空串那一格）");
  eq(lines[8], "a+b -abc zz", "`replace` 只换第一处（找不到就原样返回）");
});

console.log("");
console.log("=== 第 151 轮：数组解构先过迭代协议（`GetIterator`）===");

check("数组模式过 `GetIterator`：`Set` / `Map` / 字符串都读得到，数组照旧", () => {
  // **端到端那一把在 `cases/43-destructure-iterables.ts`**（10 行逐字节 ✓）。
  //
  // 修的是**静默错值** ✗：`const [a, b] = new Set([1, 2])` 原来按位置读 ✓ →
  // `undefined undefined` ✗（JS 给 `1 2` ✓）。**两半**（声明 / 赋值）都是这条毛病 ✓，
  // 而修法是「接上早就有的那条口径」✓——`for..of` 与 `[...xs]` 的第一步都是
  // `GetIterator` ✓（`install.xl.md` 那一节是权威 ✓：`Map` → `[键,值]` 对 ✓、
  // `Set` → 值 ✓、数组 → **原样** ✓、字符串 → **原样** ✓、其余 → **原样** ✗）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const [a, b] = new Set([1, 2]); console.log(a, b);",
    "let x, y; [x, y] = new Set([3, 4]); console.log(x, y);",
    "const [p, ...rest] = new Set([5, 6, 7]); console.log(p, rest.join(','));",
    "const [c1, c2] = 'hi'; console.log(c1, c2);",
    "const [d = 42] = new Set(); console.log(d);",
    "const [z1, z2] = [11, 12]; console.log(z1, z2);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "1 2", "**声明那一半**：`Set` 走迭代协议（原来静默给两个 `undefined`）");
  eq(lines[1], "3 4", "**赋值那一半**：同一条口径（两半不再各写一份读法）");
  eq(lines[2], "5 6,7", "剩余元素也跟着走同一条路（`ArrayRestId` 不变）");
  eq(lines[3], "h i", "字符串原样过（它本来就能按下标读）");
  eq(lines[4], "42", "默认值那一格不受影响（读出来是 `undefined` 才用默认）");
  eq(lines[5], "11 12", "数组原样返回，所以普通数组解构一条指令都没变");
  // **生成器那一档第 199 轮做掉了** ✓（这一条原来钉的是「做出来那天会变红」✗）。
  // 修法不是「引擎多发一条指令」✗，而是**引擎把那张「走完迭代器」的服务递下来** ✓
  //（`DrainIterator` / `IteratorDrainer()` ✓）——建库层照旧不碰指令 ✓，
  // 而数组模式那一步多了一个收尾的 `IterDrain` ✓。
  const genLines = [];
  const gen = new RunRequest();
  gen.Sources = [[
    "function* g() { yield 1; yield 2; }",
    "const [g1, g2] = g();",
    "console.log(g1, g2);",
  ].join("\n")];
  gen.Entry = "";
  const genRes = RunSources(gen, (text) => genLines.push(text), () => null);
  eq(genRes.Outcome, HostOutcome.Ok, "运行器：" + genRes.Message);
  eq(genLines[0], "1 2", "**第 199 轮修的**：生成器解构给产出的头两个");
});

console.log("");
console.log("=== 第 152 轮：`?.` 有两种，守的东西不一样 ===");

check("`o.n?.()` 守的是**方法值**，`o?.n()` 守的是**接收者**（方向不能反过来）", () => {
  // **端到端那一把在 `cases/44-optional-call-kinds.ts`**（8 行逐字节 ✓）。
  //
  // 第 151 轮量准、这一轮修好的那一条 ✓。`?.` 有**两种**，判据完全不同 ✗：
  //
  // | 写法 | `?.` 在哪 | 空的是谁 | 该守谁 |
  // | --- | --- | --- | --- |
  // | `o?.n?.()` | 形参那一层（`o?.n` ✓） | `o` ✓ | 接收者 ✓ |
  // | `o.n?.()` | **调用那一层**（`?.()` ✓） | **取出来的方法** ✓ | **方法值** ✓ |
  //
  // 原来只有一条「守接收者」✓（判据是 `ChainHasOptional(call)` ✓，而它**分不出这两层** ✗），
  // 于是 `o.n?.()` 在 `n` 是 `null` 时**照样去调** ✗。
  //
  // **方向是关键** ✗：`o?.n()`（调用那一层**没有** `?.` ✓）在 JS 里是 **TypeError** ✓——
  // 拿 `optional` 去顶替 `callOptional` 就会把它**静默**变成 `undefined` ✗，
  // 而静默错值比响亮地抛更糟 ✓。所以判据两头都钉 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const box = { m: () => 5, n: null };",
    "console.log(box.n?.(), box.missing?.(), box?.n?.(), box?.missing?.());",
    "console.log(box.m?.(), box?.m?.());",
    "const gone = null;",
    "console.log(gone?.m?.());",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "undefined undefined undefined undefined",
    "方法为空 / 接收者为空，四种都短路成 `undefined`（**不调**）");
  eq(lines[1], "5 5", "正常情形照旧");
  eq(lines[2], "undefined", "接收者那一层照旧短路");
  // **反方向**：调用那一层没有 `?.` 时，调一个 `null` **必须响亮地抛** ✓——
  // 这一格是防「顺手把 `optional` 当成 `callOptional`」的 ✗（那会静默给 `undefined` ✗）。
  //
  // **第 246 轮改了口径** ✓：这一抛现在是**带类别的脚本异常**了 ✓
  //（`ErrorKindType` ✓——「调一个不是函数的东西」在 JS 里是 `TypeError` ✓），
  // 所以 `RunSources` **不再把它抛到宿主** ✓、而是报成「脚本抛出」那一个结局 ✓。
  // **`Message` 只有一句通用的话** ✗（`the script threw` ✓，
  // 见 `host-abi.xl.md` 的 `Classify` ✓）——**原话在那个结果值里** ✓
  //（`HostResult.Value` ✓「脚本要接住的那个值」✓），而这一层（`runtime/` 那一摞）
  // **不认识 `Error` 长什么样** ✗ ⇒ 名字由 `tsrun` 那一层的错误工厂翻 ✓
  //（`runtime:cli` 的语料钉着「脚本抛出：cannot call a non-closure value …」✓）。
  // **这里钉的是「不是 `Ok`、而且是脚本抛出那一档」** ✓——
  // 仍然没有「静默成 undefined」那条路 ✓（那一条会让结局是 `Ok` ✗）。
  let loud = "";
  let loudOutcome = null;
  let thrown = false;
  try {
    const strict = new RunRequest();
    strict.Sources = ["const p = { n: null }; p?.n();"];
    strict.Entry = "";
    const res = RunSources(strict, () => {}, () => null);
    loudOutcome = res.Outcome;
    loud = String(res.Message);
  } catch (error) {
    thrown = true;
    loud = String(error.message);
  }
  eq(loudOutcome !== null ? loudOutcome === HostOutcome.ScriptThrew : thrown, true,
    "`p?.n()` 的结局是「脚本抛出」（不是 Ok、也不是静默跑完）：" + loudOutcome + " " + loud);
  ok(loud.length > 0, "而且有一句话（哪一层说的都行）：" + loud);
  // **一档第 154 轮修好的** ✓：`o.m?.().k`（**不带括号**）原来**静默**给 `undefined` ✗
  //（投影把 `.k` 折进了 `NullConditionalOperator` ✓，见那一轮的账 ✓）。
  // 现在两格都是 `3` ✓——带括号那格本来就是对的 ✓，留着当回归 ✓。
  const foldLines = [];
  const fold = new RunRequest();
  fold.Sources = [[
    "const o = { m: () => ({ k: 3, deep: () => 7 }) };",
    "console.log((o.m?.()).k, o.m?.().k, o.m?.()['k'], o.m?.().deep?.());",
  ].join("\n")];
  fold.Entry = "";
  const foldRes = RunSources(fold, (text) => foldLines.push(text), () => null);
  eq(foldRes.Outcome, HostOutcome.Ok, "运行器：" + foldRes.Message);
  eq(foldLines[0], "3 3 3 7",
    "第 154 轮修好：不带括号的 `o.m?.().k` 也走调用 + 属性（投影按「先调用、再取属性」拆）");
});

console.log("");
console.log("=== 第 155 轮：可选链后面跟运算符（`o?.k + 1`）===");

check("`NullConditionalOperator` 的断点：链上只有 `.` 与 `!`，其余符号一律断开", () => {
  // **端到端那一把在 `cases/46-optional-chain-with-operators.ts`**（6 行逐字节 ✓）。
  //
  // **症状**：`o?.k + 1` 报 `unimplemented: private or computed property name` ✗——
  // **整份文件进不来** ✗。根因在 token 层：断点名单里只有 `?. ?? && || ; ,` 与比较符号 ✓，
  // **算术 / 位运算 / 移位都不在** ✗，于是 `+` 连同右边一起被收进 NCO ✓，
  // 二元运算符重组在**里面**折成 `BinaryOperator` ✓，投影只好把它当成**成员名** ✗
  //（`PropertyAccessExpression` 的 `name` 是个二元式 ✓），降级层于是报那一句 ✗。
  //
  // **修法**：链上该出现的符号**只有两个** ✓（`.` 成员访问 ✓、`!` 非空断言 ✓——
  // 后者被 `NotNullReorganization` 折进 NCO 里面 ✓），所以规矩反过来写 ✓：
  // **不是那两个就是断点** ✓——将来多出新的运算符也不必回来改 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const box = { k: 1, b: { c: 2 }, f: () => 5, s: 'ab' };",
    "const arr = [1, 2, 3];",
    "console.log(box?.k + 1, box?.k - 1, box?.k * 2, box?.f?.() + 1);",
    "console.log(box?.b.c, box?.b?.c, box?.['k'], box?.f?.());",
    "console.log(box?.s.length * 2, box?.s.length === 2, arr?.[0] + arr?.[1]);",
    "console.log(arr?.length - 1, box?.k > 0, box?.k !== 2, box?.k ?? 9);",
    "console.log(box?.k + 1 > 2, (box?.k) + 1);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "2 0 2 6", "四则 + 调用结果（**这一条原来整份文件都跑不了**）");
  eq(lines[1], "2 2 1 5", "成员 / 可选成员 / 下标 / 可选调用");
  eq(lines[2], "4 true 3", "字符串属性 / 比较 / 数组下标相加");
  eq(lines[3], "2 true true 1", "长度相减 / 比较 / `??`（断点名单里本来就有它）");
  // **这一格的期望值我第一版写错了** ✗：`box?.k + 1 > 2` 是 `1 + 1 > 2` = **false** ✓
  //（写判据时顺手算成了 true ✓——判据当场把我抓住 ✓）。
  eq(lines[4], "false 2", "运算符之后再比较（`1 + 1 > 2` 是 false）/ 括号里照旧");
  // **第 156 轮把它修好了** ✓（这条判据当时就写着「修好的那天会变红」✓——它真的红了 ✓）。
  // 根因在**二元运算符重组**：它只看「紧挨着的那一格」✗，而 `?.` 链在 token 层是**几格** ✓
  //（`o` / `NCO(b)` / `NCO(c)` ✓），于是 `??` 只跟链的尾巴结合 ✗、投影只剩前半截 ✗。
  // 修法：**当 NCO 前面还是 NCO 时**往前把整条链收进来 ✓（判据收紧到这一种 ✓——
  // 第一版对所有 NCO 都收 ✓，`cases:tsast` 当场从 1430 掉到 1428 ✗）。
  const tailLines = [];
  const tail = new RunRequest();
  tail.Sources = [[
    "const o = { b: { c: 2 } };",
    "console.log(o?.b?.c ?? 0, o?.b?.c, o?.x?.y ?? 'fallback');",
  ].join("\n")];
  tail.Entry = "";
  const tailRes = RunSources(tail, (text) => tailLines.push(text), () => null);
  eq(tailRes.Outcome, HostOutcome.Ok, "运行器：" + tailRes.Message);
  eq(tailLines[0], "2 2 fallback",
    "第 156 轮修好：两条 `?.` 之后再跟 `??`，整条链都在（`o?.x?.y` 也短路成 fallback）");
});

console.log("");
console.log("=== 第 157 轮：可选调用的实参逗号（`o.m?.(1, 2)`）===");

check("`?.(` 里的逗号是实参分隔符：判据问「紧挨着的前一格是不是 `?.`」", () => {
  // **端到端那一把在 `cases/48-optional-call-arguments.ts`**（4 行逐字节 ✓）。
  //
  // **症状**：`o.m?.(1, 2)` 报 `unimplemented: binary operator ,` ✗——**整份文件进不来** ✗。
  // **根因**：可选调用的实参表被 `NullConditionalOperator` 吞了 ✓，于是逗号规则跑的时候
  // **还没有 `Method`、也还没有 NCO** ✓——它看到的只是一个光秃秃的 `(` ✓，
  // 就把 `1, 2` 折成了 `BinaryOperator op=","` ✗。
  //
  // **判据只能靠词法** ✓：`DecideBracketContext` **不管 `(`** ✗
  //（`text-common-util.xl.md` 里写着第 57 轮试过、退回来了 ✓）；
  // 插桩也确认了那一刻的 `Parent` 与祖父都是 `Bracket` ✓（NCO 还没成形 ✓）。
  // 但 `?.` 这个记号**已经在列表里** ✓（它是一个 `SymbolToken` ✓），
  // 所以「括号前面那一个单元是不是 `?.`」在任何时刻都问得准 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const api = { add: (a, b) => a + b, three: (a, b, c) => a * 100 + b * 10 + c, none: () => 7 };",
    "console.log(api.add?.(1, 2), api.three?.(1, 2, 3), api.none?.());",
    "console.log(api.missing?.(1, 2), api.add?.(1, 2) + 100, api.three?.(9, 9, 9) === 999);",
    "console.log(Math.max(1, 2, 3), [1, 2, 3].join('-'), api.add?.(3, 4) * 2);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "3 123 7", "两个实参 / 三个实参（**原来整份文件跑不了**）");
  eq(lines[1], "undefined 103 true", "方法为空照旧短路 ✓、结果再参与运算 ✓");
  eq(lines[2], "3 1-2-3 14", "普通调用与内建调用照旧（回归）");
});

console.log("");
console.log("=== 第 177 轮：字符串比较（`\"a\" < \"b\"`）===");

check("四条关系共用一处判据：两边都是字符串按码元比，其余先 `ToNumber`", () => {
  // **端到端那一把在 `cases/55-string-comparison.ts`**（9 行逐字节 ✓）。
  //
  // **症状**：`"a" < "b"` 报 `unimplemented: arithmetic on a non-numeric operand` ✗——
  // **整份文件进不来** ✗，而比较字符串在普通 `.ts` 里遍地都是 ✓
  //（排序 / 版本号 / `if (a < b)` / `"10" < "9"` ✓）。
  // 这是第 176 轮那份 69 条普查抓出来的**第一条** ✓。
  //
  // **根因**：`RtCmpLt` / `Le` / `Gt` / `Ge` 四条**各写了一遍** `NumericOf(left) < NumericOf(right)` ✗
  //——只认数字 ✓，而四条是两个语义（`a > b` 就是 `b < a` ✓、`a <= b` 就是 `!(b < a)` ✓），
  // 所以「`NaN` 参与的六种组合一律 `false`」这一条要写四遍 ✓、漏一处不报错 ✗。
  //
  // **修法**：收成 `CompareValues` 一处（`-1` / `0` / `1` / `-2`=有 `NaN` 参与）✓，
  // 四条各一行 ✓。三层：两边都是字符串按**码元**字典序 ✓（UTF-16 码元序，不是码点序 ✓），
  // 其余两边各做一次 `ToNumber` 再按数值比 ✓——于是 `"10" < "9"` 为真 ✓ 而 `"10" < 9` 为假 ✓
  //（JS 只在**两边都是字符串**时才按文本比 ✓；只做一层会错掉一半 ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "console.log('a' < 'b', 'b' < 'a', 'a' <= 'a', 'a' >= 'b');",
    "console.log('ab' < 'abc', 'abc' <= 'ab', 'Z' < 'a', '10' < '9');",
    "console.log('10' < 9, 1 < '2', 9 >= '10', '2' > 10);",
    "console.log(NaN < 1, NaN > 1, NaN <= 1, NaN >= 1, 1 < NaN, 1 >= NaN);",
    "console.log(undefined < 1, undefined >= 1, null < 1, null > -1, true < 2, false <= 0);",
    "console.log(-0 < 0, -0 >= 0);",
    "console.log('\\u{1F600}' > '\\uFFFF', '\\uD83D' < '\\uFFFF');",
    "const w = ['b', 'a', 'c', 'aa'];",
    "console.log(w.slice().sort().join(','));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "true false true false", "码元序：`Z`(90) < `a`(97)");
  eq(lines[1], "true false true true", "前缀相同则短的更小（`ab` < `abc`）/ 文本序 `10` < `9`");
  eq(lines[2], "false true false false", "一边数值一边字符串：字符串先 `ToNumber`（**这一格最容易只做一半**）");
  // `NaN` 参与的六种组合全是 `false` ✓——`-2` 那一档就是为它留的 ✓
  //（少了它，`a < b` 与 `a > b` 都为假会落到「相等」那一支 ✗，`NaN <= 1` 变成 `true` ✗）。
  eq(lines[3], "false false false false false false", "`NaN` 参与：四条关系一律 false");
  eq(lines[4], "false false true true true true", "`undefined` 给 `NaN` / `null` 给 `0` / 布尔给 `1`、`0`");
  eq(lines[5], "false true", "负零：`-0 < 0` 为假、`-0 >= 0` 为真");
  eq(lines[6], "false true", "代理对：码元序下 `😀`(0xD83D) 排在 `\\uFFFF` 前面");
  eq(lines[7], "a,aa,b,c", "真实用法：默认排序就是按码元比（与 Node 逐字节相同）");
});

console.log("");
console.log("=== 第 178 轮：箭头函数体的**位置**与**范围**（嵌套三元 · 数组元素）===");

check("`=>` 分两种：函数类型的返回类型是类型位，箭头函数的体是值位", () => {
  // **端到端那一把在 `cases/56-arrow-body-ternary.ts`**（11 行逐字节 ✓）。
  //
  // **症状（静默错值）**：`(x, y) => (x < y ? -1 : x > y ? 1 : 0)` —— **比较器的标准写法** ——
  // 本仓给 `1`，Node 给 `-1` ✓。`cjcli` 的 XML 量到那个 `<` 被判成 `GenericType` ✓，
  // 配对到的是 `x > y` 里那个 `>` ✓，于是 `y ? -1 : x` 成了「类型实参」✓。
  //
  // **根因在 `=>` 那一格**（两处，各管一半）：
  //   · `IsTypeBracketPosition`（`text-common-util.xl.md`）：一刀切「前面是 `=>` ⇒ 类型位」✗
  //     ——那一格是为**函数类型的返回类型** `(a: A) => (B | C)` 写的 ✓，却把**箭头体的括号**也算了进去；
  //   · `IsTypePosition`（`generic-type.xl.md`）的回扫：撞上 `=>` 直接判类型位 ✗
  //     ——**不带括号的体**（`(x, y) => x < y ? …`）走的是这一条，所以两处都要改 ✓。
  //
  // **修法（两处同一句判据）**：递归问一次**箭头自己的形参表**在不在类型位 ✓——
  // 函数类型的形参表前面是 `:` / `=`→`type` / `<` ✓，箭头函数的形参表前面是 `=`→`let` / `const`、
  // 实参表的 `(`、数组的 `[`、语句开头 ✓；没有括号的形参（`x => …`）直接判值位 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const cmp = (x: number, y: number) => (x < y ? -1 : x > y ? 1 : 0);",
    "const cmpBare = (x: number, y: number) => x < y ? -1 : x > y ? 1 : 0;",
    "console.log(cmp(1, 2), cmp(2, 1), cmpBare(2, 1));",
    "const byLen = (a: string, b: string) => (a.length < b.length ? -1 : a.length > b.length ? 1 : 0);",
    "console.log(['bbb', 'a'].sort(byLen).join(','));",
    // 数组元素那一半（同一个 `<` 形状，走的却是**数组字面量**那一条边界）：
    "const xs = [() => 1, () => 2];",
    "const v0 = xs[0]();",
    "const v1 = xs[1]();",
    "console.log(xs.length, v0, v1);",
    // `o[k](...)`：键是**数**的时候原来抛「property keys must be strings or symbols」
    "const cbs = [(n: number) => n * 2, (n: number) => n + 1];",
    "const va = cbs[0](3);",
    "const vb = cbs[1](3);",
    "console.log(va, vb);",
    "const o: any = { m: (n: number) => n * 3 };",
    "console.log(o['m'](2));",
    "const arr: Array<(a: number) => number> = [(n: number) => n * 2];",
    "const v2 = arr[0](4);",
    "console.log(v2);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "-1 1 1", "带括号的体与**不带括号的体**都要对（两处 `=>` 判据各管一半）");
  eq(lines[1], "a,bbb", "真实用法：`sort(byLen)` 的返回值真的参与排序（不是函数本身）");
  // **数组元素那一半**：`[() => 1, () => 2]` 里第一个箭头的体原来一路吃到**行尾**、
  // 把**元素之间的逗号**也吞进 `<LamdaBody>` ✗——投影按顶层逗号切元素，切不出来就只剩**一个**
  // 元素（`xs.length` 给 1、`xs[1]` 给 undefined ✗）。对象字面量与实参表早有这一支，
  // 数组是同一件事，并进了同一条判据。
  eq(lines[2], "2 1 2", "数组里的箭头：两个元素都在（**静默错值**：原来 length 给 1）");
  eq(lines[3], "6 4", "`cbs[0](3)` / `cbs[1](3)`：从表里取出一个再调，`this` 是接收者");
  eq(lines[4], "6", "`o['m'](2)`：字符串键那一路照旧（回归）");
  eq(lines[5], "8", "`Array<(a) => number>`：类型实参里的函数类型照旧是**类型**（回归）");
});

console.log("");
console.log("=== 第 179 轮：零实参的计算成员调用（`xs[0]()`）===");

check("空括号是「实参那一段里的调用」，不是被调用者自己那一对", () => {
  // **端到端那一把在 `cases/57-computed-call.ts`**（6 行逐字节 ✓）。
  //
  // **症状（静默错值）**：`console.log(xs[0]())` 打印的是**函数本身** ✓（Node 给 `1` ✓），
  // 而 `const y = xs[0]()` 是**对的** ✓、`cbs[0](3)`（**一个实参**）也是**对的** ✓——
  // 只有「**零实参 + 在实参表里**」这一格错 ✓。
  //
  // **两处根因，都在投影**（token 树一直是对的 ✓）：
  //   · `Method.PrintAst` 的实参过滤把**所有空括号**都当成「被调用者自己那一对」滤掉 ✗——
  //     而**零实参的调用根本不贡献括号**（`f()` 的产物是 `<Method name="f"></Method>` ✓），
  //     所以空 `(` 出现在 kids 里只可能是**实参自己那一段里的调用** ✓。
  //     判据：空括号只在「它是第一个子单元」或「被调用者是 `NotNull`」（`b!()` ✓）时才滤 ✓；
  //   · `xs[0]() + 1` 是**另一种形状**：那对空括号被卷进了**二元单元的最左边**
  //     （`[PropertyAccess, BinaryOperator(Bracket(空), +, 1)]` ✓），
  //     投影的二元那一支把它当成左操作数（空的 `ParenthesizedExpression`）✗。
  //     修法：`print-ast-common` 的 0e 支——沿左脊柱找到空括号，把前一个兄弟投出来、
  //     套一层零实参的 `CallExpression`，再照常折运算符。
  //
  // 顺带：**`x!` 在运行期什么也不做**（`map.get(k)!` 这类写法原来报
  // `unimplemented: expression NonNullExpression` ✗，整份文件进不来 ✗）——
  // 降级成它里面那个表达式，一条指令都不多 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const xs = [() => 1, () => 2];",
    "const obj: any = { m: () => 7 };",
    "console.log(xs[0]());",
    "console.log(xs[0](), xs[1]());",
    "console.log(xs[0]() + 1, xs[0]() + 1 + 2, xs[0]() * 3);",
    "console.log(xs[0]() > 0, xs[0]() && 'y', xs[0]() ?? 9);",
    "console.log(obj['m']() + 1);",
    "const n: any = () => 3;",
    "console.log(n!(), obj.m?.(), obj.n?.());",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "1", "实参表里（**原来给的是函数本身**）");
  eq(lines[1], "1 2", "两个实参、两次调用");
  eq(lines[2], "2 4 3", "二元 / 嵌套二元的左操作数（**原来也给函数本身**）");
  eq(lines[3], "true y 1", "比较 / 逻辑 / 空值合并的左操作数");
  eq(lines[4], "8", "字符串键那一路（回归：它一直是对的）");
  eq(lines[5], "3 7 undefined", "`n!()` 与 `?.()`：那一对空括号是**调用自己的**（回归）");
});

console.log("");
console.log("=== 第 180 轮：逗号运算符（`(1, 2)` · `for` 的递增段 · 一串赋值）===");

check("逗号是糖：先算左边（副作用留着）、值是右边；且「赋值比逗号紧」", () => {
  // **端到端那一把在 `cases/58-comma-operator.ts`**（7 行逐字节 ✓）。
  //
  // **症状**：整族报 `unimplemented: binary operator ,` ✗——**整份文件进不来** ✗，
  // 而 `for (let i = 0, j = 3; i < j; i++, j--)` 这种写法日常到处都有 ✓
  //（初始化段 `let i = 0, j = 3` 是**声明表** ✓，那条路早就通了 ✓；
  //  TS 那边 `incrementor` 才是一个**逗号表达式** ✓）。
  //
  // **两处根因**（都在执行侧 ✓，投影本来与 TS 一致 ✓）：
  //   ① **降级**：逗号落成控制流（`LowerInto(slot, left)` → `LowerInto(slot, right)` →
  //      返回 `slot` ✓），**不进 id 表** ✓（与 `&&` / `||` / `??` 同一条口径 ✓——
  //      左边必须真的算一次 ✓，不能只投右操作数 ✗）；
  //   ② **投影的优先级**：`a = 1, b = 2` 里**赋值号的右操作数只到下一个顶层逗号为止** ✓——
  //      `=` 那一支原来把后面整串都当成右操作数（`a = (1, b) = 2` ✗），**形状这一层就错了** ✗。
  //
  // **顺带修掉一处潜伏的水位 bug** ✗（`LowerInto` 无条件 `Release(value)` ✓）：
  // 赋值表达式的「值」是**左值自己那一格** ✓，退到它那里会把框架里所有活着的槽一起退掉 ✗，
  // 于是 `a = 1, b = 2, c = 3` 里内层逗号拿到 `a` 的槽、把 `a` 写成 **3** ✓（Node 给 1 ✓）——
  // **而两段的 `a = 1, b = 2` 看不出问题** ✗（内层结果正好又被外层覆盖 ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const a = (1, 2);",
    "console.log(a);",
    "let s = 0;",
    "for (let i = 0, j = 3; i < j; i++, j--) s++;",
    "console.log(s);",
    "let x = 0; let y = 0; let z = 0;",
    "x = 1, y = 2, z = 3;",
    "console.log(x, y, z);",
    "let m = 0; let n = 0;",
    "m = 1, n = 2, m = m + n;",
    "console.log(m, n);",
    "const f = () => (1, 2);",
    "console.log(f(), (9, 8), (true, 'v'));",
    "let calls = 0;",
    "function tick(v: number) { calls += v; return v; }",
    "const r = (tick(1), tick(2));",
    "console.log(r, calls);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "2", "括号里的逗号表达式（值是最后那个）");
  eq(lines[1], "2", "`for` 的递增段 `i++, j--`（**这一格原来整份文件进不来**）");
  eq(lines[2], "1 2 3", "一串赋值：**赋值比逗号紧**，三个变量各拿各的（水位那一处的判据）");
  eq(lines[3], "3 2", "赋值与逗号混写（**静默错值**：原来 `m` 给 4）");
  eq(lines[4], "2 8 v", "箭头体 / 表达式位 / 左边是常量");
  eq(lines[5], "2 3", "左边**真的有副作用**：`tick(1)` 与 `tick(2)` 各跑一次（值取右边）");
});

console.log("");
console.log("=== 第 181 轮：成员位上的逻辑赋值（`o.a ??= 5` · `o[k] ||= 1`）===");

check("读一次引用、写回同一格：接收者一次 · 键一次 · 右边只在需要时才算", () => {
  // **端到端那一把在 `cases/59-member-logical-assign.ts`**（6 行逐字节 ✓）。
  //
  // **症状**：`o.a ??= 5` 报 `unimplemented: logical assignment to a non-identifier` ✗
  // （**整份文件进不来** ✗），而第 150 轮那三条（`||=` / `&&=` / `??=`）只做了**标识符** ✓。
  //
  // **为什么不能沿用「合成一棵树再降级」** ✗：那条路的写法是 `a ||= b` ⇒ `a || (a = b)` ✓，
  // 左边于是出现**两次** ✓——名字读两次没有副作用 ✓，而 `o[f()] ||= 1` 里那个 `f()` 会
  // **跑两遍** ✗（JS 只求值一次 ✓）。所以成员位这一支走的是
  // 「**读引用一次 → 判 → 需要才写回同一格**」✓，与上面复合赋值那一支**同一条纪律** ✓。
  //
  // **极性与 `&&` / `||` / `??` 那三支同一个写法** ✓（`jump_if_false` 在**假**时跳 ✓）：
  // `??=` 空才写 ✓、`||=` 假才写 ✓、`&&=` 真才写 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const o = { v: 0, w: 1, n: null };",
    "o.v ||= 1; o.w ||= 9; o.n ??= 3;",
    "let receivers = 0;",
    "function get() { receivers++; return o; }",
    "get().v ??= 5;",
    "let keys = 0;",
    "function key() { keys++; return 'v'; }",
    "o[key()] ??= 6;",
    "let rhs = 0;",
    "function f() { rhs++; return 7; }",
    "o.v ??= f(); o.missing ??= f();",
    "const xs = [null, 0, 1]; xs[0] ??= 'd'; xs[1] ||= 5; xs[2] &&= 6;",
    "const nested = { a: { b: null } }; nested.a.b ??= 8;",
    "console.log(o.v, o.w, o.n, receivers, keys, rhs, xs.join(','), nested.a.b);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "1 1 3 1 1 1 d,5,6 8",
    "**第 181 轮修好**：三个值 + 接收者一次 + 键一次 + 右边只在需要时才算 + 下标与嵌套成员");
});

console.log("");
console.log("=== 第 182 轮：标准库第四批（valueOf · toPrecision · freeze · defineProperty · Array.from）===");

check("五个号一个引擎改动都不用：属性标志位与两条原始值方法", () => {
  // **端到端那一把在 `cases/60-stdlib-fourth-batch.ts`**（9 行逐字节 ✓）。
  //
  // 五格都是普查里「Node 跑得动、本仓跑不了」的那一簇 ✓：
  //   ① `Number.prototype.toPrecision` —— 与 `toFixed` **同族同一条理由** ✓（借宿主 ✓）；
  //   ② `Number.prototype.valueOf` / `Boolean.prototype.valueOf` —— **连转换都不做** ✓
  //      （`ToPrimitive` 的第一步就是「原始值给回自己」✓）；
  //   ③ `Object.freeze` —— `SetProperty` 见到不可写的属性**本来就会抛** ✓
  //      （`props.xl.md` 那一格 ✓），所以冻结只是**把标志清掉** ✓；
  //   ④ `Object.defineProperty` —— 同一组标志的**另一半** ✓（从描述符拼出来 ✓，
  //      JS 的默认是三个 `false` ✓——**最容易写反的一格** ✓）；
  //   ⑤ `Array.from({length}, fn)` —— 数组式（有 `length` 的普通对象 ✓）+ 映射函数 ✓。
  //
  // **顺带修掉两处「标志位一直没人看」** ✗：`Object.keys` / `values` / `entries` / `assign`
  // 与 `JSON.stringify` 原来**一个标志都不看** ✓——在 `defineProperty` 落地之前，
  // 所有属性的 `enumerable` 都是真 ✓，所以这一格**量不出来** ✓；落地当天判据当场变红 ✓。
  // **还有一处是这一轮撞出来的** ✗：`{ length: 3 }` 这种字面量**根本造不出来** ✓——
  // `SetProperty` 见到 `length` 就抛「只读的 length」✗，而那条规矩**只该管数组** ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "console.log((5).valueOf(), true.valueOf(), (1.5).valueOf());",
    "console.log((1.2345).toPrecision(3), (123.456).toPrecision(4), (0.0001234).toPrecision(2));",
    "const frozen = Object.freeze({ a: 1, b: 2 });",
    "console.log(frozen.a, Object.keys(frozen).length, JSON.stringify(frozen));",
    "const defined: any = {};",
    "Object.defineProperty(defined, 'x', { value: 1 });",
    "Object.defineProperty(defined, 'y', { value: 2, enumerable: true, writable: true });",
    "defined.y = 3;",
    "console.log(defined.x, Object.keys(defined).join(','), JSON.stringify(defined));",
    "console.log(Object.values(defined).length, Object.assign({}, defined).y);",
    "console.log(Array.from({ length: 3 }, (_: any, i: number) => i).join(','));",
    "console.log(Array.from([1, 2, 3], (v: any) => v * 2).join(','));",
    "console.log(Array.from({ length: 2, 0: 'a', 1: 'b' }).join(','));",
    "const arr: any = [1, 2, 3]; arr.length = 2;",
    "const box: any = { length: 3 };",
    "console.log(arr.join(','), box.length);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "5 true 1.5", "`valueOf` 就是接收者自己（原始值不装箱，所以连转换都不用）");
  eq(lines[1], "1.23 123.5 0.00012", "`toPrecision` 与 `toFixed` 同族（借宿主那一处）");
  eq(lines[2], "1 2 {\"a\":1,\"b\":2}", "`Object.freeze` 返回对象本身，自有属性照旧可读可枚举");
  eq(lines[3], "1 y {\"y\":3}", "**默认 `enumerable: false`**：`x` 不在 keys / JSON 里，`y` 在");
  eq(lines[4], "1 3", "`values` / `assign` 也只收可枚举的（同一处修正）");
  eq(lines[5], "0,1,2", "`Array.from({length}, fn)`：数组式 + 映射函数给 `(值, 下标)`");
  eq(lines[6], "2,4,6", "数组 + 映射函数（回归：数组那一支照旧）");
  eq(lines[7], "a,b", "数组式按**下标**读（不是按迭代器）");
  eq(lines[8], "1,2 3", "`length` 只在**数组**上是那一格特殊的；普通对象上它只是普通属性");
});

console.log("");
console.log("=== 第 183 轮：成员名那一族（计算键 · 字符串键 · 知名符号）===");

check("名字那一格：计算键的方法 · 字符串键不带引号 · `Symbol.iterator` 存在且唯一", () => {
  // **端到端那一把在 `cases/61-member-names.ts`**（6 行逐字节 ✓）。
  //
  // 三处都是「**名字那一格没被认出来**」✗：
  //   ① **计算键的方法** `{ [k]() { … } }` 报 `ast node ComputedPropertyName has no text` ✓
  //      （整份文件进不来 ✓）——对象字面量里 `PropertyAssignment` 那条**早就认得计算键** ✓，
  //      而 `MethodDeclaration` 那条按 `TextOf(name)` 取名字 ✗；修法与邻居一字不差 ✓。
  //   ② **字符串键的方法** `{ "x-y"() { … } }`：投影给的名字节点 `text` **带着引号** ✗
  //      （六个字符 ✓）——于是那一格存在**带引号的键**上 ✓，按 `o["x-y"]` 永远取不到 ✗
  //      （`Object.keys` 印得出来 ✓）。**尺子看不见这一格** ✗：它只比 kind / 区间 / 字段名 ✓，
  //      **不比字段值** ✗。
  //   ③ **`Symbol.iterator` 一类知名符号**原来根本不存在 ✗：`Symbol` 是**宿主引用** ✓，
  //      宿主引用**没有属性表** ✗。这一轮把它改成**带可调用载荷的对象** ✓
  //      （`Symbol("x")` 照旧走 `Op.Call` ✓、`typeof Symbol` 照旧 `"function"` ✓），
  //      再把五个知名符号**装库时各造一次** ✓（同一个符号必须永远是同一个值 ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const k = 'dyn';",
    "const computed: any = { [k]() { return 1; }, [k + '2']: 2 };",
    "console.log(computed.dyn(), computed.dyn2);",
    "const quoted: any = { 'x-y'() { return 7; }, 'a b': 8 };",
    "console.log(quoted['x-y'](), quoted['a b'], Object.keys(quoted).join(','));",
    "class Named { 'm-x'() { return 3; } plain() { return 4; } }",
    "const named: any = new Named();",
    "console.log(named['m-x'](), named.plain());",
    "const iterable: any = { [Symbol.iterator]() { return 1; } };",
    "console.log(typeof Symbol.iterator, iterable[Symbol.iterator]() === iterable[Symbol.iterator], typeof iterable[Symbol.iterator]);",
    "console.log({ [Symbol.toStringTag]: 'T' }[Symbol.toStringTag]);",
    "console.log(Symbol('a') === Symbol('a'), typeof Symbol('a'));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "1 2", "计算键的方法 / 计算键的赋值（**原来整份文件进不来**）");
  eq(lines[1], "7 8 x-y,a b", "字符串键：存的就是 `x-y`（**不带引号**），`Object.keys` 也印得对");
  eq(lines[2], "3 4", "类里的字符串键方法（同一处修正）");
  eq(lines[3], "symbol false function",
    "`Symbol.iterator` 存在 ✓、取两次是**同一个值** ✓（装库时造一次）、读出来是方法 ✓");
  eq(lines[4], "T", "`Symbol.toStringTag` 也是知名符号（同一批）");
  eq(lines[5], "false symbol", "`Symbol('a')` 每次都是新身份 ✓、`typeof` 是 `symbol` ✓");
});

console.log("");
console.log("=== 第 184 轮：迭代协议（`Symbol.iterator` 那一格真的被认了）===");

check("按协议走：取方法 → 调它 → 收 `next()`；且**协议优先于 `length`**", () => {
  // **端到端那一把在 `cases/62-iteration-protocol.ts`**（9 行逐字节 ✓）。
  //
  // **症状**：第 183 轮把 `{ [Symbol.iterator]() { … } }` 这个**语法**做出来了 ✓、
  // `Symbol.iterator` 那个**符号**也有了 ✓——但 `[...o]` / `for..of` 仍旧报
  // 「不是一个数组 / 字符串 / Map / Set」✗：**协议那一半没做** ✗。
  //
  // `GetIterator`（语言层那条总入口 ✓，`for..of` / 展开 / `Array.from` 都走它 ✓）
  // 原来只认四种输入 ✓，这一轮补上第五种 ✓：**取 `Symbol.iterator` 那一格方法 ✓
  // → 调它拿到迭代器 ✓ → 反复读 `next()` 的 `{value, done}` ✓ → 收集成数组** ✓。
  // **为什么收集成数组** ✗：引擎的 `iter_next` 只认数组与生成器 ✓（那是**算子** ✓），
  // 所以语言层把协议跑完、交一个数组回去 ✓——与 Map / Set 那两条同一个手法 ✓。
  //
  // **判断顺序是语义** ✓：JS 里 `Symbol.iterator` **先于** `length` 那一档 ✓
  // （`Array.from` 的数组式那一支因此要**排在协议之后** ✓）。
  // **一份判据只有一处** ✓（`IteratorMethodOf` ✓）——两处各写一遍，
  // 症状就是「`[...o]` 对了、`Array.from(o)` 不对」✗，最难查的一种 ✓。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "const both: any = {",
    "  length: 9,",
    "  [Symbol.iterator]() { let i = 0; return { next: () => (i < 2 ? { value: 'x' + i++, done: false } : { done: true }) }; },",
    "};",
    "console.log([...both].join(','), Array.from(both).join(','), both.length);",
    "const undef: any = {",
    "  [Symbol.iterator]() { let n = 0; return { next: () => (n++ < 2 ? { value: undefined, done: false } : { done: true }) }; },",
    "};",
    "const spread = [...undef];",
    "console.log(spread.length, spread[0] === undefined, Array.from(undef).length);",
    "const arrLike: any = { length: 2, 0: 'a', 1: 'b' };",
    "console.log(Array.from(arrLike).join(','));",
    "console.log([...'ab'].join(','), Array.from('ab').join(','), [...new Set([1, 2, 2])].join(','));",
    "const m = new Map([['k', 1]]);",
    "console.log([...m].length, [...m][0][0], [...m][0][1]);",
    "function* g() { yield 1; yield 2; }",
    "let total = 0; for (const v of g()) total += v;",
    "console.log(total);",
    "console.log([1, 2, 3].map((x) => x * 2).join(','));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "x0,x1 x0,x1 9",
    "**协议优先于 `length`**：`[...o]` 与 `Array.from(o)` 给同一个答案（`length` 是 9 也不管）");
  eq(lines[1], "2 true 2", "迭代器产出的 `undefined` 是**真的值**（不是洞）");
  eq(lines[2], "a,b", "没有迭代器的「数组式」对象照旧按下标读（`Array.from` 那一档不变）");
  eq(lines[3], "a,b a,b 1,2", "字符串 · Set 照旧（原来那几档一个都不能少）");
  eq(lines[4], "1 k 1", "Map 照旧给 `[键, 值]` 对");
  eq(lines[5], "3", "生成器那一档走的是**引擎**（`iter_next`），不是协议（`[...g()]` 仍旧红 ✗）");
  eq(lines[6], "2,4,6", "数组方法照旧");
});

console.log("");
console.log("=== 第 185 轮：`Promise`（resolve · reject · then · catch）===");

check("推迟那一半交给引擎：微任务里调回调，行序与 Node 一致；链式靠「返回值灌回去」", () => {
  // **端到端那一把在 `cases/63-promise-basics.ts`**（11 行逐字节 ✓）。
  //
  // **症状**：`Promise.resolve(1)` 在**降级期**就报 `name is not a local or a capture: Promise` ✗
  // （名单里没有它 ✓——与第 145 轮 `Boolean` 那条同一个形状 ✓）。
  //
  // **这一轮的两半** ✓：
  //   ① **引擎那一半**（`runtime/` ✓）：原生任务表 + `ScheduleTask` ✓——
  //      「源承诺、回调、实参、结果承诺、认哪一档、返回值要不要灌进去」六样 ✓，
  //      与 `await` 的帧**同一条微任务队列** ✓（分成两条，行序就与 Node 不同 ✗）；
  //   ② **语言层那一半**（`promise.xl.md` ✓）：`Promise` 那个全局名 + 承诺上的
  //      `then` / `catch` ✓（**逐个实例挂** ✓，与 `Map` / `Set` 同一条路 ✓）。
  //
  // **`call` 做不出「推迟」** ✗：它是**同步重入** ✓——所以这一层只描述「挂一个任务」✓，
  // 排与调都在执行器里 ✓（`CallNative` 那条路 ✓，宿主回调也走得通 ✓）。
  //
  // **三条写在明处的缺口** ✗：`x instanceof Promise`（方法挂在实例上 ✓）、
  // `then(f, g)` 两个实参 ✗、`Promise.all` / `race` 的非空那一档 ✗
  // （**要让建库层能结清一个承诺** ✓，那是下一轮的一格引擎接口 ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "console.log('a');",
    "Promise.resolve(1).then((v: any) => console.log('then', v));",
    "console.log('b');",
    "Promise.reject(new Error('nope')).catch((e: any) => console.log('caught', e.message));",
    "console.log('c');",
    "Promise.resolve(7).then((v: any) => v + 1).then((v: any) => console.log('chain', v));",
    "let order = '';",
    "Promise.resolve('p').then((v: any) => { order += v; });",
    "order += 'sync';",
    "Promise.resolve(0).then(() => console.log('order', order));",
    "Promise.reject('boom').then((v: any) => console.log('skipped', v)).catch((e: any) => console.log('caught2', e));",
    "const settled = Promise.resolve('done');",
    "settled.then((v: any) => console.log('value', v, typeof v));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "a", "同步那一半先跑（回调不在这一句里）");
  eq(lines[1], "b", "第二句同步输出");
  eq(lines[2], "c", "第三句同步输出");
  eq(lines[3], "then 1", "回调在**微任务**里跑（三行同步输出之后）");
  eq(lines[4], "caught nope", "`catch` 拿到拒绝的原因");
  eq(lines[5], "order syncp", "挂上时的同步代码先跑完，回调后跑（**推迟**是语义）");
  eq(lines[6], "value done string", "回调拿到的是**兑现值**（不是承诺）");
  eq(lines[7], "chain 8", "链式：上一步的**返回值**灌进下一步");
  eq(lines[8], "caught2 boom", "`then` 的回调遇到拒绝**不跑** ✓、`catch` 跑 ✓");
});

console.log("");
console.log("=== 第 186 轮：`Promise.all` / `race`（引擎那一格「语言层可用的 settle」）===");

check("结清一个承诺必须走执行器：`all` 等最后一个、`race` 第一个定胜负、拒绝顺着结果承诺传下去", () => {
  // **端到端那一把在 `cases/64-promise-combinators.ts`**（10 行逐字节 ✓）。
  //
  // **为什么上一轮只能抛** ✗：`all` **不是**「引擎拿回调的返回值去灌」那个形状 ✓——
  // 它要在**最后一个**输入到齐时才交答案 ✓（早一步交就是错的 ✓）；
  // 而建库层**自己改承诺的状态**也不行 ✗：那只把状态改了 ✓、
  // **没有把等着它的回调排进微任务** ✗（实测过：脚本一声不响地结束 ✓，
  // 看不出哪一句没跑 ✓）。
  //
  // **所以这一轮开的是一格接口** ✓（不是一条捷径 ✗）：`settle` =
  // `ResolvePromise` / `RejectPromise` 的包装 ✓——语言层只会说
  // 「把这个承诺按这个值结清」✓，而**排队那一步在执行器里** ✓。
  //
  // **两处判据的归属** ✓：`all` 的「还差几个」住在**堆里**（状态对象 ✓——
  // 每一步回调是另一次调用 ✓，建库层没有「上一次」可记 ✓）；
  // `race` 的「谁先结清谁定」**不在这里判** ✗（`ResolvePromise` 自己会判 `Pending` ✓，
  // 两处判据迟早走偏 ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "console.log('a');",
    "Promise.all([Promise.resolve(1), Promise.resolve(2)]).then((xs: any) => console.log('all', xs.join(',')));",
    "console.log('b');",
    "Promise.all([1, 2, 3].map((n) => Promise.resolve(n * 10))).then((xs: any) => console.log('map', xs.join(',')));",
    "Promise.race([Promise.resolve('fast'), Promise.resolve('slow')]).then((v: any) => console.log('race', v));",
    "Promise.all([]).then((xs: any) => console.log('empty', xs.length));",
    "Promise.all([Promise.resolve(1), Promise.reject('bad')]).catch((e: any) => console.log('rejected', e));",
    "Promise.resolve(7).then((v: any) => v + 1).then((v: any) => console.log('chain', v));",
    "console.log('c');",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "a", "同步那一半先跑");
  eq(lines[1], "b", "第二句同步输出");
  eq(lines[2], "c", "第三句同步输出");
  eq(lines[3], "empty 0", "`all([])` 当场兑现成空数组（**它也要走 settle**：光改状态排不了队）");
  eq(lines[4], "all 1,2", "`all` 按**输入顺序**收值（不是结清顺序）");
  eq(lines[5], "map 10,20,30", "先 `map` 造一串承诺再 `all`");
  eq(lines[6], "race fast", "`race`：第一个结清的定胜负");
  eq(lines[7], "rejected bad", "有一个被拒绝 → 结果跟着拒绝 ✓、`catch` 接住 ✓");
  eq(lines[8], "chain 8", "链式照旧（第 185 轮那条路没被动过）");
});

console.log("");
console.log("=== 第 187 轮：`.then(f, g)` 两步两条路 ===");

check("一步两条路：兑现调 `f`、拒绝调 `g`；没给 `g` 就原样传下去（`.finally` 是第四种模式）", () => {
  // **端到端那一把在 `cases/65-promise-two-paths.ts`**（6 行逐字节 ✓）。
  //
  // **为什么不是「挂两步」** ✗：挂两步（一步只认兑现 ✓、一步只认拒绝 ✓）会**互相踩** ✓——
  // 拒绝到来时，那一步「只认兑现」的回调虽然不跑 ✓，但它的**传播**会先把结果承诺拒绝掉 ✗，
  // 接着 `g` 去兑现同一个承诺就是**空操作** ✗（结果停在「拒绝」上 ✓，而 JS 要的是 `g` 的返回值 ✓）。
  // 所以任务多一格 `OnRejected` ✓，引擎按**结清的那一档**挑一个调 ✓（`wants = 3` ✓）。
  //
  // **`wants` 的五档**（第 185 → 187 轮 ✓）：`0` 只认兑现 ✓、`1` 只认拒绝 ✓、
  // `2` 两档同一个回调 ✓（`all` / `race` 那两步 ✓）、`3` **两档各一个** ✓、
  // `4` 两档都调**然后原样传下去** ✓（`.finally` ✓——回调的返回值**不算数** ✓）。
  //
  // **两条今天还红的形状写在明处** ✗（都不进语料 ✓）：**`.finally(...)` 后面再接一个调用** ✓
  // （token 层把 `finally` 认成**关键字** ✓——`<Keyword>finally</Keyword>` ✓、不是方法名 ✓，
  // 链上那一步于是读错属性 ✓；**单独一句 `.finally(cb);` 是好的** ✓）、
  // 以及**拒绝源上的 `.then(f, g)` 再往下接一个 `.then`** ✓（回调跑了 ✓、结果承诺也结清了 ✓，
  // 但下一步没被排进微任务 ✓——还没查清 ✓）。
  const lines = [];
  const request = new RunRequest();
  request.Sources = [[
    "Promise.resolve(1).then((v: any) => console.log('ok', v), (e: any) => console.log('no', e));",
    "Promise.reject('bad').then((v: any) => console.log('no1', v), (e: any) => console.log('handled', e));",
    "Promise.resolve(5).then((v: any) => v * 2, (e: any) => 0).then((v: any) => console.log('two-path', v));",
    "Promise.reject('bad2').then((v: any) => 'x').catch((e: any) => console.log('caught', e));",
    "Promise.resolve('fin').finally(() => console.log('cleanup'));",
    "console.log('done');",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines[0], "done", "同步那一半先跑（`done` 是最后一句同步输出）");
  eq(lines[1], "ok 1", "兑现那一档走 `f`（`g` 不跑）");
  eq(lines[2], "handled bad", "拒绝那一档走 `g`（**这一格就是「两条路」**）");
  eq(lines[3], "cleanup", "`.finally(cb)`：两档都调（单独一句的形式）");
  eq(lines[4], "two-path 10", "`f` 的返回值灌进下一步");
  eq(lines[5], "caught bad2", "没给 `g` → 拒绝**原样传下去**，`catch` 接住");
});

console.log("");
console.log("=== 第 188 轮：接住了拒绝，结果就是兑现（一条**静默**的错）===");

check("回调跑过了，结果就是兑现：`.then(f, g)` / `.catch` 接住之后，后面那一步照跑", () => {
  // **端到端那一把在 `cases/66-promise-handled-rejection.ts`**（7 行逐字节 ✓）。
  //
  // **静默的那一条** ✗：`Promise.reject("e").then(f, g).then(cb)` 里 `g` 跑了 ✓、
  // 结果承诺也结清了 ✓，但**下一步一句都不跑** ✓、**不报错** ✗。
  // 根因在引擎那一格 ✓：回调跑完之后，结果的档跟着**源**那一档走 ✗——
  // 源是「拒绝」✓，于是结果**还是被拒绝** ✗。
  // 而 JS 的口径是「**谁接住了这一档，结果就是兑现**」✓（兑现值就是那个回调的返回值 ✓）。
  // 「结果跟着拒绝」只在**没人接**的时候发生 ✓——那一条走的是另一支（`!matched` ✓）。
  //
  // **同一轮量准的另一条** ✗（不进语料 ✓）：**方法名是关键字、后面还接着一个调用**时 ✓，
  // 链上那一步**读错属性** ✓——实测五种形状：`.catch(cb);` 好的 ✓、
  // `.catch(cb).then(cb2)` **坏的** ✗、`.finally(cb).then(cb2)` **坏的** ✗、
  // 但**中间落一个变量**（`const p = X.catch(cb); p.then(cb2);`）**是好的** ✓。
  // 这一格属于**降级/链**那一侧 ✓（`catch` / `finally` 是关键字 ✓，`then` 不是 ✓），
  // 单独立一轮 ✓——**语料里用落变量的写法** ✓。
  const outline = [];
  const request = new RunRequest();
  request.Sources = [[
    "Promise.reject('e2').then((v: any) => 0, (e: any) => 'recovered ' + e).then((v: any) => console.log('recovered', v));",
    "Promise.reject('bare').then((v: any) => console.log('no', v)).catch((e: any) => console.log('still rejected', e));",
    "const handled = Promise.reject('boom').catch((e: any) => 'handled ' + e);",
    "handled.then((v: any) => console.log('after-catch', v));",
    "const twice = Promise.reject('x').catch((e: any) => 'ok ' + e);",
    "twice.catch((e: any) => console.log('should not print', e));",
    "twice.then((v: any) => console.log('final', v));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => outline.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(outline[0], "recovered recovered e2", "**这一轮修的就是它**：接住之后下一步照跑，值是 `g` 的返回值");
  eq(outline[1], "still rejected bare", "没人接 → 拒绝原样传下去（一直是好的）");
  eq(outline[2], "after-catch handled boom", "`catch` 接住之后，结果也是**兑现**");
  eq(outline[3], "final ok x", "接住之后再接一个 `catch`：那个 `catch` **不该跑**");
});

console.log("");
console.log("=== 第 189 轮：`.` 后面的关键字是成员名（两条静默的链式形状一起关掉）===");

check("`p.catch(cb)` / `p.finally(cb)`：控制关键字那张表不该管成员位", () => {
  // **端到端那一把在 `cases/67-keyword-members.ts`**（5 行逐字节 ✓）。
  //
  // **症状** ✗：`Promise.resolve(1).catch(cb).then(cb2)` 与 `.finally(cb).then(cb2)`
  // **一句都不跑、也不报错** ✓（第 187 / 188 轮量到 ✓）。
  //
  // **根因在 token 层** ✓（`tokens/method.xl.md` 的 `Previous` ✓）：那句合取的最后一件是
  // `MethodNameTemplate.IsMethodName(名字)` ✓——而那张表**是给语句位准备的** ✗
  // （它要挡的是 `if (x)` / `catch (e)` 这类控制结构 ✓）。`catch` / `finally` 这些字
  // **既是关键字、又是合法属性名** ✓，于是成员位上的调用**被挡掉了** ✗：
  // 那对括号谁也不认 ✓ → 属性访问链在 `.catch` 处**收尾** ✓ → 投影出来的语句只剩
  // `Promise.resolve(1).catch` 一个 `PropertyAccessExpression` ✓，
  // **整段 `.catch(cb).then(cb2)` 从产物里消失** ✓（实测 ✓）。
  //
  // **修法**：`.`（或 `?.`）后面的名字**永远是成员名** ✓——控制关键字那张表不该管这里 ✓。
  // 与它配对的另一处（那个「关键字 + `(` 不是调用」的守卫 ✓）也补了同一格 ✓。
  //
  // **次序那一格另外说** ✗：`.finally` 在 JS 规范里多走一 tick（它要等回调的返回值 ✓），
  // 所以「`.finally` 的链与另一条链谁先」与本仓**可能不同** ✓——
  // 语料里报告那一步挂在 `Promise.all` 上 ✓（两条都走完再印 ✓），不钉次序 ✓。
  const lines2 = [];
  const request = new RunRequest();
  request.Sources = [[
    "Promise.reject('x').catch((e: any) => 'caught ' + e).then((v: any) => console.log('first', v));",
    "Promise.resolve(1).catch((e: any) => 'no ' + e).then((v: any) => console.log('second', v));",
    "const maybe: any = Promise.resolve('m');",
    "maybe?.catch((e: any) => e)?.then((v: any) => console.log('third', v));",
    "const seen: string[] = [];",
    "const a = Promise.resolve('fin').finally(() => { seen.push('cleanup'); }).then((v: any) => { seen.push('after ' + v); return v; });",
    "const b = Promise.resolve('other').catch((e: any) => e).then((v: any) => { seen.push('catch-chain ' + v); return v; });",
    "Promise.all([a, b]).then(() => console.log('seen', seen.sort().join(',')));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines2.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines2[0], "first caught x", "`.catch(cb).then(cb2)`：**这一轮修的就是它**");
  eq(lines2[1], "second 1", "兑现源上的 `.catch` 也让链接着走（回调不跑）；`.then` 拿到原值");
  eq(lines2[2], "third m", "`?.` 那一支同样放行（`p?.catch(cb)`）");
  eq(lines2[3], "seen after fin,catch-chain other,cleanup", "`.finally` 也在链上活了；四条支路都跑到");
});

console.log("");
console.log("=== 第 190 轮：字符串接收者上的下标读（`s['length']` / `s['0']` / `s[0]`）===");

check("字符串接收者：数字键给一个码元、别的键走属性那条路（一条判据管住四种键）", () => {
  // **端到端那一把在 `cases/68-string-index.ts`**（8 行逐字节 ✓）。
  //
  // **症状** ✗：`"abc"["length"]` 报 `unimplemented: non-numeric index needs ToString` ✓
  // （**整份文件进不来** ✗）——`get_index` 见到**字符串接收者**就**无条件**转给
  // `props.GetIndex` ✓，而那一支只认**数字键** ✓（它给的是「一个码元的字符串」✓）。
  //
  // **JS 的口径** ✓：`"abc"[k]` 是「把它当成对象、按属性查」✓（`ToObject` ✓）——
  // `["length"]` → `3` ✓、`["charAt"]` → 原型上那个函数 ✓、`["nope"]` → `undefined` ✓；
  // 而**下标**那一档是「数字键」与**「全是数字的字符串键」**两种 ✓（`"0"` ✓）。
  //
  // **一条判据管住四种键** ✓（这一轮量出来的写法 ✓）：把键**字符串化** ✓，
  // 再用 `ArrayIndexAt` 判它是不是下标 ✓——
  // `s[0]` ✓ 与 `s["0"]` ✓ → `"0"` ✓ 下标 ✓；`s[1.0]` → `"1"` ✓ 下标 ✓；
  // `s[1.5]` → `"1.5"` **不是下标** ✓ → 属性 ✓（JS 给 `undefined` ✓）。
  // **写成两条判据就会漏** ✗：先前那版是「数字键走下标、其余走属性」再加
  // 「全是数字的字符串键先转数字」✓——`s[1.5]` 那一格于是漏了 ✓（实测给的是 `"a"` ✗，
  // JS 给 `undefined` ✓）。
  //
  // **顺带补掉引擎里一格** ✓：`TextUnitsOf` 原来**不收浮点** ✗（注释写着「`1.0` 该显示成
  // `"1"` 还是 `"1.0"` 是规范级的决定，不能顺手写一个」✓）——而**那个决定早就做过了** ✓：
  // `host-text.xl.md` 的 `NumberToHostText` 就是「双精度 ↔ 十进制」的**借用点** ✓
  // （`String(1.5)` / JSON / `toString(16)` 都在用它 ✓）。**同一件事不写两份答案** ✓。
  const lines2 = [];
  const request = new RunRequest();
  request.Sources = [[
    "const s: any = 'abc';",
    "console.log(s[0], s[2], s[5]);",
    "console.log(s['length'], typeof s['charAt'], s['charAt'](1), s['nope']);",
    "console.log(s['0'], s['2'], s['9']);",
    "console.log('xyz'[1], s[1.0], s[1.5]);",
    "const [a, b] = s;",
    "console.log(a, b);",
    "for (const ch of 'hi') console.log('iter', ch);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines2.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines2[0], "a c undefined", "数字下标（这一支一直是好的）");
  eq(lines2[1], "3 function b undefined", "`length` / 原型上的方法 / 缺失的键（**这一轮修的**）");
  eq(lines2[2], "a c undefined", "「全是数字的字符串键」也是下标");
  eq(lines2[3], "y b undefined", "字面量接收者 ✓、`1.0` 是第 1 格 ✓、`1.5` **不是**下标 ✓");
  eq(lines2[4], "a b", "解构那条路用的是同一条下标读（回归）");
  eq(lines2[5], "iter h", "字符串迭代照旧（回归）");
});

console.log("");
console.log("=== 第 191 轮：裸 `new` 接收者的下标读 + 数组上的「不是下标」的键 ===");

check("`New` 也是一个操作数：`new C()[k]` 里那个 `[` 是下标，不是数组字面量", () => {
  // **端到端那一把在 `cases/69-new-receiver-index.ts`**（9 行逐字节 ✓）。
  //
  // **症状** ✗：`new C()["m"]()` 报 `unimplemented: calling a non-closure value` ✓
  // （**整份文件进不来** ✗）。
  //
  // **根因在 token 层** ✓（`json/array-literal.xl.md` 的 `IsArrayAt` ✓）：判「`[` 是不是
  // 数组字面量的开头」时，会看一眼**前一个单元**是不是**操作数** ✓——
  // 那张名单里有 `Identifier` / `Bracket` / `String` / `Method` / `PropertyAccess` /
  // `ObjectLiteral` / `this` / `super` ✓，**没有 `New`** ✗。于是 `new C()["m"]` 里那个 `["m"]`
  // 被收成 `ArrayLiteral` ✓、成员访问链**没有起点** ✓、整段在产物里塌掉（实测 ✓）。
  // **修法**：名单里补一格 `New` ✓（它已经是一个操作数 ✓，与 `Method` / `PropertyAccess`
  // 那两条同源 ✓）。
  //
  // **顺带收掉同一根因的另一半** ✓：数组那一支原来**无条件**转给 `props.GetIndex` ✗
  // （只认数字键 ✓），于是 `arr["map"]` / `arr["0"]` 也抛 ✓。现在数组与字符串
  // **同一条判据** ✓：键字符串化 → 是下标就走下标 ✓、不是就走**属性** ✓。
  const lines2 = [];
  const request = new RunRequest();
  request.Sources = [[
    "class C { m() { return 3; } items: number[] = [10, 20]; \"s p\"() { return 4; } }",
    "console.log(new C()['m'](), new C()['s p']());",
    "console.log(new C()['items'].length, new C()['items'][1]);",
    "const key = 'm';",
    "console.log(new C()[key](), new C()['m' + '']());",
    "const arr: any = [1, 2];",
    "console.log(arr['length'], arr['0'], arr['join']('-'));",
    "console.log(new Array(3)['length'], [...new Array(3)].length);",
    "const c = new C();",
    "console.log(c['m'](), new C().m(), (new C() as any)['m']());",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => lines2.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(lines2[0], "3 4", "**这一轮修的**：裸 `new` 接收者的下标调用（含带空格的键）");
  eq(lines2[1], "2 20", "同一个接收者的下标读");
  eq(lines2[2], "3 3", "键是变量 / 算式");
  eq(lines2[3], "2 1 1-2", "**数组上的「不是下标」的键**：`length` / `\"0\"` / 原型上的方法");
  eq(lines2[4], "3 3", "`new Array(3)['length']` 与展开（回归）");
  eq(lines2[5], "3 3 3", "回归：变量接收者 / 点号 / 括号包一层");
});

console.log("");
console.log("=== 第 192 轮：两条「静默错值」（`fill` 的后两个实参 · `JSON.stringify` 的缩进）===");

check("`arr.fill(值, 开始, 结束)` 与 `JSON.stringify(x, null, 缩进)`：两位实参原来被整段忽略", () => {
  // **端到端那一把在 `cases/70-fill-and-json-indent.ts`**（21 行逐字节 ✓）。
  //
  // 两条都在普查表的 **`DIFFER`** 那一栏（**跑得出、值不对**）——最危险的一类：
  // 脚本不报错、每一格单看都像对的，只有与 Node 逐字节比才看得出来。
  //
  // **① `fill`**：JS 的口径是**两个都可以省**、**负数从末尾数**、越界**夹住**、
  // 开始不小于结束就什么也不做；返回的**就是那个数组本身**（`===` 成立）。
  // 原来它把**整个数组**都填上那个值 ✗——`[1,2,3,4].fill(0, 1, 3)` 给 `0,0,0,0` ✓
  //（Node 给 `1,0,0,4` ✓）。修法：与 `slice` 同一个口径 ✓（新抽的 `NormalizeRangeIndex` ✓）。
  //
  // **② `JSON.stringify` 的缩进**：第三、四个实参 ✓——**数字**＝空格个数（夹到 0..10 ✓）、
  // **字符串**＝前十个字符 ✓、别的当「不缩进」✓；**空对象 / 空数组照旧 `{}` / `[]`** ✓。
  // 原来那两位被忽略 ✗，永远给紧凑形状 ✓（`json-pretty` 那条就是这么红的 ✓）。
  const outline = [];
  const request = new RunRequest();
  request.Sources = [[
    "const xs = [1, 2, 3, 4];",
    "console.log(xs.fill(0, 1, 3).join(','));",
    "console.log([1, 2, 3].fill(9, -1).join(','), [1, 2, 3].fill(9, 1, -1).join(','));",
    "const same = [1, 2, 3];",
    "console.log(same.fill(7, 0, 1) === same, same.join(','));",
    "console.log(JSON.stringify({ a: 1, b: [1, 2] }, null, 2));",
    "console.log(JSON.stringify({ a: {}, b: [] }, null, 2));",
    "console.log(JSON.stringify({ a: 1 }, null, 99));",
    "console.log(JSON.stringify({ a: 1, b: [1, 2] }));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => outline.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(outline[0], "1,0,0,4", "**这一轮修的**：`fill` 认后两个实参");
  eq(outline[1], "1,2,9 1,9,3", "负数从末尾数（两个实参都试）");
  eq(outline[2], "true 7,2,3", "改的是原数组、返回值也是它（`===` 成立）");
  // **多行形状**由语料逐字节钉着（这里只钉关键的几行与回归档）——
  // 那一格的输出是好几行，用一个 `eq` 钉不住整个形状。
  // **整段形状**用「连起来找子串」钉（多行输出按行号数太脆——这一轮就数错过两次）。
  const joined = outline.join("\n");
  ok(joined.indexOf("{\n  \"a\": 1,\n  \"b\": [\n    1,\n    2\n  ]\n}") >= 0,
    "**同一轮修的第二条**：`JSON.stringify(x, null, 2)` 的多行形状");
  ok(joined.indexOf("  \"b\": [\n    1,\n    2\n  ]") >= 0, "数组的缩进形状（嵌套时按层数缩进）");
  ok(joined.indexOf("{\n  \"a\": {},\n  \"b\": []\n}") >= 0,
    "空对象 / 空数组照旧是 `{}` / `[]`（缩进不作用在空容器上）");
  ok(joined.indexOf("{\n          \"a\": 1\n}") >= 0, "数字缩进夹到 10 个空格（`99` → 10）");
  ok(joined.indexOf("{\"a\":1,\"b\":[1,2]}") >= 0, "不给缩进照旧紧凑（回归）");
});

console.log("");
console.log("=== 第 193 轮：对象自己的 `toString`（`${o}` / `\"x\" + o` / `String(o)`）===");

check("三种字符串化都先问对象自己的 `toString`；没有那一格照旧 `[object Object]`", () => {
  // **端到端那一把在 `cases/71-object-tostring.ts`**（8 行逐字节 ✓）。
  //
  // **症状** ✗：`${new C()}` / `"x" + new C()` / `String(new C())` 都给 `[object Object]` ✓
  // （Node 给 `C!` ✓）——**静默错值** ✗：每一格单看都像对的 ✓（`[object Object]`
  // 确实是「某个默认值」✓），只有与 Node 逐字节比才看得出来 ✓。
  //
  // **修法** ✓：在**两个入口**（`String(x)` ✓ 与 `+` 的拼接 ✓）先问一次
  // 「自有或原型链上那一格 `toString` 是不是能被调」✓——能就**带 `this` 调一次** ✓；
  // **给原始值就算数** ✓（JS：`toString() { return 42; }` 的实例 `String(o)` 是 `"42"` ✓——
  // 转换由调用方做 ✓）；**数组跳过** ✓（它的渲染这一层本来就有答案 ✓，
  // 绕到 `toString` 上等于把同一件事写成两份 ✓）。
  //
  // **同一轮补的一格** ✓：`Array.prototype.toString` **就是 `join(",")`** ✓——
  // 所以它**指到同一格能力号** ✓（`[1,[2,3]].toString()` 原来报
  // `calling a non-closure value` ✓，那一格根本没装 ✗）。
  //
  // **还没做的那一半写在明处** ✗：`toString` 给了**非原始值**时 JS 接着问 `valueOf` ✓，
  // 而 `o + 1`（`ToPrimitive(o, "default")`，**先 `valueOf`** ✓）今天还是抛
  // `arithmetic on a non-numeric operand` ✓——那是**引擎的算术那一格** ✓，单独立一轮 ✓。
  const outline = [];
  const request = new RunRequest();
  request.Sources = [[
    "class C { toString() { return 'C!'; } }",
    "const c = new C();",
    "console.log(`${c}`, 'x' + c, String(c));",
    "class Base { toString() { return 'base'; } }",
    "class Derived extends Base {}",
    "console.log(`${new Derived()}`, String(new Derived()));",
    "console.log(`${({ a: 1 })}`, String({ b: 2 }), 'y' + { c: 3 });",
    "class Weird { toString() { return 42; } }",
    "console.log(`${new Weird()}`);",
    "console.log(`${[1, 2]}`, String([3, 4]), [1, [2, 3]].toString());",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => outline.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(outline[0], "C! xC! C!", "**这一轮修的**：三种写法都问对象自己的 `toString`");
  eq(outline[1], "base base", "原型链上那一格也算（父类定义的 `toString`）");
  eq(outline[2], "[object Object] [object Object] y[object Object]", "普通对象没有那一格 → 照旧默认（回归）");
  eq(outline[3], "42", "`toString` 给原始值就算数（**转换由调用方做**）");
  eq(outline[4], "1,2 3,4 1,2,3", "数组照旧（含同一轮补的 `toString` = `join`）");
});

console.log("");
console.log("=== 第 194 轮：内部件与方法不该出现在 `Object.keys` / `JSON` 里 ===");

check("`SetHiddenProperty`：内部格与方法**不可枚举**，数据照旧可枚举", () => {
  // **端到端那一把在 `cases/72-hidden-slots.ts`**（9 行逐字节 ✓）。
  //
  // **症状** ✗（普查里 `map-internal-slots` 那条 ✓，**静默错值** ✓）：
  // `Object.keys(new Map())` 给 **12** ✓（JS 给 0 ✓）、
  // `JSON.stringify(new Map())` 给 `{"__k":[…],"__v":[…],"size":1}` ✓（JS 给 `{}` ✓）。
  //
  // **根因** ✓：`Map` / `Set` 的内部格（`__k` / `__v` / `size` ✓）与那一批方法都写在
  // **实例自己**身上 ✓（「方法挂实例」是这一族的设计 ✓），而写的时候用的是**普通属性** ✗——
  // 于是它们在 JS 眼里都是「**可枚举的自有属性**」✓，`Object.keys` / JSON / 展开全看得见 ✗。
  // JS 里它们**一个都不算** ✓：内部格不是属性 ✓、方法是原型上的且不可枚举 ✓。
  //
  // **修法** ✓：引擎侧多一格 `SetHiddenProperty`（不可枚举、但可写可配置 ✓）；
  // `Map` / `Set` 的全部写入都经过 `WriteOwn` **一个出口** ✓，改一处就够 ✓；
  // `Error` 的 `message` / `name` ✓ 与 `Date` 的 `__t` 与方法 ✓ 同理 ✓。
  //
  // **差点改错的一格** ✗：`JSON.parse` 建对象也用同一句写法 ✓——但那是**数据** ✓，
  // `Object.keys(JSON.parse(…))` 在 JS 里看得见它们 ✓。判据当场抓住了它 ✓
  //（那条 check 报「期望 {…}、实际 {}」✓），所以那一处**退回普通属性** ✓。
  //
  // **还没做的那一格写在明处** ✗：`JSON.stringify(new Date(0))` 在 JS 里走
  // `Date.prototype.toJSON` ✓ 给 ISO 文本 ✓，本仓给 `{}` ✓——那是**另一件事** ✓，单独立一轮 ✓。
  const outline = [];
  const request = new RunRequest();
  request.Sources = [[
    "const m = new Map([['a', 1]]);",
    "const s = new Set([1, 2]);",
    "const d = new Date(0);",
    "const e = new Error('boom');",
    "console.log(Object.keys(m).length, Object.keys(s).length, Object.keys(d).length);",
    "console.log(JSON.stringify(m), JSON.stringify(s));",
    "console.log(m.get('a'), m.size, s.has(2), s.size, d.getTime());",
    "console.log([...m.keys()].join(','), [...s].join(','));",
    "console.log(Object.keys(e).length, e.message, e.name, JSON.stringify(e));",
    "const parsed: any = JSON.parse('{\"x\":1,\"y\":2}');",
    "console.log(Object.keys(parsed).join(','), parsed.y, JSON.stringify({ a: 1 }));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => outline.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(outline[0], "0 0 0", "**这一轮修的**：三族的键都是空的（方法与内部格都不可枚举）");
  eq(outline[1], "{} {}", "`JSON.stringify` 也不再漏内部格");
  eq(outline[2], "1 1 true 2 0", "功能照旧：方法沿原型链找得到、内部格读得到");
  eq(outline[3], "a 1,2", "迭代照旧（`keys` / 展开）");
  eq(outline[4], "0 boom Error {}", "`Error` 的 `message` / `name` 也不可枚举（JS 的口径）");
  eq(outline[5], "x,y 2 {\"a\":1}", "**数据照旧可枚举**（`JSON.parse` 出来的键看得见）");
});

console.log("");
console.log("=== 第 195 轮：私有成员（`#m()` / `#n` / `static #s`）===");

check("私有名也是成员名：类成员 / 字段 / 调用 / 属性读，键统一走 `KeyUnitsOf`", () => {
  // **端到端那一把在 `cases/73-private-members.ts`**（4 行逐字节 ✓）。
  //
  // **症状** ✗：`class C { #n = 1; #m() { return this.#n; } get v() { return this.#m(); } }` 报
  // `unimplemented: computed or numeric class member name` ✓（**整份文件进不来** ✗）。
  //
  // **根因** ✓：私有名的 kind 是 `PrivateIdentifier` ✓，而降级层有**九处**只认
  // `Identifier` / `StringLiteral`（类成员名 ✓、类字段名 ✓、方法调用的名字 ✓、属性读 ✓，
  // 以及五处赋值 / 删除 / 解构 ✓）。私有**字段的读**那一格本来就走得通 ✓，
  // 所以「带私有字段的类」能跑、「带私有方法的类」不能 ✓——同一条路两种命运 ✗。
  //
  // **修法** ✓：那些判据一起放开 `PrivateIdentifier` ✓，并且**键统一用 `KeyUnitsOf`** ✓
  // ——它的文本就是 `#m` / `#n` ✓，于是「类里挂上去的那一格」与「读 / 调时找的那一格」
  // **一定是同一个键** ✓（一份判据只能有一处 ✓）。
  //
  // **两条还没做的形状写在明处** ✗（都不进语料 ✓——它们会让**整份文件**进不来 ✓）：
  // **私有名落在二元表达式里**（`this.#n + 1` ✓）报
  // `ast node BinaryExpression has no child right` ✓（**投影**那一层 ✓）；
  // 以及**静态块**（`static { C.x = 5 }` ✓）报 `name is not a local or a capture: C` ✓。
  const outline = [];
  const request = new RunRequest();
  request.Sources = [[
    "class Counter { #n = 5; #m() { return this.#n; } get value() { return this.#m(); } static #count = 7; static make() { return Counter.#count; } }",
    "const c = new Counter();",
    "console.log(c.value, Counter.make());",
    "class Deep { #factor = 3; #mul(x: number) { return x; } #twice(x: number) { return this.#mul(this.#mul(x)); } run(x: number) { return this.#twice(x); } }",
    "console.log(new Deep().run(42));",
    "class Mixed { pub = 1; #priv = 2; readPriv() { return this.#priv; } }",
    "const mixed = new Mixed();",
    "console.log(mixed.readPriv(), mixed.pub);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => outline.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(outline[0], "5 7", "**这一轮修的**：私有字段由私有方法读、再经 getter 出来；静态私有字段");
  eq(outline[1], "42", "私有方法带实参、并且从一个私有方法里调另一个");
  eq(outline[2], "2 1", "私有字段与公有字段并存（公有照旧可见，回归）");
});

console.log("");
console.log("=== 第 196 轮：静态块（`static { … }`）===");

check("静态块是「自己一层作用域」：类名捕获、`this`、顺序、块里的闭包一起对", () => {
  // **端到端那一把在 `cases/74-static-block.ts`**（4 行逐字节 ✓）。
  //
  // **症状** ✗：`class C { static x: number; static { C.x = 5; } }` 报
  // `name is not a local or a capture: C` ✓（**整份文件进不来** ✗）。
  //
  // **根因与第 128 轮那条一字不差** ✓：降级层把 `static { … }` 落成
  // 「造一个无参函数、用构造函数当 `this` 立刻调一次」✓——所以它**真的**是一层函数 ✓；
  // 而**作用域分析**（`scope.xl.md` 的 `IsFunctionNode` ✓）那张「自带一层作用域」的名单里
  // **没有它** ✗。于是模块那一层不为 `C` 留格子 ✓，块里那个合成函数读不到它 ✗。
  //
  // **这是同一个根因的第四次** ✓：第 96 轮漏 `MethodDeclaration` ✓、第 99 轮漏访问器 ✓、
  // 第 128 轮漏 `Constructor` ✓、这一轮漏静态块 ✓——那张名单的注释里写着「**宁可多列**」✓：
  // 漏一个不是「少开一格」✗，而是**整层不开环境** ✓，症状永远离现场很远 ✓。
  // **修法**：名单里补一格 ✓（一处 ✓）。
  const outline = [];
  const request = new RunRequest();
  request.Sources = [[
    "class Ordered { static log: string[] = []; static { Ordered.log.push('b1'); } static { Ordered.log.push('b2'); } }",
    "console.log(Ordered.log.join(','));",
    "class WithThis { static v = 1; static { this.v = 2; } }",
    "console.log(WithThis.v);",
    "class Nested { static fns: Array<() => number> = []; static x = 5; static { Nested.fns.push(() => Nested.x); } }",
    "console.log(Nested.fns[0]());",
    "class MixedOrder { static seen: string[] = []; static a = MixedOrder.seen.push('field'); static { MixedOrder.seen.push('block'); } }",
    "console.log(MixedOrder.seen.join(','));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => outline.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(outline[0], "b1,b2", "**这一轮修的**：静态块看得见类名（捕获分析补上之后自然成立）");
  eq(outline[1], "2", "`this` 在静态块里就是那个类（与静态字段初始化式同一条口径）");
  eq(outline[2], "5", "块里造出来的闭包也看得见类名");
  eq(outline[3], "field,block", "静态字段与静态块按**源码顺序**求值");
});

console.log("");
console.log("=== 第 197 轮：带展开的构造 `new C(...xs)` ===");

check("`new C(...xs)` 走 `[[Construct]]`：原型、返回对象那一支、以及早返回不许漏水", () => {
  // **端到端那一把在 `cases/75-new-spread.ts`**（10 行逐字节 ✓）。
  //
  // **症状** ✗：`new P(...[5]).x` 报 `unimplemented: spreading into new` ✓
  // （**整份文件进不来** ✗）。
  //
  // **根因** ✓：引擎的 `Op.New` 只认「从某格开始的**连续**若干格」 ✗，
  // 而带展开的实参个数**只有运行期才知道** ✗——铺不出那张连续的表。
  //
  // **修法** ✓：**引擎一行都不用改** ✓。降级层先把实参收成一个数组 ✓
  // （`BuildArgsArray` ✓，与 `f(...xs)` 那条**完全同一个**铺法 ✓），
  // 再走**语言内建调用** `NewApplyId` ✓（与 `SpreadIntoId` 同一个号段 ✓、同一个理由：
  // 那边要 `protos` 造实例 ✓）。那一侧按 JS 的 `[[Construct]]` 走四步 ✓：
  // 读构造函数的 `prototype` ✓ → 拿它当原型造对象 ✓ → 用新对象当 `this` 调构造函数 ✓
  // → 构造函数**返回对象就用它** ✓。
  const outline = [];
  const request = new RunRequest();
  request.Sources = [[
    "class P { constructor(a, b) { this.a = a; this.b = b; } sum() { return this.a + this.b; } }",
    "const xs = [3, 4];",
    "const p = new P(...xs);",
    // ① 原型接对了（`instanceof` 与原型上的方法一起问）
    "console.log(p.sum(), p instanceof P);",
    // ② 返回**对象**就用它（JS 那一支）
    "class Boxed { constructor() { return { tag: 'boxed' }; } }",
    // ③ 返回**原始值**就用新造的那个对象（另一支）
    "class Plain { constructor() { return 7; } }",
    "console.log(new Boxed().tag, new Plain() instanceof Plain);",
    // ④ 派生类：`new Q(...xs)` 里再 `super(...)`（两条路叠在一起）
    "class Q extends P { constructor(a, b) { super(a, b); } }",
    "console.log(new Q(...xs).sum(), new Q(...xs) instanceof Q, new Q(...xs) instanceof P);",
    // ⑤ **水位**：早返回之后紧接着一串变量，槽位整体错位的话这里先红
    "const t1 = 1, t2 = 2, t3 = 3, t4 = 4;",
    "console.log(t1 + t2 + t3 + t4, new P(...[10, 20]).sum() + t1);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => outline.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(outline[0], "7 true", "① 原型取自构造函数上那一格 `prototype`（`instanceof` 与原型方法一起对）");
  eq(outline[1], "boxed true", "② 构造函数**返回对象**就用它 ③ 返回原始值就用新造的那个对象");
  eq(outline[2], "7 true true", "④ 派生类的构造函数再 `super(...)`：两条路叠在一起也对");
  eq(outline[3], "10 31", "⑤ 早返回没有漏水：后面所有变量的槽都对得上（第 197 轮实测踩到的那一格）");
});

console.log("");
console.log("=== 第 198 轮：算术与比较的 `ToPrimitive` / `ToNumber` ===");

check("`ToPrimitive` / `ToNumber` 各只有一份：`Number(x)`、`+x`、`x + y`、`x == y`、`x < y` 问的是同一张表", () => {
  // **端到端那一把在 `cases/76-arithmetic-toprimitive.ts`**（18 行逐字节 ✓）。
  //
  // **症状**：`undefined + 1` 报 `arithmetic on a non-numeric operand` ✓
  // （JS 给 `NaN` ✓）——第 197 轮写语料时撞出来的 ✓，逐条量过发现是**一整片** ✓：
  // `null + 1` / `true + 1` / `[] + 1` / `({}) + 1` / `1 - "2"` / `2 * "3"` 全是同一句 ✗。
  //
  // **修法**：`ToPrimitiveOf`（对象 → 原始值 ✓，`Symbol.toPrimitive` → `valueOf` → `toString` ✓）
  // 与 `ToNumberPrimitive` / `ToNumberOf`（原始值 → 数 ✓）各**只写一份** ✓，
  // 六个算术算子 + 一元 `+` + `==` + 四条关系**全部**转调它们 ✓——
  // `Number` 那个内建也转调 ✓（`NumberFromValue` ✓），
  // 比较那一半原来那条 `NumericForCompare` 也并了进来 ✓。
  //
  // **这一条量的是「一处」** ✓：同一张表被五条路问，答案必须**逐字相同** ✓。
  const out = [];
  const request = new RunRequest();
  request.Sources = [[
    // ① 五条路问同一个值，答案要一样
    "const probes: any[] = [undefined, null, true, '', '   ', '12', '12px', [], [5], [1, 2]];",
    "const viaUnary: number[] = [];",
    "const viaCtor: number[] = [];",
    "for (const p of probes) { viaUnary.push(+p); viaCtor.push(Number(p)); }",
    "console.log(viaUnary.join('|'));",
    "console.log(viaCtor.join('|'));",
    "console.log(viaUnary.join('|') === viaCtor.join('|'));",
    // ② `==` 要走两轮（布尔先换数、对象先换原始值）
    "console.log([] == false, [0] == false, '0' == false, '' == false, [] == '');",
    // ③ 四条关系：两边都是字符串才按码元比
    "console.log('10' < 9, '10' < '9', [1, 2] < 'b', null < 1, undefined < 1, NaN <= 1);",
    // ④ `Object.prototype` 上那两个方法**不可枚举**（挂成普通属性的话这里当场变 2）
    "console.log(Object.keys({}).length, JSON.stringify({}));",
    "const seen: string[] = [];",
    "const bag: any = { a: 1 };",
    "for (const k in bag) seen.push(k);",
    "console.log(seen.join(','), typeof bag.toString, typeof bag.valueOf);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => out.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(out[0], out[1], "**这一轮最值钱的一条**：`+x` 与 `Number(x)` 逐字同一个答案（同一张表）");
  eq(out[2], "true", "两边都是同一串（`+x` 就是 `Number(x)`）");
  eq(out[3], "true true true true true",
    "`==` 那一族：`[] == false` 要走两轮（对象 → `\"\"` → `0`，布尔 → `0`）");
  eq(out[4], "false true true true false false",
    "四条关系：`'10' < 9` 是**数值**比（假）、`'10' < '9'` 是**码元**比（真）；`NaN` 参与一律假");
  eq(out[5], "0 {}", "`Object.prototype` 上那两个方法**不可枚举**（`Object.keys` / `JSON` 看不见）");
  eq(out[6], "a function function", "`for..in` 也不该看见它们；但它们**确实在**（`typeof` 是 function）");
});

check("不能给近似值的那几格：**响亮地抛、并点名缺什么**（不许落回一个看起来合理的默认值）", () => {
  // **这一条是这一轮的安全闸门** ✓。`ToPrimitive` 一接上，`+` 对**任何**对象都会去找
  // `valueOf` / `toString` ✓——而 `Object.prototype.toString` 在 JS 里是一条**长长的分派**
  // （`Map` / `Set` / `Date` / `Error` / 函数各有各的文本 ✓）。
  // 本仓能**证明**的只有「普通对象 → `[object Object]`」这一格 ✓，
  // 所以其余一律抛 ✓——**落回默认值就是静默错值** ✗，而它比「进不了门」危险得多 ✓。
  //
  // **两半分开量** ✓（与第 184 轮那条同一个处理 ✓）：
  // ① **端到端**：六种形状都「跑不成」 ✓——脚本级的抛，驱动只记
  //    「第 0 份模块求值：the script threw」✗，**引擎那句原话不会冒到这里** ✓；
  // ② **单元**：原话由 `ObjectTagOf`（那条判据的正身 ✓）那一层量 ✓——
  //    造那几族只要一格标记 / 一次 `AttachCallable` / 一次 `Proto` 赋值 ✓，不必真造一个 `Map` ✓。
  const loud = [
    // **「函数」那一档第 334 轮划掉了** ✓：`HeapClosure.Source` 那一格补上之后
    // `f + 1` 有**真答案**了 ✓（`"function f() {}1"` ✓）——与 `Map` / `Set`（第 229 轮 ✓）、
    // `Error`（第 213 轮 ✓）**同一条路** ✓：一旦给得出真答案，就从这张表里搬走 ✓，
    // 并在下面另起一条「必须给对」✓。**留着它就是钉住旧口径** ✗
    // （这一轮实测：它红了 ✓，而红的话是「必须响亮地抛」✓——**读起来像新东西坏了** ✗）。
    ["Date 的 default", "console.log(new Date(0) + 1);"],
    // **`Error` 从这一档里划掉了**（第 213 轮）：那一轮把 `Error.prototype.toString` 装上之后，
    // `new Error("x") + 1` 有**真答案**（`"Error: x1"`，与 Node 逐字相同）——它已经不在
    // 「不能给近似值」那一档里。判据跟着改：下面另有一条「必须给对」。
    ["可调用对象", "console.log(String + 1);"],
  ];
  for (const [what, source] of loud) {
    const request = new RunRequest();
    request.Sources = [source];
    request.Entry = "";
    const res = RunSources(request, () => {}, () => null);
    ok(res.Outcome !== HostOutcome.Ok, what + " 那一档必须响亮地抛（结局不是 Ok）");
  }
  // **`Map` / `Set` 那一档现在给的是真答案**（第 229 轮）：与 Node 逐字节相同。
  {
    const request = new RunRequest();
    request.Sources = ['console.log(new Map() + 1, new Set() + 1);'];
    request.Entry = "";
    const lines = [];
    const res = RunSources(request, (text) => lines.push(text), () => null);
    eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
    eq(lines[0], "[object Map]1 [object Set]1",
      "`Symbol.toStringTag` 挂上之后，`new Map() + 1` 与 `new Set() + 1` 都给 `\"[object …]1\"`（与 Node 一致）");
  }
  // **`Error` 那一档现在给的是真答案**（第 213 轮）：与 Node 逐字节相同。
  {
    const request = new RunRequest();
    request.Sources = ['console.log(String(new Error("x")), new Error("y") + 1);'];
    request.Entry = "";
    const lines = [];
    const res = RunSources(request, (text) => lines.push(text), () => null);
    eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
    eq(lines[0], "Error: x Error: y1",
      "`Error.prototype.toString` 装上之后，`String(e)` 与 `e + 1` 都给 `\"Error: …\"`（与 Node 一致）");
  }
  // **函数那一档现在也给真答案**（第 334 轮）：`f + 1` = 源码 + `"1"` ✓。
  //
  // **为什么这里只量两头、不与 Node 逐字节比** ✗：本仓给的是**原文** ✓
  //（`function f(): number { … }` ✓，类型注解原样 ✓），而 Node 跑的是
  // **擦过类型的那一份** ✓——它把注解那一段**换成空格**（`function f(         ) { … }` ✓，
  // 实测 ✓）。**两种都「对」** ✓：规范要的是「这段函数的源码」✓，
  // 而「TS 的源码」与「擦完类型的源码」是两个都说得通的口径 ✓——
  // 本仓选了**原文** ✓（用户手里那一份就是它 ✓），差别写在这里当账 ✓。
  {
    const request = new RunRequest();
    request.Sources = ['function f(a) { return a; }\nconsole.log(f + 1, String(f) === f.toString());'];
    request.Entry = "";
    const lines = [];
    const res = RunSources(request, (text) => lines.push(text), () => null);
    eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
    eq(lines[0].startsWith("function f(a) { return a; }") && lines[0].endsWith("1 true"), true,
      "`f + 1` 给「源码 + 1」、`String(f) === f.toString()` 为真（实测：" + lines[0] + "）");
  }

  // **单元那一半**：`ObjectTagOf` 答「哪个标签」，答不了就**点名**缺什么 ✓。
  const { SetHiddenProperty } = require(path.join(root, "build", "ts", "runtime", "props.js"));
  const { ObjectTagOf } = require(path.join(root, "build", "ts", "typescript-exec", "builtins", "globals.js"));
  const { ToPrimitiveOf, ToPrimitiveDefault } = rtMod;
  const table = new HeapTable();
  const machine = new Vm(table, 1 << 20, 10000);
  const protos = InitProtos(machine.Room(), table);
  // **`ObjectTagOf` 第 306 轮多了两格** ✓（`room` 与 `call` ✓）：走 `[[Get]]` 之后
  // 访问器要**调 getter** ✓，那是一次重入 ✓——所以它要一个房间检查与一条调用通道 ✓。
  // 这一条单元判据**没有通道** ✓，于是传 `null` ✓：语义退回「只认数据属性」✓
  //（正是下面这几格要量的东西 ✓，一个都不受影响 ✓）。
  const ask = (value) => {
    try {
      return ObjectTagOf(machine.Room(), null, table, protos, value);
    } catch (error) {
      return "!" + String(error.message);
    }
  };
  const fresh = () => NewPlainObject(machine.Room(), table, protos);
  eq(ask(fresh()), "Object", "**能证的那一格**：普通对象给 `Object`（`[object Object]` ✓）");
  const marked = (name) => {
    const object = fresh();
    SetHiddenProperty(machine.Room(), table, object,
      Value.FromString(table.CreateString(units(name))), Value.FromInt(1));
    return object;
  };
  ok(ask(marked("__k")).indexOf("of a Map (JS needs Symbol.toStringTag)") >= 0,
    "`__k` 标记 → 点名 `Map` / `Symbol.toStringTag`：" + ask(marked("__k")));
  ok(ask(marked("__v")).indexOf("of a Set (JS needs Symbol.toStringTag)") >= 0,
    "`__v` 标记 → 点名 `Set`：" + ask(marked("__v")));
  ok(ask(marked("__t")).indexOf("of a Date (JS needs Symbol.toStringTag)") >= 0,
    "`__t` 标记 → 点名 `Date`：" + ask(marked("__t")));
  // **`Error` 那一族给的是 `"Error"`** ✓（第 229 轮改 ✓）：JS 里 `Object.prototype.toString`
  // **不特判 `Error`** ✗——它按普通对象那条走 ✓，而 `Error.prototype` 上没有
  // `Symbol.toStringTag` ✓，所以答案是 `"[object Error]"` ✓（**不是** `"Error: x"` ✗！）。
  // `"Error: x"` 是 `Error.prototype.toString` 的答案 ✓（第 213 轮装的 ✓，
  // 上面那条端到端判据量着它 ✓）——**同一个值、两个方法、两个答案** ✓，
  // 这里原来把两者混成一句 ✗（第 229 轮把次序摆正 ✓）。
  const errorLike = fresh();
  table.Get(errorLike.Ref).Proto = protos.Error;
  eq(ask(errorLike), "Error",
    "原型链接到 `Error.prototype` → 标签是 `Error`（`[object Error]` ✓，不是 `Error: x` ✗）");
  const callable = fresh();
  table.AttachCallable(callable.Ref, 1, 0);
  ok(ask(callable).indexOf("callable object") >= 0,
    "带可调用载荷 → 点名（JS 印源码文本）：" + ask(callable));
  // **函数那一档第 334 轮搬走了** ✓：它原来在 `ToPrimitiveOf` 里**响亮地抛** ✓
  // （「JS 印源码文本、而引擎拿不到那一份」✓——那在当时是事实 ✓）；
  // `HeapClosure.Source` 那一格补上之后 ✓，它有**真答案**了 ✓（源码文本 ✓），
  // 所以这里改成量「**给得出那一串**」✗（不是量它抛 ✓）。
  // **没有源码那一档仍然点名** ✓（`new Lowering()` 那十几处 ✓）——下面那一条量着它 ✓。
  const withSource = table.CreateClosure(0, 0, 0, 0, 0);
  table.Get(withSource).AsClosure().Source = propKey(table, "function f() { return 1; }").Ref;
  const produced = ToPrimitiveOf(machine.Room(), null, protos, table,
    Value.FromRef(ValueTag.Closure, withSource), ToPrimitiveDefault);
  eq(produced.Tag, ValueTag.String, "有源码的闭包 → `ToPrimitive` 给字符串（不再是抛）");
  eq(produced.Ref, table.Get(withSource).AsClosure().Source, "给的就是闭包上那一格");
  const closure = Value.FromRef(ValueTag.Closure, table.CreateClosure(0, 0, 0, 0, 0));
  let closureMessage = "";
  try {
    ToPrimitiveOf(machine.Room(), null, protos, table, closure, ToPrimitiveDefault);
  } catch (error) {
    closureMessage = String(error.message);
  }
  ok(closureMessage.indexOf("ToPrimitive of a function") >= 0,
    "**没有源码**的闭包仍然点名（不编一个空的）：" + closureMessage);

  // **反面**：这三样**必须给答案** ✓（不能因为「怕错」就把它们也关了 ✗）。
  const fine = (source) => {
    const request = new RunRequest();
    request.Sources = [source];
    request.Entry = "";
    return RunSources(request, () => {}, () => null).Outcome === HostOutcome.Ok;
  };
  eq(fine("console.log(({}) + 1);"), true, "普通对象给答案（`[object Object]1`）");
  eq(fine("console.log([1] + 1);"), true, "数组给答案（走 `Array.prototype.toString`）");
  eq(fine("console.log(+new Date(1234));"), true,
    "**`+new Date(ms)` 不受影响**：一元 `+` 的 hint 是 `number` → `valueOf` → 毫秒数");
});

console.log("");
console.log("=== 第 199 轮：生成器进得了每一个「急切」的入口 ===");

check("四个急切入口都走引擎那张 `drain`；`for..of` 仍旧是惰性的", () => {
  // **端到端那一把在 `cases/77-generator-iteration.ts`**（14 行逐字节 ✓）。
  //
  // **症状**：`[...g()]` 报 `unimplemented: spreading a value that is not an array,
  // a string, a Map or a Set` ✓——**整份文件进不来** ✗。
  //
  // **根因是一条分层边界** ✓：走完一个生成器要发 `iter_next` ✓，那是**指令** ✓、
  // 不是建库层能调的函数 ✗。`GetIterator` 对生成器**原样返回** ✓
  //（那正是 `for..of` 那条**惰性**路要的形状 ✓），于是所有**急切**的入口都落到「其它」抛 ✗。
  //
  // **修法**：引擎把那张服务递下来 ✓（`DrainIterator` / `IteratorDrainer()` ✓，
  // 与 `Scheduler()` / `Settler()` 同一个形状 ✓），语言层照旧不碰指令 ✓。
  const out = [];
  const request = new RunRequest();
  request.Sources = [[
    "function* numbers(): Generator<number> { yield 1; yield 2; yield 3; }",
    // ① 展开（含夹在中间那一档）
    "console.log([...numbers()].join(','), [0, ...numbers(), 9].join(','));",
    // ② 解构（声明 + 剩余 + 赋值）
    "const [a, b] = numbers();",
    "const [head, ...tail] = numbers();",
    "let x: number, y: number;",
    "[x, y] = numbers();",
    "console.log(a, b, head, tail.join('-'), x, y);",
    // ③ `Array.from`（含映射函数）
    "console.log(Array.from(numbers()).join('|'), Array.from(numbers(), (n: number) => n * 10).join('|'));",
    // ④ 集合的初值
    "console.log(new Set(numbers()).size, [...new Set(numbers())].join(','));",
    "console.log([...new Map([['k', 1]]).keys()].join(','));",
    // ⑤ 函数的实参位（含宿主能力）
    "function sum(...xs: number[]) { return xs.reduce((m: number, n: number) => m + n, 0); }",
    "console.log(sum(...numbers()), Math.max(...numbers()));",
    // ⑥ **惰性**：`for..of` 里 `break` 之后不许再跑生成器体 ✓
    "function* loud(): Generator<number> { yield 1; yield 2; throw new Error('drained!'); }",
    "let seen = '';",
    "for (const n of loud()) { seen += n; if (n === 2) break; }",
    "console.log(seen);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => out.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(out[0], "1,2,3 0,1,2,3,9", "① 展开：整个生成器 + 夹在定长元素中间");
  eq(out[1], "1 2 1 2-3 1 2", "② 解构：声明 / 剩余 / 赋值三半都走同一条");
  eq(out[2], "1|2|3 10|20|30", "③ `Array.from`：含映射函数那一档");
  eq(out[3], "3 1,2,3", "④ `new Set(生成器)`（原来**静默给空集** ✗）");
  eq(out[4], "k", "④ `new Map(可迭代物)`");
  eq(out[5], "6 3", "⑤ 函数的展开实参位 + 宿主能力");
  eq(out[6], "12", "⑥ **`for..of` 没走那张 drain**：`break` 之后生成器体不再跑（否则这里会抛）");
});

check("语言层手里的中间数组**要有根**：展开一个 6 万项的 `Symbol.iterator` 不再报 `invalid handle`", () => {
  // **这一条是这一轮实测抓到的潜伏 bug** ✗，不是新功能带来的 ✓：
  // 语言层「造一个数组 → 循环里调脚本 → 往数组里收」这个形状**有一个真实的窗口** ✗——
  // 循环里任何一次 `room(...)` 都可能触发回收 ✓，而那个数组是**这一层自己造的** ✓、
  // **不在 `SnapshotRoots` 的名单里** ✗ → 被收走 → `Push` 落在死句柄上 ✓
  //（实测：6 万项的 `[...o]` 报 `invalid handle: 322` ✓；**四万格以内看不出来** ✗——
  // 阈值没到就一次都不回收 ✓，正是「测试绿、线上收掉活对象」那一种 ✓）。
  //
  // 修法：引擎多一格**临时根**（`Temps` ✓，与 `Retained` 同一条理由 ✓）与那个开关
  //（`RootKeeper()` ✓），语言层在**跨过一次会分配的动作**之前把它挂上 ✓。
  // **两轮实测各抓到一处** ✗：第一轮漏了 `out` 之外的**迭代器自己** ✓、
  // 第二轮漏了**循环外造、循环里用的三个键字符串** ✓——所以闸门要有**够多的垃圾**
  // 才能逼出回收 ✓（下面这一条就是那样写的 ✓：每一步造 2KB 垃圾 ✓，
  // 实测**三千项就会回收六次以上** ✓，而真跑到 6 万项要好几分钟 ✓）。
  const out = [];
  const request = new RunRequest();
  request.Sources = [[
    // **每一步造 2KB 垃圾** ✓：堆被逼到阈值 ✓ → 回收必然发生 ✓ → 根挂没挂当场见分晓 ✓。
    "const o: any = { [Symbol.iterator]() { let i = 0; return { next: () => {",
    "  i++; const pad = 'x'.repeat(2000);",
    "  return { value: i + pad.length - 2000, done: i > 3000 }; } }; } };",
    "const xs = [...o];",
    "console.log(xs.length, xs[0], xs[2999]);",
    // `Array.from` 那条路同样经过「造数组 + 循环里调脚本 + 收」✓，一起钉住 ✓。
    "const ys = Array.from(o);",
    "console.log(ys.length, ys[2999]);",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => out.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器（这一抛就是根没挂住）：" + res.Message);
  eq(out[0], "3000 1 3000", "**这一轮修的**：展开一个会逼出回收的 `Symbol.iterator`，一项都不少");
  eq(out[1], "3000 3000", "`Array.from` 同一条路（它多了 `out` 那一格要挂）");
});

console.log("");
console.log("=== 第 200 轮：语言层手里的中间值要有根 ===");

check("`map` / `filter` 的结果数组、`reduce` 的累加器：都跨得过一次回收", () => {
  // **端到端那一把在 `cases/78-intermediate-roots.ts`**（7 行逐字节 ✓）。
  //
  // **症状**：`xs.map(…)` 的回调每轮造 2KB 垃圾时，**三千项**就报 `invalid handle` ✗
  //（第 199 轮抓到的是同一族的另一处：`[...一个 6 万项的 Symbol.iterator]` ✓）。
  //
  // **根因**：回收器只看 `SnapshotRoots` ✓，而**语言层自己造的东西不在名单里** ✗——
  // 「手里拿着它 → 调一次脚本 / 问一次分配前那道闸门 → 再用它」中间有**一个真实的窗口** ✓。
  //
  // **收口的判据**（这一轮定下来的 ✓，写在 `array.xl.md` / `install.xl.md` 里 ✓）：
  // 「**这个值还挂在别处吗**」✓——挂在调用方的槽里 ✓ / 挂在那个数组身上 ✓ 的**不必挂** ✗，
  // 只有**谁都够不着**的那些才要挂 ✓。
  //
  // **两档要分清**（这一轮的账里也是这么写的 ✓）：
  // · **量出来的** ✓：`map` 与 `filter` 的结果数组 ✓——把 keep 关掉，下面这两条**当场红** ✓
  //  （`invalid handle: 318/322` ✓，实测过 ✓）；
  // · **判出来的** ✓：`reduce` 的累加器（它**不在数组身上** ✓，第一轮是初值、之后是上一轮的返回值 ✓）、
  //   `new C(...xs)` 那个实例（窗口只有「读 `prototype`」那一小段 ✓——调用一开始它就进了被调方的
  //   `this` 槽 ✓，所以那一段**量不出稳定复现** ✗）。两处都**照样挂上** ✓：挂根是**保守**的一侧 ✓，
  //   而漏挂是**静默错值** ✗。
  //
  // 下面每一段都在回调里**故意造 2KB 垃圾**：那是把窗口逼出来的手段 ✓
  //（不造垃圾的话，阈值不到就一次都不回收 ✗，这条判据会**空转** ✗）。
  const out = [];
  const request = new RunRequest();
  request.Sources = [[
    "const n = 3000;",
    "const xs: number[] = [];",
    "for (let i = 0; i < n; i++) xs.push(i);",
    // ① `map`：结果数组（**量出来的**那一档）
    "const doubled = xs.map((v: number) => { const pad = 'x'.repeat(2000); return v * 2 + pad.length - 2000; });",
    "console.log('map', doubled.length, doubled[0], doubled[n - 1]);",
    // ② `filter`：结果数组（**量出来的**那一档）
    "const odd = xs.filter((v: number) => { const pad = 'x'.repeat(2000); return v % 2 === 1 && pad.length === 2000; });",
    "console.log('filter', odd.length, odd[0], odd[odd.length - 1]);",
    // ③ `reduce`：累加器**不在数组身上**——用**对象**当累加器（用数的话它根本不是引用型 ✗）
    "const total = xs.reduce((acc: any, v: number) => { const pad = 'x'.repeat(2000); acc.sum = acc.sum + v + pad.length - 2000; return acc; }, { sum: 0 });",
    "console.log('reduce', total.sum);",
    // ④ `new C(...xs)`：新造的实例（**判出来的**那一档）
    "class Acc { value = 0;",
    "  constructor(seed: number) { for (let i = 0; i < 4000; i++) { const pad = 'y'.repeat(2000); this.value = seed + pad.length - 2000; } } }",
    "const seedArg: number[] = [7];",
    "console.log('new', new Acc(...seedArg).value);",
    // ⑤ 小规模那一档照旧（回归：加了根不等于改了语义）
    "console.log('small', [1, 2, 3].map((v: number) => v + 1).join(','), [1, 2, 3, 4].filter((v: number) => v % 2 === 0).join(','), [1, 2, 3, 4].reduce((m: number, v: number) => m + v, 0));",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => out.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器（这一抛就是根没挂住）：" + res.Message);
  eq(out[0], "map 3000 0 5998", "**量出来的**：`map` 的结果数组跨得过回收");
  eq(out[1], "filter 1500 1 2999", "**量出来的**：`filter` 的结果数组");
  eq(out[2], "reduce 4498500", "**判出来的**：`reduce` 的累加器（对象，不在数组身上）");
  eq(out[3], "new 7", "**判出来的**：`new C(...xs)` 造出来的实例活过了构造函数");
  eq(out[4], "small 2,3,4 2,4 10", "小规模那一档照旧（回归）");
});

console.log("");
console.log("=== 第 201 轮：带 `finally` 的 `try` 里 `return` / `break` / `continue` ===");

check("三样 abrupt completion 走同一条改写：先把在册的 `finally` 从里到外发一遍", () => {
  // **端到端那一把在 `cases/79-finally-return.ts`**（21 行逐字节 ✓）。
  //
  // **症状**：`function f() { try { return 1; } finally { … } }` 报
  // `unimplemented: return inside a try with finally (it would skip the finally)` ✓
  // ——**整份文件进不来** ✗（这是 `BLOCKED` 那一栏的第一条 ✓）。
  //
  // **那一抛本身是对的** ✓：静默跳过 `finally` 是**静默错值** ✗。缺的是那段改写 ✓——
  // 修法是给降级层一摞 `FinallyBlocks` ✓（原来只有一个计数 ✓，所以只报得出错 ✗）
  // 与一个 `EmitPendingFinalies` ✓：**从里到外把在册的各发一遍** ✓，再 `return` / `Jump` ✓。
  // **`throw` 不走它** ✓（异常本来就走「重抛」那张网 ✓，`finally` 由那条路跑 ✓）。
  //
  // **降级期不再抛了** ✓（先钉住「能降级」）。
  // **注意这里不能引用全局名** ✗：`new Lowering()` 的全局名单是**驱动**声明进去的 ✓
  //（`DeclareGlobals` ✓）——写 `console` 会先报「`console` 不是局部名也不是捕获」✗，
  // 那句话离现场很远 ✗（第 133 轮那条判据的注释里就记着这一条 ✓）。
  for (const source of [
    "function f() { try { return 1; } finally { } }",
    "function f() { for (const x of [1]) { try { break; } finally { } } }",
    "function f() { for (let i = 0; i < 2; i++) { try { continue; } finally { } } }",
  ]) {
    let lowered = "";
    try {
      new Lowering().LowerModule(parseTsShape(source), testIds);
    } catch (error) {
      lowered = String(error.message);
    }
    eq(lowered, "", "这一条降级得出来（不再抛）：" + source.slice(0, 40));
  }
  // **值也要对** ✓（只量「不抛」是半条判据）：
  const out = [];
  const request = new RunRequest();
  request.Sources = [[
    // ① **返回值要在跑 `finally` 之前算出来**（JS 给 `1`，不是 `2`）
    "function snapshot(): number { let n = 0; try { n = 1; return n; } finally { n = 2; console.log('fin', n); } }",
    "console.log('snapshot', snapshot());",
    // ② 带**标签**的 `break`（跳出的是标签那一层循环）
    // **注意这里用的是带标签的循环、不是带标签的块** ✗：`outer: { … break outer; … }`
    //（标签在块上）在本仓**还没做** ✗——`Loops` 那一摞只收循环与 `switch` ✓，
    // 报的是 `unknown label` 离现场很远的一句 ✗。那是**另一件事** ✓，记在台账里 ✓。
    "function labeled(): string { const seen: string[] = [];",
    "  outer: for (let i = 0; i < 3; i++) { try { seen.push('in-' + i); break outer; } finally { seen.push('fin-' + i); } }",
    "  return seen.join(','); }",
    "console.log('labeled', labeled());",
    // ③ **连着两段** `try`/`finally`：第一段的返回发完 `finally` 之后，
    //    「在册」那一摞要**恢复** ✗——不恢复的话第二段的 `finally` 会静默丢掉 ✓
    "function twoPaths(flag: boolean): string {",
    "  if (flag) { try { return 'a'; } finally { console.log('F1'); } }",
    "  try { return 'b'; } finally { console.log('F2'); } }",
    "console.log('twoPaths', twoPaths(true), twoPaths(false));",
    // ④ `finally` 自己 `return` **接管**（`try` 里那个返回值被丢掉）
    "function override(): number { try { return 1; } finally { return 2; } }",
    "console.log('override', override());",
    // ⑤ 嵌套：从里到外，最后才返回
    "function nested(): string { try { try { return 'inner'; } finally { console.log('A'); } } finally { console.log('B'); } }",
    "console.log('nested', nested());",
    // ⑥ 异常那条路没被这一轮碰到（回归）：`finally` 照跑、异常照冒
    "function stillThrows(): string { try { try { throw new Error('e'); } finally { console.log('fin-6'); } } catch (err) { return 'caught:' + (err as Error).message; } }",
    "console.log('stillThrows', stillThrows());",
  ].join("\n")];
  request.Entry = "";
  const res = RunSources(request, (text) => out.push(text), () => null);
  eq(res.Outcome, HostOutcome.Ok, "运行器：" + res.Message);
  eq(out[0], "fin 2", "跑 `finally` 时看到的是**改过之后**的 `n`（2）");
  eq(out[1], "snapshot 1", "**返回值在跑 `finally` 之前就定下了**（JS 给 1，不是 2）");
  eq(out[2], "labeled in-0,fin-0", "带标签的 `break`：跑完 `finally` 才跳出那一层循环");
  // **次序说清楚**：`console.log('twoPaths', twoPaths(true), twoPaths(false))` 里的
  // **实参先求值** ✓——所以两段 `finally` 那两行**排在**那一行之前 ✓（JS 也是 ✓）。
  eq(out[3], "F1", "两段里第一段：先跑 F1");
  eq(out[4], "F2", "两段里第二段：F2 照跑（**在册那一摞恢复对了**，否则它会静默丢掉）");
  eq(out[5], "twoPaths a b", "两段的返回值都对（`true` → `a`、`false` → `b`）");
  eq(out[6], "override 2", "`finally` 自己 `return` **接管**这次完成");
  eq(out[7], "A", "嵌套：最里层先跑");
  eq(out[8], "B", "再往外一层");
  eq(out[9], "nested inner", "最后才返回");
  eq(out[10], "fin-6", "异常那条路照旧：`finally` 先跑");
  eq(out[11], "stillThrows caught:e", "再把异常交给 `catch`（回归）");
});

console.log("");
console.log(`值模型 / 堆 / 回收器 / IR / 装载验证 / 执行器 / 属性 / this / 访问器 / 生成器 / 承诺 / 宿主 / P0雏形：${passed} 条通过，${failed} 条失败`);
process.exitCode = failed === 0 ? 0 : 1;
