// xl:title 读路径上的下标访问器：一条助手收掉二十来处
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
console.log('01 JSON.stringify(mk().slice())', show(() => JSON.stringify(mk().slice())));
console.log('02 JSON.stringify(mk().toReversed())', show(() => JSON.stringify(mk().toReversed())));
console.log('03 JSON.stringify(mk().toSorted())', show(() => JSON.stringify(mk().toSorted())));
console.log('04 JSON.stringify(mk().toSpliced(0, 0))', show(() => JSON.stringify(mk().toSpliced(0, 0))));
console.log('05 JSON.stringify(mk().with(1, 8))', show(() => JSON.stringify(mk().with(1, 8))));
console.log('06 JSON.stringify(mk().concat([]))', show(() => JSON.stringify(mk().concat([]))));
console.log('07 JSON.stringify(mk().flat())', show(() => JSON.stringify(mk().flat())));
console.log('08 JSON.stringify(mk().filter(() => true))', show(() => JSON.stringify(mk().filter(() => true))));
console.log('09 JSON.stringify(mk().map((x: any) => x + ', show(() => JSON.stringify(mk().map((x: any) => x + 1))));
console.log('10 JSON.stringify([...mk()])', show(() => JSON.stringify([...mk()])));
console.log('11 JSON.stringify(Array.from(mk() as any))', show(() => JSON.stringify(Array.from(mk() as any))));
console.log('12 JSON.stringify(mk().join(\'-\'))', show(() => JSON.stringify(mk().join('-'))));
console.log('13 JSON.stringify(mk().entries().next())', show(() => JSON.stringify(mk().entries().next())));
console.log('14 JSON.stringify(mk().values().next())', show(() => JSON.stringify(mk().values().next())));
console.log('15 JSON.stringify(mk().keys().next())', show(() => JSON.stringify(mk().keys().next())));
console.log('16 JSON.stringify(Object.keys(mk()))', show(() => JSON.stringify(Object.keys(mk()))));
console.log('17 JSON.stringify(mk().indexOf(7))', show(() => JSON.stringify(mk().indexOf(7))));
console.log('18 JSON.stringify(mk().includes(7))', show(() => JSON.stringify(mk().includes(7))));
console.log('19 JSON.stringify(mk().at(0))', show(() => JSON.stringify(mk().at(0))));
console.log('20 JSON.stringify(mk().reduce((s: any, x: a', show(() => JSON.stringify(mk().reduce((s: any, x: any) => String(s) + String(x), ''))));
console.log('21 JSON.stringify(mk().find((x: any) => tru', show(() => JSON.stringify(mk().find((x: any) => true))));
console.log('22 JSON.stringify(mk().some((x: any) => x =', show(() => JSON.stringify(mk().some((x: any) => x === 7))));
console.log('23 JSON.stringify(mk().every((x: any) => x ', show(() => JSON.stringify(mk().every((x: any) => x === 7))));
console.log('24 JSON.stringify(JSON.stringify(mk()))', show(() => JSON.stringify(JSON.stringify(mk()))));
console.log('25 JSON.stringify((function () { const f = ', show(() => JSON.stringify((function () { const f = (a: any, b: any) => String(a) + String(b); return f.apply(null, mk() as any); })())));
