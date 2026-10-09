// xl:title 函数的 name 推导：字面量 / 类成员 / 绑定（第 883 轮起只剩绑定那一格）
// xl:round 778
// xl:judge stdout
// xl:want differ
// xl:why **第 778 轮量出来的那一行已经收掉了**：`let x; x = function () {}` 之后
// xl:why `x.name` 原来是 `""`（Node 给 `"x"`——`NamedEvaluation` 里**赋值**也是一处命名位）。
// xl:why 第 883 轮在 `typescript-exec/lowering.xl.md` 的 `LowerBinary` 那条 `=` 分支上
// xl:why 补了**第四处** `FunctionNameHint`（前两处是变量声明第 238 轮、形参默认值第 882 轮，
// xl:why 判据都是同一个 `NamesFunctionValue`），本文件第 3 行那一条于是与 Node 逐字节相同。
// xl:why **没有碰** `o.m = …` / `arr[0] = …` 两条分支（规范在那两处没有 NamedEvaluation，
// xl:why JS 本来就不取名——第 8 行那一半一直是对的）。
// xl:why
// xl:why **本文件今天唯一还红的是第 17 行**：`typeof f.bind(null).prototype` 本仓给
// xl:why `"object"`、Node 给 `"undefined"`——**根不在这一条用例里**，而在第 753 轮的
// xl:why `FunctionBind`（`globals.xl.md`：它把目标的 `prototype` 抄到了绑定对象自己身上，
// xl:why 为的是 `new (F.bind(null))() instanceof F`）。同一个根在
// xl:why `stdlib/round783/003-bound-function-own-cells-differ` 上有完整台账
// xl:why （两条要同一轮收：`CreateInstance` 认绑定对象时改从 `[[BoundTargetFunction]]`
// xl:why 取原型）。这一条用例**留着当那一轮的另一只眼**，所以 `xl:want differ` 照旧。
// xl:end
// 第 778 轮普查面：`Function.prototype.name` 与 `prototype` 那一族。
// `name` 由**赋值位置**推导（`const f = () => {}` 给 `"f"`、`{ m: function () {} }` 给 `"m"`、
// 对象访问器给 `"get g"`、类成员给类给的键），`bind` 出来的再加 `"bound "` 前缀；
// 箭头函数与简写方法**没有** `prototype`。这一条把这几档逐一钉住。
//
// **原来记着「默认实参里的函数表达式」那一格**（`function (f: any = function () {}) { return f.name }`）
// ——那一格当场把整份文件带走（`unimplemented: expression FunctionDeclaration`）。
// **第 882 轮两条根因都收掉了**（投影：`lamda-parameter.xl.md` 的 `PrintAst` 改走
// `ctx.Expression`；降级：`LowerParamDefault` 补上 NamedEvaluation 的名字）⇒
// 那一格已经在 `tests/cases/exec/round882/001-param-default-named-evaluation.ts` 里
// **单独钉住**（八种可调用体 + 一个解构反例），所以这条用例不再把它接回来
// ——同一条判据放两处只会漂。
const show = (v: any): string => (typeof v === "string" ? JSON.stringify(v) : String(v));
const constArrow = () => 1;
console.log('01 const 箭头', show(constArrow.name));
let letArrow = () => 2;
console.log('02 let 箭头', show(letArrow.name));
console.log('03 变量赋值', show((() => { let x: any; x = function () { return 3; }; return x.name; })()));
const obj: any = { m: function () { return 4; }, shorthand() { return 5; }, arrow: () => 6 };
console.log('04 对象字面量属性', show(obj.m.name));
console.log('05 对象简写方法', show(obj.shorthand.name));
console.log('06 对象属性里的箭头', show(obj.arrow.name));
const withAccessors: any = { get g() { return 7; }, set s(v: any) { void v; } };
const gd: any = Object.getOwnPropertyDescriptor(withAccessors, "g");
const sd: any = Object.getOwnPropertyDescriptor(withAccessors, "s");
console.log('07 对象访问器 get', show(gd.get.name));
console.log('08 对象访问器 set', show(sd.set.name));
class Named { m() { return 8; } static sm() { return 9; } constructor() { void 0; } }
console.log('09 类方法名', show(Named.prototype.m.name));
console.log('10 类静态方法名', show(Named.sm.name));
console.log('11 类本身名', show(Named.name));
console.log('12 匿名函数表达式', show((function () { return 10; }).name));
console.log('13 bind 出来的名字', show((function foo() { return 11; }).bind(null).name));
console.log('14 bind 两次', show((function foo() { return 12; }).bind(null).bind(null).name));
console.log('15 箭头没有 prototype', show(typeof constArrow.prototype));
console.log('16 简写方法没有 prototype', show(typeof obj.shorthand.prototype));
console.log('17 bind 出来的没有 prototype', show(typeof (function foo() { return 13; }).bind(null).prototype));
console.log('18 普通函数有 prototype', show(typeof (function foo() { return 14; }).prototype));
console.log('19 计算键给的名字', show(({ ["k"]: function () { return 15; } }).k.name));
