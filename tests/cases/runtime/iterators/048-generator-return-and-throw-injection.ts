// xl:title 生成器的 return() / throw() 注入与 finally 清理
// xl:round 790
// xl:judge stdout
// xl:end
// **按判定点并组（第 790 轮）**：吸收 runtime/iterators 里同判定点的 14 条用例
// （020-generator-return-forms · 005-gen-try-finally · 007-generator-return-early · 008-generator-throw-into-root · 015-generator-throw-into-r313 · 017-generator-early-return-cleanup · 024-generator-throw-into-frame · 028-generator-throw-catch · 029-generator-return-finally · 035-generator-throw-into · probe693b-g06 · probe694-g03 · probe694-g04 · probe694-g05）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// return() 的值与 finally 的次序、throw() 送进挂起点被体内 catch 接住、没接住的那一抛连 done 一起收尾

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 020-generator-return-forms.ts（第 336 轮）
(() => {
  function* plain() { yield 1; yield 2; }
  const a = plain();
  console.log(JSON.stringify(a.next()), JSON.stringify(a.return(7)), JSON.stringify(a.next()));
  function* withCatch() {
    try { yield 1; } catch (e) { console.log("caught", e); } finally { console.log("fin"); }
  }
  const b = withCatch();
  console.log(b.next().value, JSON.stringify(b.return(3)));
  function* nested() {
    try { try { yield 1; } finally { console.log("inner"); } } finally { console.log("outer"); }
  }
  const c = nested();
  console.log(c.next().value, JSON.stringify(c.return(5)));
  function* resumed() { try { yield 1; yield 2; } finally { console.log("clean"); } }
  const d = resumed();
  console.log(d.next().value, d.next().value, JSON.stringify(d.return(4)));
})();

// 吸收 005-gen-try-finally.ts
(() => {
  function* g(): any {
    try { yield 1; yield 2; } finally { console.log("cleanup"); }
  }
  const it = g();
  console.log(it.next().value, it.next().value, it.next().done);
  function* h(): any { try { yield 1; return "early"; } finally { console.log("h-cleanup"); } }
  const it2 = h();
  console.log(it2.next().value, it2.next().value);
})();

// 吸收 007-generator-return-early.ts
(() => {
  function* g() {
    try { yield 1; yield 2; } finally { console.log("cleanup"); }
  }
  const it = g();
  console.log(it.next().value);
  console.log(it.return(9).value, it.next().done);
})();

// 吸收 008-generator-throw-into-root.ts
(() => {
  function* g() {
    try { yield "a"; } catch (e: any) { yield "caught:" + e.message; }
    yield "end";
  }
  const it = g();
  console.log(it.next().value);
  console.log(it.throw(new Error("in")).value);
  console.log(it.next().value, it.next().done);
})();

// 吸收 015-generator-throw-into-r313.ts（第 313 轮）
(() => {
  function* g(): Generator<string, void, void> {
    try { yield "a"; } catch (e: any) { yield "caught:" + e.message; }
    yield "end";
  }
  const it: any = g();
  console.log(it.next().value);
  console.log(it.throw(new Error("in")).value);
  console.log(it.next().value, it.next().done);
  function* uncaught(): Generator<number, void, void> { yield 1; }
  const u: any = uncaught();
  console.log(u.next().value);
  try { u.throw(new Error("boom")); console.log("no throw"); } catch (e: any) { console.log("caught outside", e.message); }
  console.log(JSON.stringify(u.next()));
})();

// 吸收 017-generator-early-return-cleanup.ts（第 323 轮）
(() => {
  function* g() { try { yield 1; yield 2; } finally { console.log("cleanup"); } }
  const it = g();
  console.log(JSON.stringify(it.next()));
  console.log(JSON.stringify(it.return(9)));
  console.log(JSON.stringify(it.next()));
})();

// 吸收 024-generator-throw-into-frame.ts（第 7 轮）
(() => {
  function* g() {
    for (let i = 0; i < 3; i++) {
      try { yield i; } catch (e) { console.log("caught:" + (e as Error).message); }
    }
    return "done";
  }
  const it = g();
  console.log(JSON.stringify(it.next()));
  console.log(JSON.stringify(it.throw(new Error("boom"))));
  console.log(JSON.stringify(it.next()));
  console.log(JSON.stringify(it.next()));
})();

// 吸收 028-generator-throw-catch.ts（第 9 轮）
(() => {
  function* g() {
    try {
      yield 1;
      yield 2;
    } catch (e) {
      console.log("caught", e);
      yield 3;
    } finally {
      console.log("finally");
    }
    return "end";
  }
  const it = g();
  console.log(it.next());
  console.log(it.throw("boom"));
  console.log(it.next());
  console.log(it.next());
})();

// 吸收 029-generator-return-finally.ts（第 676 轮）
(() => {
  function* g() {
    try {
      yield 1;
      yield 2;
    } finally {
      console.log("cleanup");
    }
    return "done";
  }
  const it = g();
  console.log(it.next().value);
  console.log(JSON.stringify(it.return("early")));
  console.log(it.next().done);
})();

// 吸收 035-generator-throw-into.ts（第 691 轮）
(() => {
  function* gen(): any {
    try {
      yield 1;
    } catch (e: any) {
      console.log("caught", e.message);
    }
    yield 2;
  }
  const it: any = gen();
  console.log(it.next().value);
  console.log(it.throw(new Error("boom")).value);
  console.log(it.next().done);
})();

// 吸收 probe693b-g06.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { try { yield 1; } finally { } yield 2; } return [...g()].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g03.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { try { yield 1; } finally { } } const it = g(); it.next(); it.return(); return "ok"; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g04.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; yield 2; } const it = g(); return it.return(7).value; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe694-g05.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; } const it = g(); it.next(); return it.return(undefined).done; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
