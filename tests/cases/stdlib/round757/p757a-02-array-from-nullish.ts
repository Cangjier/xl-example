// xl:title Array.from 的空值：TypeError
// xl:round 757
// xl:judge stdout
// xl:note 第 757 轮普查里的一条：**第 14 行当场红**——`Array.from(null)` 在 Node 里是
// xl:note `TypeError`，本仓原来一路走到「读 `Symbol.iterator`」才撞在引擎那句
// xl:note 「cannot read properties of null」上（**笼统的 `Error`**，
// xl:note 见 `props.xl.md` 第 136 轮那一处自己写着的已知差）。
// xl:note 第 757 轮在 `ArrayFromValues` 开头补上规范的第一步（空值 ⇒ `TypeError`），
// xl:note 并顺手钉住「数 / 布尔 / 符号 ⇒ 空数组」那一档（Node 也是空数组）。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('1 (function () { try { return Array.', show(() => (function () { try { return Array.from(null as any).length; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('2 (function () { try { return Array.', show(() => (function () { try { return Array.from(undefined as any).length; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('3 (function () { try { return Array.', show(() => (function () { try { return Array.from(null as any, (x: any) => x).length; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('4 (function () { return Array.from(1', show(() => (function () { return Array.from(1 as any).length; })()));
console.log('5 (function () { return Array.from(t', show(() => (function () { return Array.from(true as any).length; })()));
console.log('6 (function () { return Array.from("', show(() => (function () { return Array.from("" as any).length; })()));
console.log('7 (function () { return Array.from({', show(() => (function () { return Array.from({ a: 1 } as any).length; })()));
console.log('8 (function () { try { return Array.', show(() => (function () { try { return Array.from(null as any).length; } catch (e) { return (e as Error).name; } })()));
