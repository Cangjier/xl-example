// xl:title 循环绑定与闭包 / 提升
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
console.log('01 (function () { const fs: any[] = [', show(() => (function () { const fs: any[] = []; for (let i = 0; i < 3; i++) fs.push(() => i); return fs.map((f: any) => f()).join(','); })()));
console.log('02 (function () { const fs: any[] = [', show(() => (function () { const fs: any[] = []; for (var i = 0; i < 3; i++) fs.push(() => i); return fs.map((f: any) => f()).join(','); })()));
console.log('03 (function () { const fs: any[] = [', show(() => (function () { const fs: any[] = []; for (const x of [1, 2]) fs.push(() => x); return fs.map((f: any) => f()).join(','); })()));
console.log('04 (function () { const fs: any[] = [', show(() => (function () { const fs: any[] = []; for (const k in { a: 1, b: 2 }) fs.push(() => k); return fs.map((f: any) => f()).join(','); })()));
console.log('05 (function () { const fs: any[] = [', show(() => (function () { const fs: any[] = []; let i = 0; while (i < 2) { const j = i; fs.push(() => j); i++; } return fs.map((f: any) => f()).join(','); })()));
console.log('06 (function () { return typeof x; va', show(() => (function () { return typeof x; var x = 1; })()));
console.log('07 (function () { return typeof f; fu', show(() => (function () { return typeof f; function f() {} })()));
console.log('08 (function () { if (true) { functio', show(() => (function () { if (true) { function g() { return 1; } } return typeof g; })()));
console.log('09 (function () { const fs: any[] = [', show(() => (function () { const fs: any[] = []; for (let i = 0; i < 2; i++) { const j = i * 10; fs.push(() => j + i); } return fs.map((f: any) => f()).join(','); })()));
console.log('10 (function () { let out = \'\'; for (', show(() => (function () { let out = ''; for (let i = 0; i < 2; i++) { try { continue; } finally { out += i; } } return out; })()));
console.log('11 (function () { const o: any = { a:', show(() => (function () { const o: any = { a: 1 }; const fs: any[] = []; for (const k in o) { fs.push(() => k); delete o.a; } return fs.map((f: any) => f()).join(','); })()));
console.log('12 (function () { let s = \'\'; for (le', show(() => (function () { let s = ''; for (let i = 0, j = 3; i < j; i++, j--) s += i + '' + j; return s; })()));
console.log('13 (function () { let s = \'\'; for (le', show(() => (function () { let s = ''; for (let i = 0; i < 3; i++) { if (i === 1) continue; s += i; } return s; })()));
console.log('14 (function () { let n = 0; do { n++', show(() => (function () { let n = 0; do { n++; } while (false); return n; })()));
console.log('15 (function () { let n = 0; for (;;)', show(() => (function () { let n = 0; for (;;) { n++; if (n > 2) break; } return n; })()));
