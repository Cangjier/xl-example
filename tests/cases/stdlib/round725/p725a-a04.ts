// xl:title Set / Map 的迭代器上同一族助手
// xl:round 725
// xl:judge stdout
// xl:end
const s: any = new Set([1, 2, 3]).values();
console.log(typeof s.take, [...s.take(2)].join(","));
const m: any = new Map([[1, "a"], [2, "b"]]).entries();
console.log(typeof m.take, JSON.stringify([...m.take(1)]));
const mk: any = new Map([[1, "a"], [2, "b"]]).keys();
console.log([...mk.drop(1)].join(","));
const se: any = new Set([1, 2]).entries();
console.log(JSON.stringify(se.toArray()));
