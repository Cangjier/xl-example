// xl:title 属性描述符的默认值与冻结后的写
// xl:round 756
// xl:judge stdout
// xl:want differ
// xl:why **16 行里 15 行对、第 11 行是缺口**（第 756 轮量到的）——
// xl:why 那一行是**严格代码里写只读属性**：
// xl:why `"use strict"; o = {}; defineProperty(o, "a", { value: 1, writable: false });
// xl:why o.a = 2` 在 Node 里抛 **`TypeError`**、本仓**静默不写**（给 `"wrote"`）。
// xl:why **规范**（§10.1.9.2 `Set` 第 3.d 步）：「失败时，严格代码抛 `TypeError`」——
// xl:why `ir.xl.md` 的 `case SetProp` 那一行**本来就写着这一句**（「严格模式下的只读 /
// xl:why 不可扩展要抛 `TypeError`」），缺的是**写那一趟不知道「这一段是不是严格」**：
// xl:why 严格性今天只喂给「`this` 的绑法」（`vm.xl.md` 的 `DoCallValue` 读闭包的
// xl:why `IsStrict`），而 `set_prop` 那条算子的签名里**没有这一位**。
// xl:why **要收它得动引擎**（`rt.xl.md` 的 `SetPropertySearched` 那一支返回假之后，
// xl:why 由调用方按严格性决定抛不抛），而不是语言层一句话——
// xl:why **收尾轮不顺手动那一处**（它与 700+ 条语料的「松散模式静默失败」共用一条路）。
// xl:why **前 10 行与后 5 行**（描述符的默认值、冻结 / 密封、重新定义、不可扩展）全对，
// xl:why 所以这一条留着当守卫：谁动了严格性那条路，这里会红、逼着改。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; Object.defineProperty(o, "a", { value: 1 }); return JSON.stringify(Object.getOwnPropertyDescriptor(o, "a")); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; Object.defineProperty(o, "a", { get() { return 1; } }); return Object.keys(o).length; })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = Object.freeze({ a: 1 }); try { o.b = 2; return "wrote"; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = Object.freeze({ a: 1 }); return o.b; })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = Object.seal({ a: 1 }); delete o.a; return "a" in o; })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = Object.freeze({ a: 1 }); return Object.isFrozen(o); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = Object.freeze([1]); try { o[0] = 2; return "wrote"; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = Object.freeze([1]); return o[0]; })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = Object.freeze({ a: { b: 1 } }); o.a.b = 2; return o.a.b; })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; Object.defineProperty(o, "a", { value: 1, writable: false }); try { o.a = 2; return "wrote"; } catch (e) { return "throw"; } })()));
console.log('(function () { "use strict"; c', show(() => (function () { "use strict"; const o: any = {}; Object.defineProperty(o, "a", { value: 1, writable: false }); try { o.a = 2; return "wrote"; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; Object.defineProperty(o, "a", { value: 1, configurable: false }); try { Object.defineProperty(o, "a", { value: 2 }); return "redefined"; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; Object.preventExtensions(o); o.a = 1; return "a" in o; })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; Object.preventExtensions(o); try { Object.defineProperty(o, "a", { value: 1 }); return "defined"; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; Object.defineProperty(o, "a", { get() { return 1; }, configurable: true }); Object.defineProperty(o, "a", { value: 2 }); return o.a; })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; Object.defineProperty(o, "a", { get() { return 1; }, configurable: false }); try { Object.defineProperty(o, "a", { value: 2 }); return o.a; } catch (e) { return (e as Error).constructor.name; } })()));
