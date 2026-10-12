// xl:title 实参里写箭头 / 括号 / 逗号，边界要收得住
// xl:judge stdout
// xl:end

console.log([1, 2].map((v) => v * 2).join(","));
console.log([3, 1].sort((a, b) => (a < b ? -1 : 1)).join(","));
function call(f: any, x: number) { return f(x); }
console.log(call((n) => n + 1, 5), (1, 2));
