// xl:title 描述符读回与继承
// xl:round 769
// xl:judge stdout
// xl:want differ
// xl:why 两个根：`Object.getOwnPropertyDescriptor(1, 'x')` 在 JS 里先把原始值 `ToObject`（给 `undefined`）、本仓抛；`Object.getOwnPropertyDescriptors(null)` 该抛 `TypeError`、本仓抛的是笼统的 `Error`
// xl:end
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
