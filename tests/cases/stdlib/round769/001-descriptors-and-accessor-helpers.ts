// xl:title `Object` 属性描述符那一族：读回与继承 + 访问器工具与定义
// xl:round 769
// xl:judge stdout
// xl:end
// **第 809 轮把同判定点的两条并了进来**（原 `r769b-01` / `b-02`）：两条问的都是
// 「这一族描述符接口怎么读、怎么写、怎么继承」——`getOwnPropertyDescriptor`
// （含继承来的那一格给 `undefined`、取不到给 `undefined`）、`getOwnPropertyDescriptors`
// 的整张表、`__defineGetter__` / `__lookupGetter__` 那一族、`defineProperties`、
// 冻结 / 密封 / 不可扩展三档与 `isPrototypeOf`。每段正文一字未改，各自裹一层块。
{
  const show = (f: () => any) => {
    try {
      const v = f();
      return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
    } catch (e) {
      return "throw:" + (e as Error).constructor.name;
    }
  };
  console.log('01 (function () { class A { get v() {', show(() => (function () { class A { get v() { return 1; } } const d: any = Object.getOwnPropertyDescriptor(A.prototype, 'v'); return d.get.name + '/' + d.set; })()));
  console.log('02 (function () { class A { get v() {', show(() => (function () { class A { get v() { return 1; } set v(x: any) {} } const d: any = Object.getOwnPropertyDescriptor(A.prototype, 'v'); return typeof d.set; })()));
  console.log('03 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; Object.defineProperty(o, 'x', { value: 1 }); return Object.getOwnPropertyDescriptor(o, 'x').writable; })()));
  console.log('04 (function () { const o: any = { a:', show(() => (function () { const o: any = { a: 1 }; return JSON.stringify(Object.getOwnPropertyDescriptors(o)); })()));
  console.log('05 (function () { const o: any = { a:', show(() => (function () { const o: any = { a: 1 }; return Object.getOwnPropertyDescriptors(o).a.value; })()));
  console.log('06 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; Object.defineProperty(o, 'a', { get: () => 3, enumerable: true }); return Object.getOwnPropertyDescriptors(o).a.get(); })()));
  console.log('07 (function () { const p: any = { x:', show(() => (function () { const p: any = { x: 1 }; const o: any = Object.create(p); return String(Object.getOwnPropertyDescriptor(o, 'x')); })()));
  console.log('08 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; Object.defineProperty(o, 'x', { value: 1, enumerable: true }); return o.propertyIsEnumerable('x'); })()));
  console.log('09 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; Object.defineProperty(o, 'x', { value: 1 }); return o.propertyIsEnumerable('x'); })()));
  console.log('10 (function () { const o: any = Obje', show(() => (function () { const o: any = Object.create(null); o.x = 1; return typeof o.hasOwnProperty; })()));
  console.log('11 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return typeof Object.getOwnPropertyDescriptor(o, 'toString'); })()));
  console.log('12 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return String(Object.getOwnPropertyDescriptor(o, 'x')); })()));
  console.log('13 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return Object.getOwnPropertyDescriptor(1 as any, 'x'); })()));
  console.log('14 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return Object.getOwnPropertyDescriptors(null as any); })()));
  console.log('15 (function () { const o: any = {}; ', show(() => (function () { const o: any = {}; return Object.getOwnPropertyDescriptors([]).length.value; })()));
}
{
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
}
