// xl:title 实参位里的各种表达式：三元 / 逻辑 / 展开 / 逗号
// xl:judge stdout
// xl:end

function f(...xs: any[]): string { return xs.join("|"); }
const flags = [1, 2];
console.log(f(true ? "t" : "f", null ?? "n", 0 || "o", ...flags, (1, 2)));
console.log(f([1, 2].length, { a: 1 }.a, typeof 1));
