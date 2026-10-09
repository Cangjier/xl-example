// xl:title `Error.stack` 那一格：自有 + 不可枚举的字符串，头一行与 `util.inspect` 同一句
// xl:round 782
// xl:judge stdout
// xl:end
// 第 782 轮：这一条量的是 `util.inspect` 对错误那一档的**两个落点**。
//
// 本仓原来只在「沿原型链读到的 `name` 恰好等于 `"Error"`」时才走错误那一支，
// 而且**把名写死成 `"Error"`**：
//   ① `console.log(new TypeError("t"))` 落到普通对象那一支 ⇒ 印 `{}`（Node 印 `TypeError: t`）；
//   ② 就算进了错误那一支，`new RangeError("r")` 也会印成 `Error: r`（**静默错值**）。
//
// **为什么这一条要整族走一遍**：两个落点各自只在一半的族上露头——
// 只试 `Error` 那一格的话两处都是绿的。
//
// **为什么这里不直接 `console.log(错误对象)`**：Node 印的是**整段栈**，而栈里的
// 路径与行号（`file:///…:1:13`）在两条路上**不可能逐字节相同**——那一档不是可比判据，
// 它单独登在 `stdlib/error/001-console-log-error-stack`。
// 这一条量的是**那一档的第一行**（也就是「八个族各自印自己的名」这件事本身），
// 而 `Error.stack` 的第一行与 `util.inspect` 那一行**是同一句**
//（Node 实测：`console.log(new Error("m"))` 的头一行就是 `Error: m`）——
// 所以下面用 `e.stack.split("\n")[0]` 把那一格**取出来**比：比的是同一个答案，但没有栈。
//
// **`console.log` 那一格本身也没放过**：第 20 / 21 行把**一个错误对象**交给 `console.log`，
// 断言它印出来的**头一行**与 `e.stack` 的头一行相同（`console.log` 的真出口只能从
// 它自己那一行读回来，而这一读是逐字节可比的：`console.log` 印空格、`stack` 印冒号加空格）。
const P = (label: string, v: any): void => console.log(label + " = " + String(v));
const head = (e: any): string => String(e.stack).split("\n")[0];

// —— 出口一：八个族各印各的名（`stack` 那一行 = `console.log` 那一行） ——
P("01 Error", head(new Error("e")));
P("02 TypeError", head(new TypeError("t")));
P("03 RangeError", head(new RangeError("r")));
P("04 SyntaxError", head(new SyntaxError("s")));
P("05 ReferenceError", head(new ReferenceError("f")));
P("06 URIError", head(new URIError("u")));
P("07 EvalError", head(new EvalError("v")));
P("08 AggregateError", head(new AggregateError([1, 2], "a")));

// —— 出口二：没有消息时**只印名**（与 `Error.prototype.toString` 一字不差） ——
P("09 Error 无消息", head(new Error()));
P("10 TypeError 无消息", head(new TypeError()));
P("11 RangeError 无消息", head(new RangeError()));
P("12 AggregateError 无消息", head(new AggregateError([])));

// —— 不许被带偏：`toString` 那一格一直是对的，印法换了不该动它 ——
P("13 Error toString", String(new Error("m")));
P("14 TypeError toString", String(new TypeError("t")));
P("15 RangeError toString", String(new RangeError("r")));
P("16 无消息 toString", String(new TypeError()));
P("17 标签", Object.prototype.toString.call(new TypeError("t")));
// 普通对象**不许**被当成错误那一支（`{ name: "Error" }` 不是错误）。
P("18 普通对象", JSON.stringify({ name: "Error", message: "fake" }));
P("19 普通对象名", String(({ name: "Error", message: "fake" } as any).name));

// —— `console.log` 那一格：交给它一个错误对象，读回它的**头一行** ——
// 取法是把 `console.log` 换掉一格（这一层 `console` 是个普通对象，属性可写）。
const kept: string[] = [];
const real = console.log;
(console as any).log = (...args: any[]): void => { kept.push(args.map((a: any) => String(a)).join(" ")); };
console.log(new TypeError("t"));
console.log(new RangeError("r"));
console.log(new Error());
console.log(new TypeError());
(console as any).log = real;
P("20 console.log(TypeError)", String(kept[0]).split("\n")[0]);
P("21 console.log(RangeError)", String(kept[1]).split("\n")[0]);
P("22 console.log(Error)", String(kept[2]).split("\n")[0]);
P("23 console.log(TypeError 无消息)", String(kept[3]).split("\n")[0]);
P("24 四条都进了", kept.length);
