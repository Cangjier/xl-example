// xl:title 括号被调者那一格（第 774 轮收掉，这里当守卫）
// xl:round 773
// xl:judge stdout
// xl:end
// **第 773 轮登记的那条缺口在第 774 轮收掉了**（两处，都在「括号被调者」这一格上）：
// ① `typescript/tokens/method.xl.md` 的 `PrintAst`——「内层那次调用是被调用者」
// 那一支要求它**就是第一个子单元**（原来 `kids.find(...)` 会命中**实参**里那一个）；
// ② `typescript-exec/lowering.xl.md` 的 `LowerCall`——括号 / `as` / `satisfies` / `!`
// 这四个**透明壳**要剥掉再选分支（`([1, 2].join)("")` 的 `this` 仍然是那个数组）。
// `xl:want differ` / `xl:why` 按规矩撤掉，这一条留着当守卫。
// xl:end
const p = (s: string) => console.log(s);
const show = (f: () => any) => { try { const v = f(); return "ok:" + String(v); } catch (e) { return "throw:" + (e as any).constructor.name + "|" + (e as any).message; } };
const f1 = () => "s";
const o = { m(a: number) { return a * 3; } };
console.log('01 (String)(Symbol("s"))', show(() => (String)(Symbol("s"))));
console.log('02 (String)("s")', show(() => (String)("s")));
console.log('03 (String)(f1())', show(() => (String)(f1())));
console.log('04 (Math.max)(1, 2)', show(() => (Math.max)(1, 2)));
console.log('05 ("ab".toUpperCase)()', show(() => ("ab".toUpperCase)()));
console.log('06 ([1, 2].join)("")', show(() => ([1, 2].join)("")));
console.log('07 (String)(String(1))', show(() => (String)(String(1))));
console.log('08 (Number)(parseInt("7"))', show(() => (Number)(parseInt("7"))));
console.log('09 (o.m)(2)', show(() => (o.m)(2)));
console.log('10 (Math.max)(parseInt("3"), 2)', show(() => (Math.max)(parseInt("3"), 2)));
console.log('11 ((String))("s")', show(() => ((String))("s")));
console.log('12 (String)(Symbol.for("k"))', show(() => (String)(Symbol.for("k"))));
console.log('13 之后的语句照旧', show(() => "after"));
