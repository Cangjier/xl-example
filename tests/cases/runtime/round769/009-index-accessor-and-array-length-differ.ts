// xl:title 冻结数组上的 `sort`：0 / 1 格一次都不移，所以不抛
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
console.log('01 (function () { const a: any = Object.fre', show(() => (function () { const a: any = Object.freeze([1]); try { a.sort(); return 'ok'; } catch (e: any) { return e.constructor.name; } })()));
console.log('02 (function () { const a: any = Object.fre', show(() => (function () { const a: any = Object.freeze([]); try { a.sort(); return 'ok'; } catch (e: any) { return e.constructor.name; } })()));
console.log('03 (function () { const a: any = Object.fre', show(() => (function () { const a: any = Object.freeze([1, 2]); try { a.sort(); return 'ok'; } catch (e: any) { return e.constructor.name; } })()));
console.log('04 (function () { const a: any = Object.fre', show(() => (function () { const a: any = Object.freeze([2, 1]); try { a.sort(); return 'ok'; } catch (e: any) { return e.constructor.name; } })()));
console.log('05 (function () { const a: any = Object.fre', show(() => (function () { const a: any = Object.freeze([1, 2, 3]); try { a.sort(); return 'ok'; } catch (e: any) { return e.constructor.name; } })()));
console.log('06 (function () { const a: any = Object.fre', show(() => (function () { const a: any = Object.freeze([1, 2]); try { a.toSorted(); return 'ok'; } catch (e: any) { return e.constructor.name; } })()));
console.log('07 (function () { const a: any = [1]; Objec', show(() => (function () { const a: any = [1]; Object.preventExtensions(a); try { a.sort(); return 'ok'; } catch (e: any) { return e.constructor.name; } })()));
