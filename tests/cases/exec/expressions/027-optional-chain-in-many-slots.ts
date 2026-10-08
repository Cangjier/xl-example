// xl:title 可选链落在实参 / 数组元素 / 模板 / 条件里（第 143 轮那一族）
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
function f(v: any) { return v === undefined ? "u" : v; }
console.log(f(o?.a), f(o?.missing), [o?.a, o?.b].join(","));
console.log(`${o?.a}|${o?.b}`);
if (o?.a) console.log("truthy");
console.log(o?.a?.toString?.().length ?? -1);
