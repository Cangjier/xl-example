// xl:title 默认参数（引用前面的参数）+ 剩余参数
// xl:judge stdout
// xl:end

function join(sep: string = "-", ...parts: string[]): string { return parts.join(sep); }
console.log(join(), join("+", "a", "b"), join(undefined, "x"));
function grow(n: number, by: number = n): number { return n + by; }
console.log(grow(3), grow(3, 4));
