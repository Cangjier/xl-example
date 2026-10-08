// xl:title sort / toSorted 的比较器：不是函数就抛 TypeError
// xl:round 757
// xl:judge stdout
// xl:note 第 757 轮普查里的一条：16 行里**第 10 行当场红**——`[1, 2, 3].sort(1)` 在
// xl:note Node 里抛 `TypeError`（规范：比较器不是 undefined 就必须可调用），
// xl:note 本仓原来写成一个三目「不可调用就当没给」⇒ 静默按文本比。
// xl:note 第 757 轮把它改成「给了、但不是函数 ⇒ 抛」（`builtins/array.xl.md` 的
// xl:note `ArraySort` / `ArrayToSorted` 那一支）。这一条留着当守卫。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('1 (function () { const a: any[] = [3', show(() => (function () { const a: any[] = [3, 1, 2]; return a.sort().join(","); })()));
console.log('2 (function () { const a: any[] = [1', show(() => (function () { const a: any[] = [10, 9, 1]; return a.sort().join(","); })()));
console.log('3 (function () { const a: any[] = [3', show(() => (function () { const a: any[] = [3, undefined, 1, undefined, 2]; return a.sort().join(","); })()));
console.log('4 (function () { const a: any[] = [3', show(() => (function () { const a: any[] = [3, undefined, 1]; return a.sort().length; })()));
console.log('5 (function () { const a: any[] = [3', show(() => (function () { const a: any[] = [3, undefined, 1]; return Object.keys(a).join(","); })()));
console.log('6 (function () { const a: any[] = [3', show(() => (function () { const a: any[] = [3, 1, 2]; a.sort((x: any, y: any) => y - x); return a.join(","); })()));
console.log('7 (function () { const a: any[] = [1', show(() => (function () { const a: any[] = [1, 2, 3]; a.sort(() => 0); return a.join(","); })()));
console.log('8 (function () { const a: any[] = [{', show(() => (function () { const a: any[] = [{ k: 1, i: 0 }, { k: 1, i: 1 }, { k: 0, i: 2 }]; a.sort((x: any, y: any) => x.k - y.k); return a.map((e: any) => e.i).join(","); })()));
console.log('9 (function () { const a: any[] = [1', show(() => (function () { const a: any[] = [1, 2, 3]; return a.sort(undefined).join(","); })()));
console.log('10 (function () { const a: any[] = [1', show(() => (function () { const a: any[] = [1, 2, 3]; try { a.sort(1 as any); return "sorted"; } catch (e) { return (e as Error).constructor.name; } })()));
console.log('11 (function () { const a: any[] = [1', show(() => (function () { const a: any[] = [1, 2, 3]; return a.sort((x: any, y: any) => x - y).length; })()));
console.log('12 (function () { const a: any[] = ["', show(() => (function () { const a: any[] = ["b", "a"]; return a.sort().join(","); })()));
console.log('13 (function () { const a: any[] = [t', show(() => (function () { const a: any[] = [true, false, 1, 0]; return a.sort().join(","); })()));
console.log('14 (function () { const a: any[] = [1', show(() => (function () { const a: any[] = [1, 2, 3]; return a.sort().reverse().join(","); })()));
console.log('15 (function () { const a: any[] = [1', show(() => (function () { const a: any[] = [1, 2, 3]; return a.toSorted((x: any, y: any) => y - x).join(","); })()));
console.log('16 (function () { const a: any[] = [1', show(() => (function () { const a: any[] = [1, 2, 3]; a.toSorted((x: any, y: any) => y - x); return a.join(","); })()));
