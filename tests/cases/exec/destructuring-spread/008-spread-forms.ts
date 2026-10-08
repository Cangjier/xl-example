// xl:title 展开：调用、new、数组、对象、rest 参数
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
const xs = [1, 2, 3];
function sum(...ns: number[]): number { return ns.reduce((a, b) => a + b, 0); }
class P { constructor(public vals: number[]) {} }
const obj = { a: 1, ...{ b: 2 }, ...(true ? { c: 3 } : {}) };
console.log(sum(...xs), sum(...xs, 4), Math.max(...xs));
console.log(new P([...xs]).vals.length, JSON.stringify([0, ...xs, 4]));
console.log(JSON.stringify({ ...obj, a: 9 }), JSON.stringify({ ...xs }));
