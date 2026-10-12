// xl:title 展开的六种位置与来路：实参、内建与方法的接收者、数组字面量、构造与 `call` / `bind`
// xl:round 724
// xl:judge stdout
// xl:end
// **按判定点并组（第 802 轮）**：吸收同域逐条一问的六条原子探针
// `p724a-a01` … `p724a-a06`，正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**展开（spread）落在各种位置上时解析与求值都对**——
// 实参位的 `...x` 与 `...x as T`（含 `satisfies` 与括号化）、内建与对象方法的接收者、
// 数组字面量里的元素、`new` 与 `call` / `apply` / `bind` 的实参、
// 以及展开的来路（标识符 / 数组字面量 / 字符串 / `Set` / 生成器 / 迭代器）。
{
  // a01 · 展开实参 + `as`：首位那一格（第 724 轮收掉的根）
  const xs: any = [1, 2, 3];
  function rest(...a: any[]) { return "rest " + a.length + ":" + a.join("|"); }
  function fixed(a: any, b: any, c: any) { return "fixed " + a + ":" + b + ":" + c; }
  function mixed(a: any, ...r: any[]) { return "mixed " + a + ":" + r.length + ":" + r.join("|"); }
  console.log(rest(...xs));
  console.log(rest(...[1, 2, 3] as any));
  console.log(fixed(...[1, 2, 3] as any));
  console.log(mixed(...[1, 2, 3] as any));
  console.log(mixed(...xs as any));
  console.log(rest(1, ...xs));
}

{
  // a02 · 展开实参 + `as` 落在内建与方法的接收者上
  const xs: any = [1, 2, 3];
  console.log(Math.max(...[1, 5, 3] as any));
  console.log(Math.max(...xs as any));
  const o: any = { m(...a: any[]) { return a.length + ":" + a.join("|"); }, f(a: any, b: any) { return a + ":" + b; } };
  console.log(o.m(...[1, 2] as any));
  console.log(o.m(...xs as any));
  console.log(o.f(...[1, 2] as any));
  const arrow = (...a: any[]) => a.join("|");
  console.log(arrow(...[1, 2] as any));
  console.log((new Set([1, 2]) as any).size, [...new Set([1, 2])].join("|"));
}

{
  // a03 · `satisfies` 与括号化那一档：同一件事的两种排版
  const xs: any = [1, 2, 3];
  function f(...a: any[]) { return a.length + ":" + a.join("|"); }
  console.log(f(...xs satisfies any));
  console.log(f(...([1, 2, 3] as any)));
  console.log(f(...([1, 2] satisfies any)));
  console.log(f(...(xs as any)));
  console.log(f(...(xs as any).slice(0, 2)));
}

{
  // a04 · 数组字面量元素上的 `...x as T`
  const xs: any = [1, 2, 3];
  console.log([...xs as any].join("|"));
  console.log([...([1, 2] as any)].join("|"));
  console.log([0, ...xs as any].length);
  console.log([...xs as any, 9].join("|"));
}

{
  // a05 · `new` / `call` / `apply` / `bind` 上的展开实参
  class A { a: number; b: number; constructor(a: number, b: number) { this.a = a; this.b = b; } }
  const made: any = new (A as any)(...[1, 2] as any);
  console.log(made.a, made.b);
  function g(a: number, ...rest: any[]) { return a + "/" + rest.join("-"); }
  console.log(g.call(null, ...([1, 2, 3] as any)));
  console.log(g.apply(null, [1, 2, 3] as any));
  console.log(g.call(null, 1, ...[2, 3] as any));
  console.log(g.bind(null, ...([1, 2] as any))(3));
}

{
  // a06 · 展开的几种来路：标识符 / 数组字面量 / 字符串 / Set / 生成器 / 迭代器
  function f(...a: any[]) { return a.length + ":" + a.join("|"); }
  const xs: any = [1, 2];
  function* gen() { yield 1; yield 2; }
  console.log(f(...xs));
  console.log(f(...[1, 2] as any));
  console.log(f(..."ab" as any));
  console.log(f(...(new Set([1, 2]) as any)));
  console.log(f(...(gen() as any)));
  console.log(f(...([1, 2].values() as any)));
  console.log(f(...(new Map([[1, 2]]).keys() as any)));
}
