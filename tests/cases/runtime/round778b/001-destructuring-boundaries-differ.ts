// xl:title 解构的边界：默认值触发条件、求值次序、嵌套与洞
// xl:round 778
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**（第 778 轮第二普查当场红的那一行）：`const [a = 1, b = 2] = it`
// xl:why 把**迭代器抽干**——本仓给 `n0,n1,n2,def:p`，Node 给 `n0,def:p,n1`
// xl:why （抽出第一格、发现是 `undefined` 就用默认值，**然后才**问第二格）。
// xl:why **根在降级层**：数组模式先过 `MaterializeIterable`（`GetIterator` + `IterDrain`，
// xl:why 第 151 / 199 轮）——`IterDrain` 是「**全部抽完**」那一支，
// xl:why 而解构的规范是「**按位置、按需**取，取一格问一格」。
// xl:why **为什么第 151 / 199 轮要那么写**：`[...xs]` 那种展开确实要抽干，
// xl:why 而数组模式接上它只为了拿到「按位置读」的形状（`Set` / `Map` / 字符串那几档）。
// xl:why **同一形状在别的档上看不出来**：数组与 `Set` 抽干与按需取没有可观测差别，
// xl:why 只有**自定义迭代器**（每一次 `next()` 都记一笔）才分得开——所以这条用例的判据
// xl:why 就是那串 `next()` 记录。本条的其余 18 档全对（默认值 / 次序 / 嵌套 / rest / 计算键）。
// xl:why **为什么不顺手收**：收它要把数组模式从「抽干」换成「一格一格 `IterNext`」，
// xl:why 而那要动 `MaterializeIterable` 的**两个**调用点（数组模式与对象模式共用它），
// xl:why 是一次独立的改动；这一轮先把它**收窄到最小形状**（一条自定义迭代器）量清楚。
// xl:end
// 第 778 轮第二普查面：解构（对象 / 数组 / 形参 / 嵌套 / 重命名 / rest / 计算键 / `catch`）。
// 默认值的**触发条件**是这一族的语义核心：只有 `undefined` 才走默认值
// （`null` / `0` / `""` 都不走），而且**求值次序**（每个元素先取值再取默认值）
// 是可观测的——所以每一档都用「顺序记录」当判据，不用单点值。
const show = (v: any): string => (typeof v === "string" ? JSON.stringify(v) : String(v));
const run = (f: () => any): string => { try { return show(f()); } catch (e: any) { return "throw:" + e.constructor.name; } };
console.log('01 默认值只在 undefined 上触发', run(() => {
  const log: string[] = [];
  const pick = (v: any, tag: string): any => { log.push(tag); return v; };
  const destructure = ({ a = pick("d", "default") }: any) => a;
  return [destructure({ a: undefined }), destructure({ a: null }), destructure({ a: 0 }), destructure({ a: "" }), destructure({}), log.length].join("|");
}));
console.log('02 取值与默认值的次序', run(() => {
  const log: string[] = [];
  const src: any = { get a() { log.push("get:a"); return undefined; }, get b() { log.push("get:b"); return 2; } };
  const { a = (log.push("def:a"), 1), b = (log.push("def:b"), 3) } = src;
  return a + "|" + b + "|" + log.join(",");
}));
console.log('03 数组解构的次序与洞', run(() => {
  const log: string[] = [];
  const it: any = { [Symbol.iterator]() { let i = 0; return { next() { log.push("n" + i); return { value: i++, done: i > 4 }; } }; } };
  const [x, , y = (log.push("def"), 9), ...rest] = it;
  return [x, y, rest.join(","), log.join(",")].join("|");
}));
console.log('04 解构里的重命名与默认值', run(() => {
  const { a: p = 1, b: q = 2 } = { a: 10 } as any;
  return [p, q].join(",");
}));
console.log('05 嵌套解构缺一层', run(() => {
  const { a: { b: { c = 7 } = {} } = {} } = {} as any;
  return String(c);
}));
console.log('06 嵌套解构里 null 该抛', run(() => {
  const { a: { b } } = { a: null } as any;
  return String(b);
}));
console.log('07 形参解构的默认值', run(() => {
  const f = ({ a, b = a + 1 }: any = {}) => [a, b].join(",");
  return [f(), f({ a: 5 }), f({ a: 5, b: 0 })].join("|");
}));
console.log('08 解构里的 getter 抛', run(() => {
  const src: any = { get a() { throw new TypeError("boom"); } };
  try { const { a } = src; return "no:" + String(a); } catch (e: any) { return "caught:" + e.constructor.name; }
}));
console.log('09 数组解构非可迭代', run(() => {
  const [x] = 5 as any;
  return String(x);
}));
console.log('10 rest 收到的是新数组', run(() => {
  const src: any = [1, 2, 3];
  const [head, ...tail] = src;
  tail.push(4);
  return [head, tail.join(","), src.join(","), Array.isArray(tail)].join("|");
}));
console.log('11 对象 rest 的拷贝是浅的', run(() => {
  const inner: any = { k: 1 };
  const src: any = { a: inner, b: 2 };
  const { a, ...rest } = src;
  inner.k = 9;
  return [a.k, rest.b, Object.keys(rest).join(",")].join("|");
}));
console.log('12 计算键的解构', run(() => {
  const key = "a";
  const { [key]: got = 3 } = {} as any;
  return String(got);
}));
console.log('13 catch 解构', run(() => {
  try { throw { message: "m", code: 7 }; } catch ({ message, code }: any) { return message + ":" + code; }
}));
console.log('14 for-of 解构', run(() => {
  const out: string[] = [];
  for (const [i, v] of [[0, "a"], [1, "b"]] as any) out.push(i + "=" + v);
  return out.join(",");
}));
console.log('15 变量声明与赋值的解构', run(() => {
  let a = 0;
  let b = 0;
  ({ a, b } = { a: 1, b: 2 } as any);
  const [c, d] = [3, 4];
  return [a, b, c, d].join(",");
}));
console.log('16 解构赋值带默认值', run(() => {
  let a = 0;
  let b = 0;
  [a = 5, b = 6] = [] as any;
  return [a, b].join(",");
}));
console.log('17 嵌套的 rest', run(() => {
  const { a: { b, ...innerRest }, ...outerRest } = { a: { b: 1, c: 2, d: 3 }, e: 4 } as any;
  return [b, Object.keys(innerRest).join(","), Object.keys(outerRest).join(",")].join("|");
}));
console.log('18 解构 undefined 该抛', run(() => {
  const { a } = undefined as any;
  return String(a);
}));
console.log('19 数组解构里的默认值也是逐个求值', run(() => {
  const log: string[] = [];
  const it: any = { [Symbol.iterator]() { let i = 0; return { next() { log.push("n" + i); return { value: i++ === 0 ? undefined : "x", done: i > 2 }; } }; } };
  const [p = (log.push("def:p"), "p"), q = (log.push("def:q"), "q")] = it;
  return [p, q, log.join(",")].join("|");
}));
