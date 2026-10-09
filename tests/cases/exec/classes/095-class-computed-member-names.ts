// xl:title 计算成员名：对象字面量与类里的 `[expr]`、符号键、静态与访问器上的计算名
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 15 条用例——
//   · 012-computed-class-members-root、016-computed-member-and-call、031-computed-class-field-names、
//     047-computed-member-names、050-computed-class-members-r7、060-sym-computed-member、
//     061-sym-computed-class-member
//   · exec/classes/probe693-c41、c42、c43、c44、c47、c48
//   · probe696-k10 · probe699-k-e40 · probe2-k14
// 判据一段一条（吸收进来的多语句正文逐字保留在自己的 IIFE 里，输出逐行不变）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const guard = (f) => {
  try {
    console.log(f());
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
const probe = (f) => guard(() => show(f()));

// 类里的计算成员名：方法 / 访问器 / 静态
(() => {
  const m = "run";
  const g = "val";
  class C {
    [m](): number { return 1; }
    get [g](): number { return 2; }
    static ["make"](): string { return "s"; }
  }
  console.log(new C().run(), (new C() as any).val, C.make(), Object.getOwnPropertyNames(C.prototype).join(","));
})();
// 计算成员访问与调用（字符串键、数字键、下标）
(() => {
  const key = "val";
  const idx = 2;
  const o: any = { val: () => "called", 2: "two" };
  console.log(o[key](), o[idx], o[String(idx)]);
  const arr: any = [10, 20, 30];
  console.log(arr[idx], arr["length"], arr[arr.length - 1]);
})();
// 类字段的计算名（实例与静态各一格）
(() => {
  const KEY = "value";
  class Box {
    [KEY] = 1;
    ["static" + "Key"] = 2;
  }
  const b = new Box();
  console.log(b.value, (b as any).staticKey, Object.keys(b).sort().join(","));
})();
// 对象字面量与类里的 `[expr]`、方法简写
(() => {
  const k = "dyn";
  const n = 1;
  const o = { [k]: 1, ["a" + n]: 2, [`t${n}`]: 3, ["m"]() { return "m"; } };
  const c = class { ["p"] = 4; [k]() { return 5; } };
  const inst: any = new c();
  console.log(o.dyn, o.a1, o.t1, o.m(), inst.p, inst.dyn());
})();
// 静态计算名、getter 计算名、私有与计算名混用、符号字段
(() => {
  const key = "dyn";
  const tag = Symbol("t");
  class C {
    static [key] = "static-dyn";
    [key](): string { return "method-dyn"; }
    get [`g${1}`](): string { return "getter1"; }
    [tag] = "symbol-field";
    read(v: any): any { return v[tag]; }
  }
  const c: any = new C();
  console.log((C as any)[key], c[key](), c.g1, c.read(c), typeof c[tag]);
})();
// 符号键：读写与两道名表
(() => {
  const s = Symbol("k");
  const o: any = {};
  o[s] = 1;
  console.log(o[s], typeof s);
  const o2: any = { [s]: 2 };
  console.log(o2[s]);
})();
(() => {
  const s = Symbol("m");
  class C {
    [s](): string {
      return "sym-method";
    }
    ["plain" + ""](): string {
      return "plain-method";
    }
  }
  const c = new C();
  console.log((c as any)[s](), (c as any).plain());
  console.log(Object.getOwnPropertyNames(C.prototype).join(","));
})();
// 探针那一族
probe(() => (function () { const o = {}; const k = "a"; o[k] = 1; return o.a; })());
probe(() => (function () { const k = 1; const o = { [k + 1]: "x" }; return o[2]; })());
probe(() => (function () { const o = { ["a" + "b"]: 1 }; return o.ab; })());
probe(() => (function () { const key = "m"; class A { [key]() { return 9; } } return new A().m(); })());
probe(() => (function () { class A { ["m" + 1]() { return 1; } } return new A().m1(); })());
probe(() => (function () { class A { [1 + 1]() { return "two"; } } return new A()[2](); })());
probe(() => (function () { class A { [1 + 1] = 5 } return (new A()[2]); })());
probe(() => (function () { const s = Symbol("s"); const o = { [s]: 1 }; return o[s] + "," + Object.keys(o).length; })());
probe(() => (function () { const s = Symbol("s"); const o = { [s]: 1 }; return Object.getOwnPropertySymbols(o).length; })());
