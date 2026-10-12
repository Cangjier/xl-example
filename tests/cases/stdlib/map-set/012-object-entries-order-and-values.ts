// xl:title entries / values 的顺序与整数键
// xl:judge stdout
// xl:end

const o: any = { b: 1, 2: 2, a: 3, 1: 4 };
console.log(Object.entries(o).map((p) => p[0] + "=" + p[1]).join(","));
console.log(Object.values(o).join(","), Object.keys(o).length);
console.log(Object.entries({}).length, Object.values({}).length);
