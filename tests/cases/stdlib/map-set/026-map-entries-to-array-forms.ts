// xl:title Map 与 Object.entries / Array.from 互转
// xl:judge stdout
// xl:end

const m = new Map(Object.entries({ a: 1, b: 2 }));
console.log([...m.keys()].join(","), m.get("b"));
console.log(Array.from(new Map([[1, "x"], [2, "y"]]), ([k, v]) => k + v).join(","));
