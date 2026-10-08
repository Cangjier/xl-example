// xl:title 标签模板对象：冻结、`raw` 的描述符、每次求值新建
// xl:round 754
// xl:judge stdout
// xl:note 第 754 轮普查里的一条（期望值由 `node` 现给，打印口径 `typeof:值`）
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => Object.isFrozen(s); return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => Object.isFrozen(s.raw); return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => JSON.stringify(Object.getOwnPropertyDescriptor(s, "raw")); return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => Object.keys(s).join(","); return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => s.raw.length; return tag`a${1}b`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => s.length; return tag`a${1}b`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => s.raw[0]; return tag`a\nb`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => s[0]; return tag`a\nb`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => Array.isArray(s) && Array.isArray(s.raw); return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => Object.getPrototypeOf(s) === Array.prototype; return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => { try { s.push(9); return "pushed"; } catch (e) { return (e as Error).constructor.name; } }; return tag`x`; })()));
console.log('(function () { const tag = (s:', show(() => (function () { const tag = (s: any) => { try { s.raw = 1; return "wrote"; } catch (e) { return (e as Error).constructor.name; } }; return tag`x`; })()));
