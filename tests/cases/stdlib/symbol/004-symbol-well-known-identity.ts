// xl:title 内建（well-known）符号：名字表与同一性（`iterator` / `asyncIterator` / `hasInstance` / `toStringTag` / `dispose` / `match` 那一族）
// xl:round 371
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 8 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/symbol/025-symbol-wellknown-forms.ts
//   · stdlib/symbol/031-symbol-dispose-known.ts
//   · stdlib/symbol/034-symbol-wellknown-identity.ts
//   · stdlib/symbol/036-names-symbol.ts
//   · stdlib/symbol/037-names-symbol-proto.ts
//   · stdlib/symbol/134-symbol-unscopables-and-spreadable.ts
//   · stdlib/symbol/135-symbol-regexp-protocol-names.ts
//   · stdlib/symbol/probe697-y10.ts
//
// 这个域里的块都是**同步**的（唯一一处异步生成器是单来源的 `010`，原样留在顶层），
// 所以块与块之间不需要排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是
// 各条 stdout 的**顺次相接**（第 800 轮用尺子逐字节核过）。

// —— 并入自 stdlib/symbol/025-symbol-wellknown-forms.ts ——
(function () {
  class Box {
    [Symbol.toPrimitive](hint: string) { return hint === "number" ? 1 : "box"; }
  }
  const b = new Box();
  console.log(b + "", +b as any, `${b}`, String(b));
  class Tag { get [Symbol.toStringTag]() { return "Tagged"; } }
  console.log(Object.prototype.toString.call(new Tag()));
  console.log(typeof Symbol.iterator, typeof Symbol.asyncIterator, typeof Symbol.hasInstance);
})();

// —— 并入自 stdlib/symbol/031-symbol-dispose-known.ts ——
(function () {
  console.log(typeof Symbol.dispose, typeof Symbol.asyncDispose);
  console.log(Symbol.dispose === Symbol.dispose, Symbol.asyncDispose === Symbol.asyncDispose);
  console.log(String(Symbol.dispose), Symbol.dispose.toString(), String(Symbol.asyncDispose));
})();

// —— 并入自 stdlib/symbol/034-symbol-wellknown-identity.ts ——
(function () {
  console.log(Symbol.iterator === Symbol.iterator, typeof Symbol.asyncIterator, typeof Symbol.hasInstance);
  console.log(Symbol.toPrimitive === Symbol["toPrimitive"], Symbol.match === Symbol.match);
})();

// —— 并入自 stdlib/symbol/036-names-symbol.ts ——
//  xl:why 第 678 轮登记时缺九格，第 690 轮补掉了八格：七个知名符号
//       （`isConcatSpreadable` / `unscopables` / `match` / `replace` / `search` /
//       `split` / `matchAll` 与 `length`——后两个在 `length` 那一行量的是 `number`）。
//       **第 754 轮把最后一格也补上了**：`Symbol.prototype` 现在是一个对象
//       （`Protos.Symbol`，`globals.xl.md` 的 `symbolObject` 上挂着这一格），
//       所以 `typeof (Symbol as any).prototype` 与 Node 一样给 `"object"`。
//       台账那一行已撤，用例留着当守卫（成员装上之后这里会红，逼着改）。
(function () {
  const b: any = Symbol;
  let v = "";
  v = "no";
  try {
    v = String(typeof b["isConcatSpreadable"]);
  } catch (err) {
  }
  console.log(typeof b, "isConcatSpreadable", v);
  v = "no";
  try {
    v = String(typeof b["length"]);
  } catch (err) {
  }
  console.log(typeof b, "length", v);
  v = "no";
  try {
    v = String(typeof b["match"]);
  } catch (err) {
  }
  console.log(typeof b, "match", v);
  v = "no";
  try {
    v = String(typeof b["matchAll"]);
  } catch (err) {
  }
  console.log(typeof b, "matchAll", v);
  v = "no";
  try {
    v = String(typeof b["prototype"]);
  } catch (err) {
  }
  console.log(typeof b, "prototype", v);
  v = "no";
  try {
    v = String(typeof b["replace"]);
  } catch (err) {
  }
  console.log(typeof b, "replace", v);
  v = "no";
  try {
    v = String(typeof b["search"]);
  } catch (err) {
  }
  console.log(typeof b, "search", v);
  v = "no";
  try {
    v = String(typeof b["split"]);
  } catch (err) {
  }
  console.log(typeof b, "split", v);
  v = "no";
  try {
    v = String(typeof b["unscopables"]);
  } catch (err) {
  }
  console.log(typeof b, "unscopables", v);
  console.log("缺", 9, "个名字");
})();

