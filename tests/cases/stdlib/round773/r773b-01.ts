// xl:title 括号被调者那一格：被调者与实参整段接错
// xl:round 773
// xl:judge stdout
// xl:want differ
// xl:why **括号被调者**（`(f)(…)`）那一段在**投影层**整段接错（第 773 轮普查量到的，`p773b`）。token 层给的是 `Method(name="", children=[Bracket(被调者), 实参…])`，而投影把它读成 `CallExpression{ expression: <实参里那一次调用>, arguments: [<被调者>] }`——**两者对调**。三种症状：① 实参是**一次调用**时整段对调（01 / 03 / 07 / 08 行：`(String)(String(1))` 本仓去调那个 `1`）；② 括号里是**字面量接收者的方法访问**时接收者丢失（05 / 06 行：`('ab'.toUpperCase)()` 报 `String.prototype method called on null or undefined`）；③ 而**标识符接收者**（`o.m`）与**字面量实参**那两档本来就是对的（02 / 04 / 09 / 10 行钉着这一半，收的时候不许连累它们）
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
