// xl:title 函数 / 类表达式当链的头一格：成员、下标、调用三种后缀
// xl:round 775
// xl:judge stdout
// xl:end
// 第 775 轮收掉的那一处根：`projectExpression` 的链那一支原来对头一格直接
// `projectNode(ck[0], ctx)`，`ctx.expressionPosition` 没人置 ⇒ 函数 / 类表达式投成
// `FunctionDeclaration` / `ClassDeclaration`，降级期报
// `unimplemented: expression FunctionDeclaration`（整份文件跑不进来）。
// 分界是**体后面跟的是 `(` 还是别的**：`(function () { })()` 走末尾实参括号那一支、
// 照常是表达式；`.bind` / `["length"]` / `.prototype` 那一族走链那一支、以前全错。
// 这一条把**修好的三种后缀**与**两条不许被带偏的边界**（声明位、体里的声明）一起钉住。
const show = (f: () => any): string => {
  try {
    const v = f();
    return "ok:" + String(v);
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
const o = { v: 3 };
console.log('01 function + .bind —— 链头是函数表达式', show(() => { const f = function (this: any) { return this.v; }.bind(o); return f(); }));
console.log('02 function + .call —— 链头是函数表达式', show(() => function (this: any) { return 4; }.call(null)));
console.log('03 function + .length —— 属性读', show(() => function (a: number, b: number) { return a; }.length));
console.log('04 function + ["length"] —— 下标那一格', show(() => function (a: number) { return a; }["length"]));
console.log('05 function + .apply', show(() => function (this: any) { return 5; }.apply(null, [])));
console.log('06 function + .prototype 的形状', show(() => typeof function () { return 6; }.prototype));
console.log('07 具名函数表达式 + .call', show(() => function named(this: any) { return 7; }.call(null)));
console.log('08 类表达式 + .prototype', show(() => typeof class { m() { return 1; } }.prototype.m));
console.log('09 类表达式 + ["name"]', show(() => JSON.stringify(class { }["name"])));
console.log('10 类表达式 + 静态成员', show(() => class { static s = 9; }["s"]));
// **两条边界**：① 声明位照旧是声明（`function f() {}` / `class C {}` 各占一条语句）；
// ② **体里的声明照旧是声明**（第 134 轮那个坑：标记置宽了会把它投成表达式，
// 降级期报 `unimplemented: statement FunctionExpression`）。
function decl() { return "decl"; }
class Decl { m() { return "decl-m"; } }
console.log('11 声明位：函数声明照旧可调', show(() => decl()));
console.log('12 声明位：类声明照旧可 new', show(() => new Decl().m()));
console.log('13 体里的函数声明照旧是声明', show(() => function () { function inner() { return "inner"; } return inner(); }.call(null)));
console.log('14 体里的类声明照旧是声明', show(() => function () { class Inner { m() { return "inner-m"; } } return new Inner().m(); }.call(null)));
// **括号那一档一直是好的**（走末尾实参括号 / `parenthesizedOf` 两支），这一条是哨兵。
console.log('15 IIFE 无括号', show(() => function () { return 15; }()));
console.log('16 IIFE 带括号', show(() => (function () { return 16; })()));
console.log('17 括号包着的函数 + .call', show(() => (function (this: any) { return 17; }).call(null)));
console.log('18 括号包着的类 + .prototype', show(() => typeof (class { m() { return 1; } }).prototype.m));
