// xl:title 生成器的 yield 与 next() 协议：产出的值、done 的时序、双向传值与耗尽
// xl:round 790
// xl:judge stdout
// xl:end
// **按判定点并组（第 790 轮）**：吸收 runtime/iterators 里同判定点的 25 条用例
// （001-gen-basics · 006-generator-return · 013-generator-exhausted-next · 042-function-function-g-return-g-next-done · 004-gen-lazy-and-state · 022-generator-closure · 009-generator-next-sends-value · 010-generator-next-arg-ignored-first · 011-generator-forms-r291 · 014-generator-next-two-way · 018-generator-send-and-return · 019-generator-two-way-communication · 045-generator-yield-receive · 021-generator-forms-r371 · 036-generator-return-value · probe693b-g01 · probe693b-g02 · probe693b-g03 · probe693b-g07 · probe693b-g09 · probe693b-g10 · probe693b-g24 · probe694-g25 · probe694-g26 · probe705-i-c05）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// yield 的先后、next(v) 送进去的值落在上一格、耗尽之后恒为 done、惰性与闭包状态

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 001-gen-basics.ts
(() => {
  function* g() {
    yield 1;
    yield 2;
    return "done";
  }
  const it = g();
  console.log(it.next().value, it.next().value, it.next().value, it.next().done);
})();

// 吸收 006-generator-return.ts
(() => {
  function* g(): any { yield 1; yield 2; return "end"; }
  const it = g();
  const a = it.next();
  const b = it.next();
  const c = it.next();
  const d = it.next();
  console.log(a.value, a.done, b.value, b.done, c.value, c.done, d.done);
  console.log([...g()].join(","));
})();

// 吸收 013-generator-exhausted-next.ts（第 305 轮）
(() => {
  function* g() { yield 1; }
  const it = g();
  console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
})();

// 吸收 042-function-function-g-return-g-next-done.ts（第 693 轮）
(() => {
  // **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
  //   · runtime/iterators/probe693b-g11.ts
  //   · runtime/iterators/probe695-g08.ts
  // 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
  // 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { } return g().next().done; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 004-gen-lazy-and-state.ts
(() => {
  const log: string[] = [];
  function* g(): any { log.push("start"); yield 1; log.push("mid"); yield 2; log.push("end"); }
  const it = g();
  console.log(log.length, it.next().value, log.join(","));
  console.log(it.next().value, log.join(","));
  console.log(it.next().done, log.join(","));
})();

// 吸收 022-generator-closure.ts（第 623 轮）
(() => {
  function make() {
    let n = 0;
    return function* () { while (true) { n += 1; yield n; } };
  }
  const it = make()();
  console.log(it.next().value, it.next().value, it.next().value);
})();

// 吸收 009-generator-next-sends-value.ts
(() => {
  function* g() {
    const a = yield 1;
    const b = yield a + 1;
    return a + b;
  }
  const it = g();
  console.log(JSON.stringify(it.next()));
  console.log(JSON.stringify(it.next(10)));
  console.log(JSON.stringify(it.next(20)));
})();

// 吸收 010-generator-next-arg-ignored-first.ts
(() => {
  function* g() {
    const a = yield "start";
    console.log("got", a);
  }
  const it = g();
  console.log(JSON.stringify(it.next(99)));
  console.log(JSON.stringify(it.next(7)));
})();

// 吸收 011-generator-forms-r291.ts（第 291 轮）
(() => {
  function* gen() { const x = yield 1; yield x * 2; }
  const g = gen();
  console.log(JSON.stringify(g.next()), JSON.stringify(g.next(5)), JSON.stringify(g.next()));
})();

// 吸收 014-generator-next-two-way.ts（第 312 轮）
(() => {
  function* talk(): Generator<string, string, number> {
    const first = yield "ask";
    const second = yield "echo:" + first;
    return "done:" + second;
  }
  const it: any = talk();
  console.log(it.next(1).value);
  console.log(it.next(10).value);
  console.log(JSON.stringify(it.next(20)));
  const plain: any = (function* () { const got = yield 1; yield got * 2; })();
  plain.next();
  console.log(plain.next(21).value);
})();

// 吸收 018-generator-send-and-return.ts（第 330 轮）
(() => {
  function* counter(): Generator<number, string, number> {
    let total = 0;
    for (let i = 0; i < 3; i++) {
      const sent: number = yield total;
      total = total + (sent ?? 1);
    }
    return "sum=" + total;
  }
  const it = counter();
  console.log(JSON.stringify(it.next()));
  console.log(JSON.stringify(it.next(10)));
  console.log(JSON.stringify(it.next(20)));
  console.log(JSON.stringify(it.next(30)));
})();

// 吸收 019-generator-two-way-communication.ts（第 331 轮）
(() => {
  function* accumulate(): Generator<number, number, number> {
    let total = 0;
    for (let i = 0; i < 3; i++) {
      const sent: number = yield total;
      total = total + sent;
    }
    return total;
  }
  const it = accumulate();
  console.log(JSON.stringify(it.next()));
  console.log(JSON.stringify(it.next(5)));
  console.log(JSON.stringify(it.next(10)));
  console.log(JSON.stringify(it.next(100)));
})();

// 吸收 045-generator-yield-receive.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { const x = yield 1; return x; } const it = g(); it.next(); return it.next(5).value; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 021-generator-forms-r371.ts（第 371 轮）
(() => {
  function* twoWay() {
    const a = yield 1;
    const b = yield a + 1;
    return a + b;
  }
  const g = twoWay();
  console.log(JSON.stringify(g.next()), JSON.stringify(g.next(10)), JSON.stringify(g.next(20)));
  function* inner() { yield "i1"; yield "i2"; }
  function* outer() { yield "o1"; yield* inner(); yield "o2"; }
  console.log([...outer()].join(","));
  function* withReturn() { try { yield 1; yield 2; } finally { console.log("gen-finally"); } }
  const h = withReturn();
  console.log(JSON.stringify(h.next()), JSON.stringify(h.return(9)));
  function* catcher() { try { yield 1; } catch (e) { console.log("caught", (e as Error).message); } }
  const k = catcher();
  k.next();
  k.throw(new Error("into"));
  console.log([...k].length);
})();

// 吸收 036-generator-return-value.ts（第 691 轮）
(() => {
  function* gen(): any { yield 1; yield 2; }
  const it: any = gen();
  console.log(it.next().value);
  console.log(JSON.stringify(it.return(9)));
  console.log(JSON.stringify(it.next()));
})();

// 吸收 probe693b-g01.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; yield 2; } return [...g()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g02.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } const it = g(); return it.next().value; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g03.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } const it = g(); it.next(); return it.next().done; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g07.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; yield 2; } const it = g(); it.next(); return it.return(9).done; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g09.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } return g().next().value; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g10.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { let i = 0; while (i < 3) yield i++; } return [...g()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe693b-g24.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { for (const v of [1, 2]) yield v; } return [...g()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g25.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { return 5; } return g().next().value; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g26.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { return 5; } return g().next().done; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe705-i-c05.ts（第 705 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function* () { yield 1; })().next().value));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
