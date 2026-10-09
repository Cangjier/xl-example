// xl:title 控制流：`switch`、标签、`try` 的收尾与短路
// xl:round 753
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
console.log('(function () { let s = ""; swi', show(() => (function () { let s = ""; switch (1) { case 1: s += "a"; case 2: s += "b"; break; default: s += "c"; } return s; })()));
console.log('(function () { let s = ""; swi', show(() => (function () { let s = ""; switch (9) { case 1: s += "a"; break; default: s += "d"; } return s; })()));
console.log('(function () { let s = ""; out', show(() => (function () { let s = ""; outer: for (const x of [1, 2]) { for (const y of [1, 2]) { if (y === 2) continue outer; s += String(x) + String(y); } } return s; })()));
console.log('(function () { let s = ""; do ', show(() => (function () { let s = ""; do { s += "x"; } while (false); return s; })()));
console.log('(function () { try { return "t', show(() => (function () { try { return "t"; } finally { } })()));
console.log('(function () { try { return "t', show(() => (function () { try { return "t"; } finally { return "f"; } })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = null; return o?.a ?? "d"; })()));
console.log('(function () { let n = 0; fals', show(() => (function () { let n = 0; false && n++; true || n++; return n; })()));
console.log('(function () { let s = ""; for', show(() => (function () { let s = ""; for (let i = 0; i < 3; i++) { if (i === 1) continue; s += String(i); } return s; })()));
