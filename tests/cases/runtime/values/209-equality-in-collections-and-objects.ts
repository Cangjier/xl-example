// xl:title 集合与对象上的判等：引用、键、includes
// xl:round 371
// xl:judge stdout
// xl:end
const a = { v: 1 };
const b = { v: 1 };
const arr = [a, b];
console.log(arr.indexOf(b) >= 0, arr.includes(a), arr.indexOf({ v: 1 }));
const s = new Set([a, b, a]);
console.log(s.size, s.has(a), s.has({ v: 1 }));
const m = new Map([[a, "A"]]);
console.log(m.get(a), m.get(b), m.get({ v: 1 } as any));
console.log(a === b, a == b, JSON.stringify(a) === JSON.stringify(b));
