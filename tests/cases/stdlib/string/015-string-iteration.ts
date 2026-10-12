// xl:title 字符串可迭代 + 展开
// xl:judge stdout
// xl:end

let s = "";
for (const ch of "abc") s += ch + ".";
console.log(s, [..."xyz"].join("-"), "".length);
