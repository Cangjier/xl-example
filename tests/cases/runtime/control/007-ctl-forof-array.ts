// xl:title `for..of`：数组、字符串、以及中途 break
// xl:judge stdout
// xl:end

let s = "";
for (const ch of "abc") s += ch.toUpperCase();
console.log(s);
const xs = [10, 20, 30];
let total = 0;
for (const x of xs) { if (x === 20) continue; total += x; }
console.log(total);
for (const x of xs) { if (x === 20) break; console.log("hit", x); }
