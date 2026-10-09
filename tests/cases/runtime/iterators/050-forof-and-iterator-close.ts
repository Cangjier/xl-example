// xl:title for..of 与迭代器关闭：提前 break / return / 抛出都会调迭代器的 return()
// xl:round 790
// xl:judge stdout
// xl:end
// **按判定点并组（第 790 轮）**：吸收 runtime/iterators 里同判定点的 7 条用例
// （012-generator-early-break-finally · 026-generator-return-in-forof-finally · 031-generator-return-in-forof · 034-generator-return-close · 038-forof-destructuring · 041-iterator-close-on-throw · probe694-g08）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 提前退出时生成器的 finally 照跑、自定义迭代器的 return() 被调用、循环里的解构

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 012-generator-early-break-finally.ts（第 304 轮）
(() => {
  function* gen() {
    try {
      yield 1;
      yield 2;
    } finally {
      console.log("cleanup");
    }
  }
  for (const v of gen()) {
    console.log("got", v);
    break;
  }
})();

// 吸收 026-generator-return-in-forof-finally.ts（第 7 轮）
(() => {
  const log: string[] = [];
  function* gen() {
    try {
      yield 1;
      yield 2;
    } finally {
      log.push("closed");
    }
  }
  function take() {
    for (const v of gen()) {
      log.push("v" + v);
      if (v === 1) return "early";
    }
    return "full";
  }
  console.log(take(), log.join(","));
})();

// 吸收 031-generator-return-in-forof.ts（第 682 轮）
(() => {
  const seen: string[] = [];
  function* g3() { try { yield 1; yield 2; yield 3; } finally { seen.push('cleanup'); } }
  for (const v of g3()) { seen.push('v' + v); if (v === 2) break; }
  try { console.log("trace", String(seen.join(','))); } catch (e) { console.log("trace", "ERR", String(e && e.name)); }
})();

// 吸收 034-generator-return-close.ts（第 691 轮）
(() => {
  function* gen(): any {
    try {
      yield 1;
      yield 2;
      yield 3;
    } finally {
      console.log("cleanup");
    }
  }
  for (const v of gen()) {
    console.log("v", v);
    if (v === 2) break;
  }
})();

// 吸收 038-forof-destructuring.ts（第 691 轮）
(() => {
  const m: any = new Map<any, any>([["a", 1], ["b", 2]]);
  for (const [k, v] of m) console.log(k, v);
  for (const [i, ch] of (["x", "y"] as any).entries()) console.log(i, ch);
})();

// 吸收 041-iterator-close-on-throw.ts（第 691 轮）
(() => {
  const it: any = {
    i: 0,
    next() { this.i++; return this.i <= 3 ? { value: this.i, done: false } : { value: undefined, done: true }; },
    return() { console.log("closed"); return { value: undefined, done: true }; },
    [Symbol.iterator]() { return this; },
  };
  try {
    for (const v of it) { console.log("v", v); if (v === 2) throw new Error("stop"); }
  } catch (e: any) { console.log("caught", e.message); }
})();

// 吸收 probe694-g08.ts（第 694 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { function* g() { yield 1; yield 2; } const out = []; for (const v of g()) { out.push(v); if (v === 1) break; } return out.join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
