// xl:title 逻辑链（`&&` / `||` / `??`）的位置与短路：前后缀词、实参 / 下标 / 模板、`yield`
// xl:round 738
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：吸收同域十条**同步**原子探针 `p738a-a01` · `a03` · `a04` ·
// `a05` · `a08` · `a09` · `a11` · `a12` · `a13` · `a15`，
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**逻辑链作为一个语法单元的边界与求值次序**——它紧跟 `yield` / `return` /
// `throw` / `typeof` / `void` / `!` / `delete` 时吃哪一段、套在括号 / 实参 / 下标 / 模板插值里
// 时短路从左到右、`??` 与 `||` 并排与逻辑赋值、两侧是调用 / 三元 / 一元时的结合性。
// **另外三块不能进这个壳，各留一条（只改名）**：
//   · `002-logical-chain-with-await` —— 带 `await` 的那四条要排空壳；
//   · `003-yield-logical-chain-evaluation-order` · `004-yield-logical-chain-tail` ——
//     这两条是「生成器 + 手动 `next()`」，第 798 轮起就实测过**生成器那一族进不了合并壳**
//     （放进块里会静默丢输出），所以一条都不并。
{
  // a01 · `yield` 后面跟逻辑运算符（`&&` / `||` / `??`）
  function* g() { yield 1 && 2; yield 0 || 3; yield null ?? 4; }
  console.log([...g()].join(","));
}

{
  // a03 · `return` / `throw` 后面跟逻辑运算符
  function f(x: any) { return x && 1; }
  console.log(f(1), f(0));
  function g(x: any) { throw x || new Error("m"); }
  try { g(0); } catch (e: any) { console.log("caught", e.message); }
  try { g(new TypeError("t")); } catch (e: any) { console.log("caught", e.constructor.name); }
}

{
  // a04 · `typeof` / `void` / `!` / `delete` 后面跟逻辑运算符
  const o: any = { a: 1, b: 2 };
  console.log(typeof o.a && "T", typeof o.zzz || "F");
  console.log(void 0 || "V", !o.a && "N");
  console.log(delete o.a && "D", JSON.stringify(o));
  console.log((typeof o.b) && "P", !(o.b) || "Q");
}

{
  // a05 · 逻辑链套在括号 / 实参 / 三元里
  function f(v: any) { return "f:" + v; }
  console.log(f(1 && 2), f(0 || 3), f(null ?? 4));
  console.log((1 && 2) || 3, 1 && (2 || 3), (1 || 2) && 3);
  console.log(1 && 2 ? "a" : "b", 0 || 3 ? "c" : "d");
  console.log([1 && 2, 0 || 3].join(","), { v: 1 && 5 }.v);
}

{
  // a08 · `??` 与 `||` 并排（不许混用要加括号那一条）
  const a: any = 0;
  const b: any = null;
  console.log((a ?? 1) || 2, a || (b ?? 3), (b ?? 0) && 4);
  console.log(a ?? (b || 9), (a && b) ?? 7);
}

{
  // a09 · 逻辑赋值与逻辑运算符并排
  const o: any = { a: 0, b: 1 };
  o.a ||= 5;
  o.b &&= 7;
  o.c ??= 9;
  console.log(o.a, o.b, o.c);
  let x: any = 0;
  x ||= 1 && 2;
  console.log(x);
}

{
  // a11 · `yield*` 后面跟逻辑链（委托与括号两种排版）
  function* inner() { yield 1; yield 2; }
  function* outer() { yield* inner(); yield* (inner() as any); }
  console.log([...outer()].join(","));
  function* nums() { yield 3; }
  function* pick() { const v = yield* nums() as any; yield v; }
  console.log(JSON.stringify([...pick()].join(",")));
}

{
  // a12 · `throw` 后面跟 `&&` / `||` / `??` 与嵌套链
  function f(x: any) { throw x && new Error("a"); }
  function g(x: any) { throw x ?? new Error("b"); }
  function h(x: any) { throw (x || 1) && new Error("c"); }
  for (const fn of [f, g, h]) {
    try { fn(0); console.log("no-throw"); } catch (e: any) { console.log(e.message); }
  }
}

{
  // a13 · 逻辑链落在**实参 / 下标 / 模板插值**里（短路次序）
  const log: string[] = [];
  const s = (t: string, v: any) => { log.push(t); return v; };
  function f(...xs: any[]) { return xs.join("|"); }
  console.log(f(s("a", 0) && s("b", 1), s("c", 1) || s("d", 2)));
  const o: any = { k: 7 };
  console.log(o[s("e", "k") ?? "z"], [s("f", 0) || 5].length);
  console.log("t=" + (s("g", 1) && "yes"));
  console.log(log.join(","));
}

{
  // a15 · 逻辑链两侧是**调用 / 三元 / 一元**时的结合性
  const f = (v: any) => v;
  console.log(f(0) || f(1) && f(2), (f(0) || f(1)) && f(2));
  console.log(!f(0) && !f(1), typeof f && "s", void 0 ?? "v");
  console.log((1 ? 0 : 1) || (0 ? 2 : 3), -1 && +2);
}
