// xl:title JSON 的嵌套、特殊值丢掉、以及循环引用
// xl:round 323
// xl:judge stdout
// xl:end

const o: any = { a: [1, { b: 2 }], c: null, d: undefined, e: () => 1, f: "x" };
console.log(JSON.stringify(o));
console.log(JSON.stringify([undefined, null, NaN, Infinity]));
console.log(JSON.stringify({ n: 1 }, null, 2).split("\n").length);
const cyc: any = {}; cyc.self = cyc;
try { JSON.stringify(cyc); } catch (e) { console.log((e as Error).name); }
