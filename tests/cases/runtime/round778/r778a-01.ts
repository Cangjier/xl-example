// xl:title 函数的 name 推导：字面量 / 类成员 / 绑定
// xl:round 778
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**（第 778 轮普查当场红的那一行）：`let x; x = function () {}` 之后
// xl:why `x.name` 在 Node 里是 `"x"`、本仓给 `""`（`NamedEvaluation`——**赋值**也是一处命名位）。
// xl:why **分界就在这里**：`const a = function () {}` 的 `"a"` 两边都对（声明那一支有它），
// xl:why `o.m = function () {}` / `arr[0] = function () {}` 两边**都是 `""`**（那些位置
// xl:why 规范本来就不取名）——所以缺的只是**简单赋值**这一格，不是「到处都不取名」。
// xl:why **为什么不顺手收**：`const` 那一支的名字是在**声明**成形时由降级层挂的，
// xl:why 而赋值是一个 `RtOp`，要在那里认出「右值是匿名闭包」再调一次改名——
// xl:why 这一条用例量到的是其余 18 档全对，**先如实登记这一格，不猜**。
// xl:end
// 第 778 轮普查面：`Function.prototype.name` 与 `prototype` 那一族。
// `name` 由**赋值位置**推导（`const f = () => {}` 给 `"f"`、`{ m: function () {} }` 给 `"m"`、
// 对象访问器给 `"get g"`、类成员给类给的键），`bind` 出来的再加 `"bound "` 前缀；
// 箭头函数与简写方法**没有** `prototype`。这一条把这几档逐一钉住。
//
// **第 20 行原来是「默认实参里的函数表达式」**（`function (f: any = function () {}) { return f.name }`）
// ——那一格当场把整份文件带走（`unimplemented: expression FunctionDeclaration`，
// 见 `token/round778/r778g-01` 那条投影层缺口）。**这一条只留全对的那几档**，
// 缺口在那一份 token 语料里单独记着；缺口收掉之后把那一行接回来即可。
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
