// xl:title 被调者上的透明壳与「不是引用」的边界
// xl:round 774
// xl:judge stdout
// xl:end
// 第 773 轮登记的 `stdlib/round773/r773b-01` 在这一轮收掉了（两处：token 层
// `method.xl.md` 的 `PrintAst` 要求「内层那次调用是第一个子单元」、降级层
// `LowerCall` 要把四个透明壳剥掉再选分支）。这一条把**两半**一起钉住：
// **透明壳**（括号 / as / satisfies / !）**不改引用** ⇒ `this` 照旧是那个接收者；
// 而**变量、逗号、`bind`** 那几档**不是引用** ⇒ `this` 是 `undefined`。
const p = (s: string) => console.log(s);
const show = (f: () => any) => { try { const v = f(); return "ok:" + String(v); } catch (e) { return "throw:" + (e as any).constructor.name; } };
const o: any = { n: 7, m(a: number) { return this === undefined ? "no-this" : this.n + a; } };
console.log('01 o.m(1)', show(() => o.m(1)));
console.log('02 (o.m)(1)', show(() => (o.m)(1)));
console.log('03 (o.m as any)(1)', show(() => (o.m as any)(1)));
console.log('04 (o.m!)(1)', show(() => (o.m!)(1)));
console.log('05 ((o.m))(1)', show(() => ((o.m))(1)));
console.log('06 o["m"](1)', show(() => o["m"](1)));
console.log('07 (o["m"])(1)', show(() => (o["m"])(1)));
console.log('08 (o.m).call(o, 1)', show(() => (o.m).call(o, 1)));
console.log('09 (0, o.m)(1) —— 逗号不是引用', show(() => (0, o.m)(1)));
console.log('10 const g = o.m; g(1) —— 变量不是引用', show(() => { const g = o.m; return g(1); }));
console.log('11 ([1, 2].join)("")', show(() => ([1, 2].join)("")));
console.log('12 ("ab".toUpperCase)()', show(() => ("ab".toUpperCase)()));
console.log('13 ("ab".toUpperCase)?.()', show(() => ("ab".toUpperCase)?.()));
console.log('14 (0, [1, 2].join)("") —— 逗号不是引用', show(() => (0, [1, 2].join)("")));
class C { v = 9; get() { return this.v; } }
console.log('15 (new C().get)()', show(() => (new C().get)()));
console.log('16 (C.prototype.get).call(new C())', show(() => (C.prototype.get).call(new C())));
console.log('17 (function () { return 1 })()', show(() => (function () { return 1; })()));
console.log('18 (() => 2)()', show(() => (() => 2)()));
function mk() { return () => 5; }
console.log('19 mk()()', show(() => mk()()));
console.log('20 (mk())()', show(() => (mk())()));
console.log('21 (String)(Symbol("s"))', show(() => (String)(Symbol("s"))));
console.log('22 (String)(String(1))', show(() => (String)(String(1))));
console.log('23 (Math.max)(parseInt("3"), 2)', show(() => (Math.max)(parseInt("3"), 2)));
console.log('24 之后的语句照旧', show(() => "after"));
