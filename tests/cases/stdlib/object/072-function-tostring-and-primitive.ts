// xl:title `f.toString()` 与 `f + 1` 各走一条路、读同一格
// xl:round 334
// xl:judge stdout
// xl:end

function named(a: number): number { return a + 1; }
const arrow = (n: number) => n;
console.log(typeof named.toString(), named.toString().includes("named"));
console.log(arrow.toString().startsWith("(n"), String(named) === named.toString());
console.log((named + 1).endsWith("1"), named.toString().indexOf("return a + 1") > 0);
const obj = { m() { return 1; } };
console.log(obj.m.toString().includes("m"), typeof obj.m.toString());
console.log([].push.toString().includes("native"), typeof (() => 1).toString());
