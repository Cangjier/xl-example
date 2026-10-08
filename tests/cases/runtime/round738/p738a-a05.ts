// xl:title 逻辑链套在括号 / 实参 / 三元里
// xl:round 738
// xl:judge stdout
// xl:end
function f(v: any) { return "f:" + v; }
console.log(f(1 && 2), f(0 || 3), f(null ?? 4));
console.log((1 && 2) || 3, 1 && (2 || 3), (1 || 2) && 3);
console.log(1 && 2 ? "a" : "b", 0 || 3 ? "c" : "d");
console.log([1 && 2, 0 || 3].join(","), { v: 1 && 5 }.v);