// —— 并入自 stdlib/symbol/037-names-symbol-proto.ts ——
//  xl:why **第 754 轮起这一条是「守卫」不再是「缺口」**：`Symbol.prototype` 那一格
//  xl:why 第 754 轮造出来了（`Protos.Symbol`，原来连对象都没有 ⇒ 取任何一格
//  xl:why 都是**响亮地抛**、整份脚本挂掉）。三个成员仍然没装（`constructor` /
//  xl:why `toString` / `valueOf`），所以 Node 给 `function` 的那几行与这里给
//  xl:why `undefined` 是**同一件事**：本仓按现状回答、不抛。台账那一行已撤，
//  xl:why 用例留着当守卫（成员装上之后这里会红，逼着改）。
(function () {
  const b: any = Symbol.prototype;
  let v = "";
  v = "no";
  try {
    v = String(typeof b["constructor"]);
  } catch (err) {
  }
  console.log(typeof b, "constructor", v);
  v = "no";
  try {
    v = String(typeof b["toString"]);
  } catch (err) {
  }
  console.log(typeof b, "toString", v);
  v = "no";
  try {
    v = String(typeof b["valueOf"]);
  } catch (err) {
  }
  console.log(typeof b, "valueOf", v);
  console.log("缺", 3, "个名字");
})();

// —— 并入自 stdlib/symbol/134-symbol-unscopables-and-spreadable.ts ——
//  xl:why 这两个知名符号与 `RegExp` 无关（一个是 `Array.prototype.concat` 的展开开关、
//       一个是 `with` 的作用域屏蔽表），第 690 轮之前**根本没装**：
//       `typeof Symbol.isConcatSpreadable` 给 `undefined`。
//       它们的**描述**按 JS 的写法给全名（`Symbol.isConcatSpreadable`），
//       而**同一格每次取都是同一个值**（知名符号只造一次）。
(function () {
  console.log(String(typeof (Symbol as any).isConcatSpreadable));
  console.log(String(typeof (Symbol as any).unscopables));
  console.log(String(Symbol.isConcatSpreadable));
  console.log(String(Symbol.unscopables));
  console.log(Symbol.isConcatSpreadable === Symbol.isConcatSpreadable);
})();

// —— 并入自 stdlib/symbol/135-symbol-regexp-protocol-names.ts ——
//  xl:why **名字与协议是两件事**：`Symbol.match` / `replace` / `search` / `split` / `matchAll`
//       在 JS 里**永远存在**（`typeof` 给 `"symbol"`），而用到它们的那几个方法
//       （`String.prototype.match` 那一族）与 `RegExp` 本身**仍是待做项**。
//       少了名字，`class C { [Symbol.match](s) { … } }` 当场报
//       「`set_hidden` 的键不是字符串也不是符号」——那句话离现场很远。
(function () {
  const names: string[] = ["match", "replace", "search", "split", "matchAll"];
  for (const n of names) console.log(n, String(typeof (Symbol as any)[n]));
  console.log(String(Symbol.match), Symbol.split === Symbol.split);
})();

// —— 并入自 stdlib/symbol/probe697-y10.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Symbol.asyncIterator === Symbol.asyncIterator));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
