// xl:title `for..of` 走 Map / Set（键值对解构）
// xl:judge stdout
// xl:end

const m = new Map([["a", 1], ["b", 2]]);
let s = "";
for (const [k, v] of m) s += k + v;
console.log(s);
const set = new Set([1, 2, 3]);
let t = 0;
for (const v of set) t += v;
console.log(t);
