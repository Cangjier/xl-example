// xl:title 函数与访问器的名字推导（`name` 那一格）
// xl:round 755
// xl:judge stdout
// xl:why **第 755 轮收掉了 16 行里的 15 行**，**最后那一行（第 14 行）第 899 轮收掉**
// xl:why （`coverage` 从 differ 转绿，`xl:want differ` 那一行按规矩撤了）——这一条留着当**守卫**。
// xl:why 计算键的**类成员**（第 12 行）与计算键的**对象字面量访问器**（第 8 行）
// xl:why 原来都拿不到名字（`class C { ["m" + 1]() {} }.m1.name` 该是 `"m1"`、
// xl:why `{ get ["x" + 1]() {} }` 的 getter 该叫 `"get x1"`），两处第 755 轮一起接上：
// xl:why 静态键由 `memberDisplay` / `LowerFunctionValue` 当场给、
// xl:why 动态键由运行期的 `EmitComputedFunctionName` 补写（它现在收一个前缀，
// xl:why 交给语言层的 `set_function_name(闭包, 键, 前缀)` 去拼）。
// xl:why **留下的那一行**（第 14 行）：`const { a = function () {} } = {}` 的 `a.name`
// xl:why 在 Node 里是 **`"a"`**（解构默认值**也是命名位置**，规范 §8.6.1 那一句），
// xl:why 第 755 轮时本仓给空串——`Destructure` 那条路**一格名字提示都没挂**
// xl:why（`FunctionNameHint` 只由 `LowerVariable` 的简单名那一支、对象字面量成员、
// xl:why 类成员三处挂）。第 899 轮的修法：给 `DestructureDefault` 添第三个参数 `nameHint`
// xl:why （名字由调用方给：声明那一半取 `element.name`、赋值那一半取 `element.left`，
// xl:why **只有目标是简单标识符时才给**——成员目标在 JS 里是匿名的），
// xl:why 那两处调用点一起接上。**嵌套模式由里面那一格自己命名**，所以这一层不递归猜。
// xl:why **不许被带偏的那一半**：自带真名的函数表达式仍然赢（`{ a = function named() {} }`
// xl:why 给 `"named"`）、`null` **不**触发默认值、非函数的默认值照旧、
// xl:why 以及 `{ a = cond ? () => 1 : () => 2 }` 两个箭头**都是匿名的**。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { const f = funct', show(() => (function () { const f = function () {}; return f.name; })()));
console.log('(function () { const f = funct', show(() => (function () { const f = function g() {}; return f.name; })()));
console.log('(function () { const o = { m()', show(() => (function () { const o = { m() {} }; return o.m.name; })()));
console.log('(function () { const o = { m: ', show(() => (function () { const o = { m: function () {} }; return o.m.name; })()));
console.log('(function () { const o = { get', show(() => (function () { const o = { get g() { return 1; } }; return Object.getOwnPropertyDescriptor(o, "g").get.name; })()));
console.log('(function () { const o = { set', show(() => (function () { const o = { set s(v) {} }; return Object.getOwnPropertyDescriptor(o, "s").set.name; })()));
console.log('(function () { const o = { ["x', show(() => (function () { const o = { ["x" + 1]() {} }; return o.x1.name; })()));
console.log('(function () { const o = { get', show(() => (function () { const o = { get ["x" + 1]() { return 1; } }; return Object.getOwnPropertyDescriptor(o, "x1").get.name; })()));
console.log('(function () { class C { m() {', show(() => (function () { class C { m() {} } return C.prototype.m.name; })()));
console.log('(function () { class C { stati', show(() => (function () { class C { static m() {} } return C.m.name; })()));
console.log('(function () { class C { get g', show(() => (function () { class C { get g() { return 1; } } return Object.getOwnPropertyDescriptor(C.prototype, "g").get.name; })()));
console.log('(function () { class C { ["m" ', show(() => (function () { class C { ["m" + 1]() {} } return C.prototype.m1.name; })()));
console.log('(function () { const f = () =>', show(() => (function () { const f = () => {}; return f.name; })()));
console.log('(function () { const { a = fun', show(() => (function () { const { a = function () {} } = {}; return a.name; })()));
console.log('(function () { const o = { m: ', show(() => (function () { const o = { m: function () {} }; const d = Object.getOwnPropertyDescriptor(o, "m"); return d.value.name; })()));
console.log('(function () { const o = {}; o', show(() => (function () { const o = {}; o.m = function () {}; return o.m.name; })()));
