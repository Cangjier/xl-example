// xl:title Map / Set 的遍历：keys、values、entries、forEach
// xl:round 323
// xl:judge stdout
// xl:end

const m = new Map([["a", 1], ["b", 2]]);
console.log([...m.keys()].join(","), [...m.values()].join(","));
console.log([...m.entries()].map(([k, v]) => k + v).join("|"));
m.forEach((v, k, self) => console.log(k, v, self.size));
const s = new Set([1, 2]);
s.forEach((v, v2) => console.log(v === v2));
