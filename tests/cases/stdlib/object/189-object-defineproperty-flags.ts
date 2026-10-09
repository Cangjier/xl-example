// xl:title `defineProperty` / `defineProperties`：标志位、访问器与不可配置那一族
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的二十余条**：
//   probe2-d01 · probe2-d02 · probe2-d03 · probe2-d07 · probe2-d09 · probe2-d10 ·
//   probe2-d11 · probe2-d12 · probe2-d14 · probe2-d15 · probe693-o12 · probe693-o13 ·
//   probe693-o14 · probe693-o26 · probe693-o27 · probe694-o19 · probe695-o11 ·
//   probe695-o18 · probe698-c02 · probe698-c03 · probe698-c04 · probe698-c05 ·
//   probe698-c06 · probe698-c09 · probe703-o-a20 · probe703-o-a33 · probe703-o-a34 ·
//   probe703-o-a43 · probe704-o-d17 · probe705-o-b19 · probe705-o-b20 · probe705-o-b21 ·
//   probe-j25
//   ＋ `005-object-defineproperty` / `024-object-defineproperty-forms` / `039-object-defineproperty-flags`
//     / `051-object-defineproperties-forms` / `066-object-defineproperty-getter-setter`
//     / `143-defineproperties-multi` / `150-defineproperty-redefine` / `154-define-value-undefined-explicit`
//     / `155-define-nonconfigurable-throws` / `156-define-writable-true-to-false`
//     / `157-define-accessor-configurable` / `158-define-accessor-absent-keeps`
//     / `159-define-accessor-nonconfigurable-same` / `160-define-new-prop-defaults`
//     / `161-defineproperties-two-passes` / `164-define-on-frozen` / `165-define-on-nonextensible`
//     / `170-property-descriptor-on-proto` / `116-l677p-obj-lock-difference`
//
// 判定点只有一个：**`[[DefineOwnProperty]]` 那一张表**——
//  ① **新**属性的三个标志默认全假（没写就是假，写 `enumerable: true` 才进 `keys`）；
//  ② **已有**属性里**没写的字段不改**（与「写成 `undefined`」是两档）；
//  ③ 不可配置的格子上：同值改写给过、改值抛 `TypeError`、`writable: true → false` 给过、翻回来抛；
//  ④ 可配置的格子可以在数据与访问器之间来回换；访问器同一对 `get` / `set` 重写给过；
//  ⑤ 访问器只给 `get` / `set` / `enumerable` / `configurable`，**没有** `value` / `writable`；
//  ⑥ `defineProperty` **不看原型链**（同名的原型格不该被动）；
//  ⑦ `defineProperties` 与 `defineProperty` 走同一条路（一个一个来，中间停下来时前面的已经生效）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const err = (f: () => any): string => {
  try { return "no-throw:" + String(f()); } catch (e) { return (e as any).constructor.name; }
};

try {
  // ① 新属性的默认标志
  const fresh: any = {};
  Object.defineProperty(fresh, "a", { value: 1 });
  console.log(show([fresh.a, Object.keys(fresh).length, fresh.propertyIsEnumerable("a")].join(",")));
  console.log(show(Object.defineProperty({}, "a", { value: 1 }).a));
  console.log(show(Object.defineProperty({}, "a", {}).a));
  console.log(show(Object.defineProperty({}, "a", { value: 1, writable: false }).a));
  console.log(show(err(() => { const o: any = {}; Object.defineProperty(o, "a", { value: 1, writable: false }); o.a = 2; return o.a; })));
  console.log(show(Object.defineProperty({}, "a", { value: 1, enumerable: false }).propertyIsEnumerable("a")));
  // ② 没写的字段不改
  const keep: any = { a: 1 };
  Object.defineProperty(keep, "a", { value: 2 });
  console.log(show([keep.a, Object.keys(keep).length].join(",")));
  const acc: any = { get a() { return 1; } };
  Object.defineProperty(acc, "a", { get() { return 2; } });
  console.log(show([acc.a, typeof Object.getOwnPropertyDescriptor(acc, "a")!.get].join(",")));
  // ③ 不可配置那一族
  console.log(show(err(() => { const o: any = {}; Object.defineProperty(o, "a", { value: 1, configurable: false }); Object.defineProperty(o, "a", { value: 2 }); return o.a; })));
  console.log(show(err(() => { const o: any = {}; Object.defineProperty(o, "a", { value: 1 }); Object.defineProperty(o, "a", { value: 2 }); return o.a; })));
  console.log(show(err(() => { const o: any = {}; Object.defineProperty(o, "a", { value: 1, writable: false }); return Object.defineProperty(o, "a", { value: 1, writable: true }) && "ok"; })));
  console.log(show(err(() => { const o: any = {}; Object.defineProperty(o, "a", { value: 1 }); return delete o.a; })));
  console.log(show(err(() => { const o: any = {}; Object.defineProperty(o, "a", { value: 1, configurable: true }); return delete o.a; })));
  // ④ 访问器那一族
  const gs: any = {};
  Object.defineProperty(gs, "a", { get() { return 1; }, set(v: any) { this.b = v; } });
  gs.a = 9;
  console.log(show(gs.b));
  console.log(show(Object.defineProperty({}, "a", { get() { return 1; } }).a));
  console.log(show(err(() => { const o: any = {}; Object.defineProperty(o, "a", { get() { return 1; }, configurable: true }); Object.defineProperty(o, "a", { value: 5 }); return o.a; })));
  console.log(show(err(() => { const o: any = {}; Object.defineProperty(o, "a", { get() { return 1; }, configurable: true }); delete o.a; return o.a === undefined; })));
  console.log(show(err(() => { const o: any = {}; Object.defineProperty(o, "a", { get() { return 1; }, enumerable: true }); const seen: any[] = []; for (const k in o) seen.push(k); return seen.join(","); })));
  console.log(show(err(() => { const o: any = {}; let n = 0; Object.defineProperty(o, "a", { get() { n = n + 1; return 1; } }); Object.keys(o); return n; })));
  console.log(show(err(() => { const o: any = {}; Object.defineProperty(o, "a", { get() { return 1; } }); return "a" in o; })));
  console.log(show(Object.defineProperty({}, "a", { get: undefined }).a));
  // ⑤ defineProperties 与数组下标
  const multi: any = {};
  Object.defineProperties(multi, { a: { value: 1, enumerable: true }, b: { value: 2 } });
  console.log(show([multi.a, Object.keys(multi).join(",")].join("|")));
  console.log(show(err(() => Object.defineProperty([1, 2], "length", { value: 1 }) && "ok")));
  // ⑥ 原型链上同名的格不受影响
  const proto: any = { a: 1 };
  const own: any = Object.create(proto);
  Object.defineProperty(own, "a", { value: 9 });
  console.log(show([own.a, proto.a].join(",")));
  // ⑦ 冻结 / 不可扩展之后
  console.log(show(err(() => { const o: any = Object.freeze({ a: 1 }); Object.defineProperty(o, "a", { value: 1 }); return "ok"; })));
  console.log(show(err(() => { const o: any = {}; Object.preventExtensions(o); Object.defineProperty(o, "a", { value: 1 }); return "ok"; })));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
