// xl:title 访问器描述符 / `Object.create` 的原型链 / `Object.hasOwn`·`is`·`getPrototypeOf` 的边角 / 冻结之后
// xl:round 736
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：吸收同域四条原子探针 `p736b-b09` · `b10` · `b13` · `b14`，
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**`Object` 那几格静态方法的语义与冻结之后的收场**——
// `defineProperty` 装访问器之后描述符里有什么、`Object.create` 带描述符时原型链怎么接、
// `hasOwn` / `is`（`-0` 与 `NaN`）/ `getPrototypeOf`（原始值与 `null`）、
// 以及冻结之后 `defineProperty` / `setPrototypeOf` / `delete` 各是静默还是抛。
{
  // b09 · `Object.defineProperty` 的访问器与描述符形状
  const o: any = {};
  let stored = 1;
  Object.defineProperty(o, "a", { get() { return stored; }, set(v: any) { stored = v * 2; }, enumerable: true, configurable: true });
  o.a = 5;
  console.log(o.a, JSON.stringify(Object.getOwnPropertyDescriptor(o, "a"), ["get", "set", "enumerable", "configurable"] as any));
  console.log(Object.keys(o).join(","), typeof Object.getOwnPropertyDescriptor(o, "a").get);
}

{
  // b10 · `Object.create(proto, descriptors)` 与原型链
  const proto = { m() { return "p"; } };
  const o = Object.create(proto, { a: { value: 1, enumerable: true } });
  console.log(o.a, o.m(), Object.getPrototypeOf(o) === proto, Object.keys(o).join(","));
  console.log("m" in o, o.hasOwnProperty("m"), Object.getPrototypeOf(Object.create(null)) === null);
}

{
  // b13 · `Object.hasOwn` / `Object.is` / `Object.getPrototypeOf` 的边角
  console.log(Object.hasOwn({ a: 1 }, "a"), Object.hasOwn({}, "toString"));
  console.log(Object.is(-0, 0), Object.is(NaN, NaN), Object.is(1, 1));
  console.log(Object.getPrototypeOf([]) === Array.prototype, Object.getPrototypeOf("s") === String.prototype);
  try { console.log(Object.getPrototypeOf(null)); } catch (e: any) { console.log("throw", e.constructor.name); }
}

{
  // b14 · 冻结之后 `defineProperty` / `setPrototypeOf` / `delete` 的静默与抛
  const o: any = Object.freeze({ a: 1 });
  try { console.log(Object.defineProperty(o, "a", { value: 2 }).a); } catch (e: any) { console.log("dp-throw", e.constructor.name); }
  try { Object.setPrototypeOf(o, { b: 2 }); console.log("sp-ok"); } catch (e: any) { console.log("sp-throw", e.constructor.name); }
  console.log(delete o.a, o.a, Object.isFrozen(o));
}
