// xl:title 严格模式下的 `delete`：不可配置那一格要抛 `TypeError`
// xl:round 783
// xl:judge stdout
// xl:end
// **第 892 轮收掉**（台账撤掉、留作守卫）：严格性是**编译期已知**的，降级层把它写死成
// `del_prop` 的第三个实参（`InStrict`：类体 / 函数体自己的指令序言 / 沿词法继承），
// 引擎那边「删不掉且严格 ⇒ 抛 `TypeError`」收在一条 `deleteOrThrow` 里
//（原始值那一支与对象那一支都过它）。
// **同一个根的另一半是「箭头的指令序言也算严格代码」**：`IsStrict` 从这一轮起多了一个读处
//（`delete`），所以 `(() => { "use strict"; … })` 那一格必须置真——而「没有接收者时
// `this` 给谁」那一问**不认它**（借 `HeapClosure.IsArrow` 在调用点挡掉，否则
// `exec/functions/120-strict-mode-and-module-this` 第 6 档会从 `"object"` 掉成 `"undefined"`）。
// 下面那一段是**收之前记的账**（一字未改），留作「这一条在测什么」的说明。
//
// xl:why 第 783 轮量到的：`"use strict"` 下 `delete` 一个**不可配置**的属性在 JS 里抛
// xl:why `TypeError`（规范 §13.5.1.2：`delete` 的结果是假时，严格代码抛），
// xl:why 本仓**一声不响地真删掉**——四个出口同一处根：
// xl:why ① `defineProperty(o,"a",{configurable:false})` 之后 `delete o.a`
// xl:why （Node 抛、本仓给 `1`，值还在？**不**——本仓把那一格删了才算「不响」）；
// xl:why ② 函数的 `prototype`（自有、**不可配置**）：`delete f.prototype` 本仓给 `undefined`；
// xl:why ③ `Object.freeze({b:1})` 之后 `delete frozen.b`；
// xl:why ④ 数组的 `length`（自有、不可配置）；
// xl:why ⑤ 原型上不可配置的**访问器**（`Object.create` 出来的 disposable，见正文第 05 档）。
// xl:why 与**写**那一档（`tests/cases/runtime/round756/r756c-02` 登的「严格模式下写只读属性」）
// xl:why 是**同一条根的两半**：写那一半 `SetPropertySearched` 返回假之后由调用方按严格性决定抛不抛，
// xl:why **删**这一半是 `DeleteProperty` 那一支自己就返回了真、严格位根本没参与判定。
// xl:why 今天严格性只喂给「`this` 的绑法」，`delete` 的算子里没有这一位。
// xl:why **不许被带偏的那一半**：松散模式下同样四档都要**静默**（不抛），
// xl:why 以及「可配置的那一格 / 不存在的名字」在两种模式下都得照旧给真。
// xl:why **这一条不许再去借共享的全局对象当靶子** ✗（第 05 档原来写的是
// xl:why `delete Object.prototype.toString` ✓）：它是不可配置的现成例子 ✓，但本仓的 `delete`
// xl:why **真的会把它删掉** ✗ ⇒ 同一批里后面每一条用例都跟着坏（实测 5 条 `bad`，
// xl:why 症状是 `Cannot read properties of undefined (reading 'call')` 与
// xl:why `Cannot convert object to primitive value`），而投毒者自己报的是 `pass` ✗。
// xl:why **要测「不可配置」就自己造一个**：`Object.freeze` 一个 disposable 的原型即可 ✓。
// xl:end

const show = (label: string, f: () => any): void => {
  try {
    const v = f();
    console.log(label + " = ok:" + String(v));
  } catch (e) {
    console.log(label + " = throw:" + ((e as any) && (e as any).constructor ? (e as any).constructor.name : "?"));
  }
};

// —— 严格模式：该抛的四档 ——
show("01 strict non-configurable prop", () => {
  "use strict";
  const o: any = {};
  Object.defineProperty(o, "a", { value: 1, configurable: false });
  return delete o.a;
});
show("02 strict function prototype", () => {
  "use strict";
  function f(this: any) { }
  return delete (f as any).prototype;
});
show("03 strict frozen prop", () => {
  "use strict";
  const o: any = Object.freeze({ b: 1 });
  return delete o.b;
});
show("04 strict array length", () => {
  "use strict";
  return delete ([] as any).length;
});
show("05 strict non-configurable on a prototype", () => {
  "use strict";
  // **这一档原来是 `delete Object.prototype.toString`** ✗——那是**共享的全局对象**，
  // 而本仓的 `delete` 不抛 ⇒ 这一格被**真删掉**，同一批里后面每一条用例都跟着遭殃
  // （症状是 `Cannot read properties of undefined (reading 'call')` 与
  // `Cannot convert object to primitive value`，离现场很远 ✗）。
  // 规则本身（严格代码里 delete 不可配置属性要抛 `TypeError`）**不需要借全局对象** ✗：
  // 造一个 disposable 的原型、把它冻上，测到的是同一条规则 ✓，而离开这条用例不留痕迹 ✓。
  const proto: any = Object.freeze({ toString() { return "x"; } });
  const o: any = Object.create(proto);
  return delete o.toString;
});

// —— 严格模式下**不该抛**的两档 ——
show("11 strict configurable prop", () => {
  "use strict";
  const o: any = { a: 1 };
  return delete o.a;
});
show("12 strict missing name", () => {
  "use strict";
  const o: any = {};
  return delete o.a;
});

// —— 松散模式：同样四档都要**静默**（不抛） ——
show("21 sloppy non-configurable prop", () => {
  const o: any = {};
  Object.defineProperty(o, "a", { value: 1, configurable: false });
  return [delete o.a, o.a].join("/");
});
show("22 sloppy function prototype", () => {
  function f(this: any) { }
  return [delete (f as any).prototype, typeof (f as any).prototype].join("/");
});
show("23 sloppy frozen prop", () => {
  const o: any = Object.freeze({ b: 1 });
  return [delete o.b, o.b].join("/");
});
show("24 sloppy configurable prop", () => {
  const o: any = { a: 1 };
  return [delete o.a, "a" in o].join("/");
});
