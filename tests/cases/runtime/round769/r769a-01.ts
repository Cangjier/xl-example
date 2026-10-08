// xl:title 洞与复制族
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
console.log('01 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return a.toSorted().length; })()));
console.log('02 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return JSON.stringify(a.toSpliced(0, 0)); })()));
console.log('03 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return JSON.stringify(a.toReversed()); })()));
console.log('04 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return JSON.stringify(a.with(1, 9)); })()));
console.log('05 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return a.filter(() => true).length; })()));
console.log('06 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return a.map((x: any) => x * 2).length; })()));
console.log('07 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return a.join('-'); })()));
console.log('08 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return String(a.indexOf(undefined)); })()));
console.log('09 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return String(a.includes(undefined)); })()));
console.log('10 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return String(a.lastIndexOf(undefined)); })()));
console.log('11 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return String(a.findIndex((x: any) => x === undefined)); })()));
console.log('12 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return JSON.stringify(a.slice()); })()));
console.log('13 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return JSON.stringify([...a]); })()));
console.log('14 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return a.flat().length; })()));
console.log('15 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return JSON.stringify(a.splice(1, 1)); })()));
console.log('16 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return a.splice(1, 1).length; })()));
console.log('17 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return a.reduce((s: number, x: any) => s + (x === undefined ? 100 : x), 0); })()));
console.log('18 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return a.every((x: any) => x !== undefined); })()));
console.log('19 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return a.some((x: any) => x === undefined); })()));
console.log('20 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, , 3]; return JSON.stringify(Object.keys(a)); })()));
