// xl:title 访问器工具与定义
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
console.log('01 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; o.__defineGetter__('v', () => 5); return o.v; })()));
console.log('02 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; o.__defineGetter__('v', () => 5); return o.__lookupGetter__('v')(); })()));
console.log('03 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; o.__defineGetter__('v', () => 5); return String(o.__lookupSetter__('v')); })()));
console.log('04 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; o.__defineSetter__('v', function (x: any) { this.w = x * 2; }); o.v = 4; return o.w; })()));
console.log('05 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; Object.defineProperties(o, { a: { value: 1, enumerable: true }, b: { get: () => 2, enumerable: true } }); return JSON.stringify(o); })()));
console.log('06 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; Object.defineProperty(o, 'a', { value: 1, enumerable: true }); Object.defineProperty(o, 'a', { value: 2 }); return JSON.stringify(o) + Object.getOwnPropertyDescriptor(o, 'a').enumerable; })()));
console.log('07 (function () { const o: any = Obje', show(() => (function () { const o: any = Object.freeze({ a: 1 }); return JSON.stringify(Object.getOwnPropertyDescriptor(o, 'a')); })()));
console.log('08 (function () { const o: any = Obje', show(() => (function () { const o: any = Object.freeze({ a: 1 }); return Object.isFrozen(o) + '/' + Object.isSealed(o) + '/' + Object.isExtensible(o); })()));
console.log('09 (function () { const o: any = Obje', show(() => (function () { const o: any = Object.seal({ a: 1 }); return Object.isFrozen(o) + '/' + Object.isSealed(o) + '/' + Object.isExtensible(o); })()));
console.log('10 (function () { return Object.isFro', show(() => (function () { return Object.isFrozen(1 as any) + '/' + Object.isSealed('x' as any) + '/' + Object.isExtensible(null as any); })()));
console.log('11 (function () { const o: any = Obje', show(() => (function () { const o: any = Object.preventExtensions({ a: 1 }); o.b = 2; return JSON.stringify(o); })()));
console.log('12 (function () { const o: any = { a:', show(() => (function () { const o: any = { a: 1 }; Object.setPrototypeOf(o, null); return Object.getPrototypeOf(o) === null; })()));
console.log('13 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return o.isPrototypeOf({}); })()));
console.log('14 (function () { const p: any = {}; ', show(() => (function () { const p: any = {}; const o: any = Object.create(p); return p.isPrototypeOf(o) + '/' + Object.prototype.isPrototypeOf(o); })()));
