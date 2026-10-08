// xl:title console.log 遇上 Map / Set / Error 的第一行 / 符号
// xl:judge stdout
// xl:end

console.log(new Map([["a", 1]]));
console.log(new Set([1, 2]));
console.log("Error: " + new Error("boom").message);
console.log(Symbol("s"));
