// xl:title 函数 / 类表达式当操作数的那一圈邻居（守卫）
// xl:round 775
// xl:judge stdout
// xl:end
// 第 775 轮那一处修的是「**链的头一格**是函数 / 类表达式」。这一条把**旁边那一圈**钉住：
// 一元前缀后面的函数表达式（`typeof` / `void` / `!`，第 692 轮那一族）、
// 值位括号里的、当实参的、当数组元素的、`new` 后面的、以及**连着两次后缀**的——
// 它们各走各的投影路径，收链那一支**不许**把它们一起换掉。
const show = (f: () => any): string => {
  try {
    const v = f();
    return "ok:" + String(v);
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 typeof 函数表达式', show(() => typeof function () { return 1; }));
console.log('02 typeof 类表达式', show(() => typeof class { }));
console.log('03 void 函数表达式', show(() => void function () { return 3; }));
console.log('04 ! 函数表达式', show(() => !function () { return 4; }));
console.log('05 new 一个函数表达式', show(() => new (function (this: any) { (this as any).k = 5; })()["k"]));
console.log('06 函数表达式当实参', show(() => [1].map(function (this: any, x: number) { return x + 6; }.bind(null))[0]));
console.log('07 函数表达式当数组元素', show(() => [function () { return 7; }][0]()));
console.log('08 对象字面量里的函数 + .name', show(() => ({ m: function () { return 8; } }).m.name));
console.log('09 函数表达式 + 两次 bind', show(() => function (this: any, a: number) { return a + 9; }.bind(null, 9)()));
console.log('10 函数表达式 + 调用 + 后缀', show(() => function () { return [10]; }().length));
console.log('11 类表达式 + new + 后缀', show(() => new (class { m() { return 11; } })().m()));
console.log('12 类表达式当实参', show(() => typeof ((): any => class { })()));
console.log('13 括号里的函数 + 下标', show(() => (function (a: number) { return a; })["length"]));
console.log('14 括号里的类 + ["name"]', show(() => JSON.stringify((class { })["name"])));
console.log('15 链头是函数、尾巴是二元', show(() => function () { return 15; }.length + 1));
console.log('16 链头是类、尾巴是二元', show(() => class { static s = 1; }["s"] * 16));
console.log('17 函数表达式 + .name 的推导', show(() => { const f = function () { return 17; }; return f.name; }));
console.log('18 匿名类表达式的名字推导', show(() => { const C = class { }; return C.name; }));
