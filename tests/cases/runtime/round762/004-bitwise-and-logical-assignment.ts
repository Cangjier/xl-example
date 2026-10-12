// xl:title 位运算与逻辑赋值：`>>>` 的无符号、`| 0` 的截断、复合赋值的六种
// xl:round 762
// xl:judge stdout
// xl:note 第 762 轮普查里**全过**的一片，收进矩阵当守卫（含 `-1 >>> 0` 给 4294967295、
// xl:note `2 ** 31 | 0` 给负数、`NaN | 0` 给 0、`1.9 | 0` 给 1、`3.5 | 0` 给 3，
// xl:note 以及 `||=` / `&&=` / `??=` 与 `+=` / `*=` / `%=` / `>>=` / `<<=` / `&=` 六格）。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 1 << 3', show(() => 1 << 3));
console.log('02 -1 >>> 0', show(() => -1 >>> 0));
console.log('03 1.9 | 0', show(() => 1.9 | 0));
console.log('04 ~5', show(() => ~5));
console.log('05 5 & 3', show(() => 5 & 3));
console.log('06 5 | 2', show(() => 5 | 2));
console.log('07 5 ^ 1', show(() => 5 ^ 1));
console.log('08 1 << 31', show(() => 1 << 31));
console.log('09 (2 ** 31) | 0', show(() => (2 ** 31) | 0));
console.log('10 (-1) >>> 0', show(() => (-1) >>> 0));
console.log('11 0b1010 | 0', show(() => 0b1010 | 0));
console.log('12 3.5 | 0', show(() => 3.5 | 0));
console.log('13 NaN | 0', show(() => NaN | 0));
console.log('14 (function () { let a = 0; a ||= 5;', show(() => (function () { let a = 0; a ||= 5; return a; })()));
console.log('15 (function () { let a = 1; a ||= 5;', show(() => (function () { let a = 1; a ||= 5; return a; })()));
console.log('16 (function () { let a = 0; a &&= 5;', show(() => (function () { let a = 0; a &&= 5; return a; })()));
console.log('17 (function () { let a = null; a ??=', show(() => (function () { let a = null; a ??= 7; return a; })()));
console.log('18 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; o.x ??= 1; return o.x; })()));
console.log('19 (function () { let a: any = 1; a +', show(() => (function () { let a: any = 1; a += "2"; return a; })()));
console.log('20 (function () { let a: any = 1; a *', show(() => (function () { let a: any = 1; a *= 2; return a; })()));
console.log('21 (function () { let a: any = 7; a %', show(() => (function () { let a: any = 7; a %= 3; return a; })()));
console.log('22 (function () { let a: any = 8; a >', show(() => (function () { let a: any = 8; a >>= 1; return a; })()));
console.log('23 (function () { let a: any = 1; a <', show(() => (function () { let a: any = 1; a <<= 2; return a; })()));
console.log('24 (function () { let a: any = 5; a &', show(() => (function () { let a: any = 5; a &= 3; return a; })()));
