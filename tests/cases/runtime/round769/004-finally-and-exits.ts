// xl:title finally 与出口
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
console.log('01 (function () { try { return \'a\'; }', show(() => (function () { try { return 'a'; } finally { } })()));
console.log('02 (function () { function f() { try ', show(() => (function () { function f() { try { return 'a'; } finally { return 'b'; } } return f(); })()));
console.log('03 (function () { function f() { try ', show(() => (function () { function f() { try { throw new Error('x'); } finally { return 'b'; } } return f(); })()));
console.log('04 (function () { function f() { for ', show(() => (function () { function f() { for (const x of [1, 2, 3]) { try { if (x === 2) continue; if (x === 3) break; } finally { } } return 'done'; } return f(); })()));
console.log('05 (function () { let log = \'\'; for (', show(() => (function () { let log = ''; for (const x of [1, 2]) { try { continue; } finally { log += 'f' + x; } } return log; })()));
console.log('06 (function () { let log = \'\'; outer', show(() => (function () { let log = ''; outer: for (const x of [1, 2]) { try { break outer; } finally { log += 'f' + x; } } return log; })()));
console.log('07 (function () { let log = \'\'; try {', show(() => (function () { let log = ''; try { try { throw new Error('a'); } finally { log += 'in'; } } catch (e) { log += 'c'; } return log; })()));
console.log('08 (function () { function f() { try ', show(() => (function () { function f() { try { throw new Error('a'); } catch { return 'c'; } finally { } } return f(); })()));
console.log('09 (function () { function f() { try ', show(() => (function () { function f() { try { return 1; } finally { throw new Error('z'); } } try { return f(); } catch (e) { return 'caught'; } })()));
console.log('10 (function () { let n = 0; try { n ', show(() => (function () { let n = 0; try { n += 1; } finally { n += 2; } return n; })()));
console.log('11 (function () { function f() { try ', show(() => (function () { function f() { try { return 1; } catch (e) { return 2; } finally { return 3; } } return f(); })()));
console.log('12 (function () { const e = new Error', show(() => (function () { const e = new Error('m'); try { throw e; } catch (x: any) { return x === e; } })()));
console.log('13 (function () { try { throw 1; } ca', show(() => (function () { try { throw 1; } catch (x: any) { return typeof x; } })()));
console.log('14 (function () { try { throw undefin', show(() => (function () { try { throw undefined; } catch (x: any) { return String(x); } })()));
console.log('15 (function () { try { null!.x; } ca', show(() => (function () { try { null!.x; } catch (e: any) { return e.constructor.name; } })()));
