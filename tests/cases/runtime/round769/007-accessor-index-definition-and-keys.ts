// xl:title 访问器下标的定义 / 描述符 / 键（守卫）
// xl:round 769
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name + ":" + String((e as Error).message).slice(0, 30);
  }
};
const mk = () => { const a: any = []; Object.defineProperty(a, 0, { get: () => 7, configurable: true, enumerable: true }); a.length = 2; return a; };
console.log('01 (function () { const a: any = mk(); a[1]', show(() => (function () { const a: any = mk(); a[1] = 5; return JSON.stringify(a); })()));
console.log('02 (function () { const a: any = mk(); a.le', show(() => (function () { const a: any = mk(); a.length = 1; return a.length + '/' + (0 in a); })()));
console.log('03 (function () { const a: any = mk(); dele', show(() => (function () { const a: any = mk(); delete a[0]; return 0 in a; })()));
console.log('04 (function () { const a: any = mk(); a[5]', show(() => (function () { const a: any = mk(); a[5] = 1; return a.length; })()));
console.log('05 (function () { const a: any = mk(); retu', show(() => (function () { const a: any = mk(); return Object.getOwnPropertyNames(a).join(','); })()));
console.log('06 (function () { const a: any = mk(); retu', show(() => (function () { const a: any = mk(); return a.hasOwnProperty(0) + '/' + a.propertyIsEnumerable(0); })()));
console.log('07 (function () { const a: any = mk(); cons', show(() => (function () { const a: any = mk(); const d: any = Object.getOwnPropertyDescriptor(a, 0); return typeof d.get + '/' + d.enumerable + '/' + d.configurable; })()));
console.log('08 (function () { const a: any = mk(); retu', show(() => (function () { const a: any = mk(); return typeof a[0] + '/' + typeof a[1]; })()));
console.log('09 (function () { const a: any = mk(); cons', show(() => (function () { const a: any = mk(); const b: any = a.slice(); return b.length + '/' + (0 in b) + '/' + JSON.stringify(b); })()));
console.log('10 (function () { const a: any = mk(); cons', show(() => (function () { const a: any = mk(); const b: any = a.slice(); b[0] = 1; return JSON.stringify(b); })()));
