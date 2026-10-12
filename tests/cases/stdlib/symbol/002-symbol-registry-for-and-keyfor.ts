// xl:title `Symbol.for` / `Symbol.keyFor` 的注册表：identity、键的取出、实参的强制转换
// xl:round 291
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 12 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/symbol/008-symbol-registry.ts
//   · stdlib/symbol/010-symbol-registry-and-wellknown.ts
//   · stdlib/symbol/013-symbol-registry-and-description-r291.ts
//   · stdlib/symbol/023-symbol-registry-and-description-r323.ts
//   · stdlib/symbol/024-symbol-registry-and-keys.ts
//   · stdlib/symbol/027-symbol-for-keyfor.ts
//   · stdlib/symbol/029-symbol-keyfor-description.ts
//   · stdlib/symbol/probe697-y05.ts
//   · stdlib/symbol/probe697-y06.ts
//   · stdlib/symbol/probe697-y07.ts
//   · stdlib/symbol/probe697-y20.ts
//   · stdlib/symbol/probe-y03.ts
//
// 这个域里的块都是**同步**的（唯一一处异步生成器是单来源的 `010`，原样留在顶层），
// 所以块与块之间不需要排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是
// 各条 stdout 的**顺次相接**（第 800 轮用尺子逐字节核过）。

// —— 并入自 stdlib/symbol/008-symbol-registry.ts ——
(function () {
  const a = Symbol.for("shared");
  const b = Symbol.for("shared");
  const c = Symbol("shared");
  console.log(a === b, a === c, Symbol.keyFor(a), Symbol.keyFor(c));
  console.log(typeof Symbol.keyFor(Symbol.for("x")), a.toString() === c.toString());
})();

// —— 并入自 stdlib/symbol/010-symbol-registry-and-wellknown.ts ——
(function () {
  console.log(Symbol.for("x") === Symbol.for("x"), Symbol.for("x") === Symbol("x"));
  console.log(Symbol.keyFor(Symbol.for("y")), Symbol.keyFor(Symbol("y")));
  console.log(typeof Symbol.iterator, typeof Symbol.asyncIterator, Symbol.iterator === Symbol.iterator);
  console.log(typeof Symbol.toPrimitive, typeof Symbol.hasInstance, typeof Symbol.toStringTag);
})();

// —— 并入自 stdlib/symbol/013-symbol-registry-and-description-r291.ts ——
(function () {
  const a = Symbol("k");
  const b = Symbol.for("shared");
  console.log(a.description, typeof a, Symbol.keyFor(b), Symbol.keyFor(a));
  console.log(Symbol.for("shared") === b, String(a) === "Symbol(k)");
})();

// —— 并入自 stdlib/symbol/023-symbol-registry-and-description-r323.ts ——
(function () {
  const s = Symbol.for("k");
  console.log(Symbol.keyFor(s), s.description, Symbol.for("k") === s);
  console.log(Symbol.iterator.description, typeof Symbol.asyncIterator, Symbol("x").description);
})();

// —— 并入自 stdlib/symbol/024-symbol-registry-and-keys.ts ——
(function () {
  const a = Symbol.for("k");
  const b = Symbol.for("k");
  console.log(a === b, Symbol.keyFor(a), Symbol("k") === Symbol("k"), Symbol.keyFor(Symbol("k")));
  const o: any = {};
  o[a] = 1;
  o["k"] = 2;
  console.log(o[a], o["k"], JSON.stringify(o), Object.keys(o).join(","));
  console.log(Symbol.for("k").toString(), a.description);
})();

// —— 并入自 stdlib/symbol/027-symbol-for-keyfor.ts ——
(function () {
  const s = Symbol.for("k");
  console.log(Symbol.keyFor(s), Symbol.for("k") === s, Symbol.keyFor(Symbol("z")));
  console.log(Symbol("d").description, String(Symbol("d")), Symbol("d").toString());
})();

// —— 并入自 stdlib/symbol/029-symbol-keyfor-description.ts ——
(function () {
  const g = Symbol.for("shared");
  console.log(Symbol.keyFor(g), g.description, Symbol.for("shared") === g);
  console.log(Symbol.keyFor(Symbol("local")), Symbol("local").description);
  const s = Symbol();
  console.log(s.description, String(s));
})();

// —— 并入自 stdlib/symbol/probe697-y05.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Symbol.for("k") === Symbol.for("k")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y06.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Symbol.keyFor(Symbol.for("k"))));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y07.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Symbol.keyFor(Symbol("k"))));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe697-y20.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Symbol.for(1) === Symbol.for("1")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// —— 并入自 stdlib/symbol/probe-y03.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show(Symbol.keyFor(Symbol.for("y"))));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
