// xl:title Object.keys / values / entries：整数键先、插入序
// xl:round 9
// xl:judge stdout
// xl:end

const o: any = { b: 1, 2: "two", a: 3, 1: "one" };
console.log(Object.keys(o).join(","));
console.log(Object.values(o).join(","));
console.log(Object.entries(o).map(([k, v]) => k + "=" + v).join(" "));
console.log(Object.keys({}).length, Object.entries({ x: 1 }).length);
