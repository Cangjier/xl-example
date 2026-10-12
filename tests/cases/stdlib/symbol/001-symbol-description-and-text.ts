// xl:title 符号的描述与文本形态：`description` / `toString` / `String(s)` / `typeof` / 唯一性
// xl:round 9
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 19 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/symbol/005-symbol-description.ts
//   · stdlib/symbol/006-symbol-string-of-symbol.ts
//   · stdlib/symbol/009-symbol-description-and-tostring.ts
//   · stdlib/symbol/012-symbol-tostring-and-primitive.ts
//   · stdlib/symbol/016-symbol-description-forms.ts
//   · stdlib/symbol/033-symbol-description-and-keyfor.ts
//   · stdlib/symbol/035-symbol-description-and-registry.ts
//   · stdlib/symbol/137-symbol-description.ts
//   · stdlib/symbol/138-symbol-description.ts
//   · stdlib/symbol/139-typeof-symbol-iterator.ts
//   · stdlib/symbol/probe697-y01.ts
//   · stdlib/symbol/probe697-y02.ts
//   · stdlib/symbol/probe697-y09.ts
//   · stdlib/symbol/probe697-y18.ts
//   · stdlib/symbol/probe-y02.ts
//   · stdlib/symbol/probe-y05.ts
//   · stdlib/symbol/probe-y07.ts
//   · stdlib/symbol/p-sym-tostring.ts
//   · stdlib/symbol/p-sym-unique.ts
//
// 这个域里的块都是**同步**的（唯一一处异步生成器是单来源的 `010`，原样留在顶层），
// 所以块与块之间不需要排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是
// 各条 stdout 的**顺次相接**（第 800 轮用尺子逐字节核过）。

// —— 并入自 stdlib/symbol/005-symbol-description.ts ——
(function () {
  const s1 = Symbol("tag");
  const s2 = Symbol("tag");
  console.log(s1 === s2, String(s1.description));
  const o: any = {};
  o[s1] = 1;
  console.log(o[s1], Object.keys(o).length);
})();

// —— 并入自 stdlib/symbol/006-symbol-string-of-symbol.ts ——
(function () {
  console.log(String(Symbol.iterator) === "Symbol(Symbol.iterator)");
  console.log(String(Symbol("s")), String(Symbol()), String(Symbol.iterator).length > 0);
})();

// —— 并入自 stdlib/symbol/009-symbol-description-and-tostring.ts ——
(function () {
  const a = Symbol("d");
  const b = Symbol("d");
  console.log(a === b, a.description, String(a), a.toString() === String(a));
  const key = Symbol("k");
  const o: any = { [key]: 1, plain: 2 };
  console.log(o[key], Object.keys(o).join(","), Object.getOwnPropertySymbols(o).length);
})();

// —— 并入自 stdlib/symbol/012-symbol-tostring-and-primitive.ts ——
(function () {
  const s = Symbol("desc");
  console.log(s.description, s.toString(), String(s), typeof s);
  console.log(Symbol().description);
})();

// —— 并入自 stdlib/symbol/016-symbol-description-forms.ts ——
(function () {
  const a = Symbol("desc");
  const b = Symbol();
  console.log(a.description, b.description, a.toString(), String(a).length > 0);
  console.log(Symbol.for("x") === Symbol.for("x"), Symbol.keyFor(Symbol.for("x")), Symbol.keyFor(a));
})();

// —— 并入自 stdlib/symbol/033-symbol-description-and-keyfor.ts ——
(function () {
  const a = Symbol("x");
  const b = Symbol();
  const c = Symbol.for("reg");
  console.log(a.description, b.description, c.description, Symbol.keyFor(c), Symbol.keyFor(a));
  console.log(Symbol.for("reg") === c, Symbol("reg") === a, typeof a);
})();

// —— 并入自 stdlib/symbol/035-symbol-description-and-registry.ts ——
(function () {
  const s = Symbol("k");
  const o: any = { [s]: 1, plain: 2 };
  console.log(s.description, typeof s, Object.keys(o).join(","));
  console.log(Symbol.for("x") === Symbol.for("x"), Symbol.keyFor(Symbol.for("x")));
  console.log(Object.getOwnPropertySymbols(o).length, o[s]);
})();

// —— 并入自 stdlib/symbol/137-symbol-description.ts ——
(function () {
  const s: any = Symbol("d");
  console.log(s.description, s.toString(), typeof s);
  console.log(Symbol().description, Symbol.for("a") === Symbol.for("a"));
  console.log(typeof Symbol.keyFor(Symbol("x")));
})();

// —— 并入自 stdlib/symbol/138-symbol-description.ts ——
(function () {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · stdlib/symbol/probe-y01.ts
  //   · stdlib/symbol/probe697-y04.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Symbol().description));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/139-typeof-symbol-iterator.ts ——
(function () {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · stdlib/symbol/probe-y04.ts
  //   · stdlib/symbol/probe697-y08.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof Symbol.iterator));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y01.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof Symbol("x")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y02.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Symbol("x").description));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y09.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(String(Symbol.iterator)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y18.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(typeof Symbol() === "symbol"));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe-y02.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Symbol.for("x").description));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe-y05.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Symbol.iterator.toString()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe-y07.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(String(Symbol("a"))));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/p-sym-tostring.ts ——
(function () {
  const s = Symbol("x");
  console.log(s.toString(), String(s), typeof s, s.description);
})();

// —— 并入自 stdlib/symbol/p-sym-unique.ts ——
(function () {
  console.log(Symbol("a") === Symbol("a"), Symbol.for("b") === Symbol.for("b"));
})();
