// xl:title Array.from 直接吃 Map（配 mapfn）
// xl:round 291
// xl:judge stdout
// xl:end

const m = new Map([[1, "a"], [2, "b"]]);
console.log(Array.from(m, (pair) => pair[0] + pair[1]).join(","));
console.log(Array.from(m.keys()).join(","), Array.from(m.values()).join(","));
