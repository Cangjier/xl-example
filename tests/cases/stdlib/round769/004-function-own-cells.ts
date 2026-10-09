// xl:title 函数对象自己的格子
// xl:round 769
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 (function () { function f() {} ret', show(() => (function () { function f() {} return f.length + '/' + f.name; })()));
console.log('02 (function () { function f(a: any, ', show(() => (function () { function f(a: any, b: any = 1, ...rest: any[]) {} return f.length; })()));
console.log('03 (function () { const f: any = (a: ', show(() => (function () { const f: any = (a: any, b: any) => a; return f.length; })()));
console.log('04 (function () { const f: any = func', show(() => (function () { const f: any = function g() {}; return f.name; })()));
console.log('05 (function () { const o: any = { m(', show(() => (function () { const o: any = { m() {} }; return o.m.name; })()));
console.log('06 (function () { const o: any = { m:', show(() => (function () { const o: any = { m: function () {} }; return o.m.name; })()));
console.log('07 (function () { const o: any = { [\'', show(() => (function () { const o: any = { ['c' + 'k']() {} }; return o.ck.name; })()));
console.log('08 (function () { class A { m() {} st', show(() => (function () { class A { m() {} static s() {} } return A.prototype.m.name + '/' + A.s.name; })()));
console.log('09 (function () { function f() {} ret', show(() => (function () { function f() {} return typeof f.prototype + '/' + typeof f.call + '/' + typeof f.apply + '/' + typeof f.bind; })()));
console.log('10 (function () { function f() {} ret', show(() => (function () { function f() {} return Object.getOwnPropertyNames(f).join(','); })()));
console.log('11 (function () { function f() {} ret', show(() => (function () { function f() {} return f.hasOwnProperty('prototype'); })()));
console.log('12 (function () { const f: any = () =', show(() => (function () { const f: any = () => {}; return f.hasOwnProperty('prototype'); })()));
console.log('13 (function () { function f() {} ret', show(() => (function () { function f() {} return typeof Object.getOwnPropertyDescriptor(f, 'name').value; })()));
console.log('14 (function () { function f() {} ret', show(() => (function () { function f() {} return Object.getOwnPropertyDescriptor(f, 'length').writable; })()));
console.log('15 (function () { function f() {} ret', show(() => (function () { function f() {} return String(f).slice(0, 8); })()));
