// xl:title Object.keys / values / entries（自有可枚举、顺序）
// xl:judge stdout
// xl:end

const o = { b: 1, a: 2, 3: 3 };
console.log(Object.keys(o).join(","));
console.log(Object.values(o).join(","));
console.log(Object.entries(o).map((p) => p[0] + "=" + p[1]).join(","));
console.log(Object.keys([]).length, Object.keys("ab" as any).join(","));
