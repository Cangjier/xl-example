// xl:title `replace` 的 `$&` / `$1` / 函数形式（不带正则）
// xl:round 691
// xl:judge stdout
// xl:end
console.log("abc".replace("b", "[$&]"));
console.log("abc".replace("b", "$'"));
console.log("abc".replace("b", (_m: any, ...rest: any[]) => m0(rest)));
function m0(rest: any[]): string { return "[" + rest.join("|") + "]"; }
console.log("a-b".split("-", 1).join(","));
