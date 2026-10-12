// xl:title 模板字面量与标签模板：`raw`、`length`、插值个数、冻结、`String.raw`
// xl:round 762
// xl:judge stdout
// xl:note 第 762 轮普查里**全过**的一片，收进矩阵当守卫（含 `` t`a${1}b${2}` `` 的 `v.length`、
// xl:note `s.length` 比插值个数多一、`s.raw` 与 `String.raw` 对转义的不同处理、
// xl:note **标签模板对象是冻的**（`Object.isFrozen(s)` 与 `Object.isFrozen(s.raw)` 两格都真——
// xl:note 第 754 轮收掉的那一处，这里当守卫）、以及插值里再套模板）。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 `a${1}b`', show(() => `a${1}b`));
console.log('02 `${1}${2}`', show(() => `${1}${2}`));
console.log('03 `a\\nb`', show(() => `a\nb`));
console.log('04 String.raw`a\\nb`', show(() => String.raw`a\nb`));
console.log('05 (function () { const t = (s: any, ', show(() => (function () { const t = (s: any, ...v: any[]) => s.raw[0]; return t`x\ny`; })()));
console.log('06 (function () { const t = (s: any, ', show(() => (function () { const t = (s: any, ...v: any[]) => v.length; return t`a${1}b${2}`; })()));
console.log('07 (function () { const t = (s: any, ', show(() => (function () { const t = (s: any, ...v: any[]) => s.length; return t`a${1}b`; })()));
console.log('08 (function () { const t = (s: any, ', show(() => (function () { const t = (s: any, ...v: any[]) => s[0] + v[0] + s[1]; return t`a${1}b`; })()));
console.log('09 `${`${1}`}`', show(() => `${`${1}`}`));
console.log('10 (function () { const o = { toStrin', show(() => (function () { const o = { toString() { return "T"; } }; return `${o}`; })()));
console.log('11 (function () { const t = (s: any) ', show(() => (function () { const t = (s: any) => s === undefined; return t``; })()));
console.log('12 (function () { const t = (s: any, ', show(() => (function () { const t = (s: any, ...v: any[]) => String(v[0]); return t`${undefined}`; })()));
console.log('13 (function () { const t = (s: any) ', show(() => (function () { const t = (s: any) => Object.isFrozen(s); return t`a`; })()));
console.log('14 (function () { const t = (s: any) ', show(() => (function () { const t = (s: any) => Object.isFrozen(s.raw); return t`a`; })()));
console.log('15 (function () { const t = (s: any, ', show(() => (function () { const t = (s: any, ...v: any[]) => s.raw.length; return t`a${1}b`; })()));
console.log('16 `${1 + 1}`', show(() => `${1 + 1}`));
console.log('17 `${"a"}${null}`', show(() => `${"a"}${null}`));
console.log('18 typeof `x`', show(() => typeof `x`));
