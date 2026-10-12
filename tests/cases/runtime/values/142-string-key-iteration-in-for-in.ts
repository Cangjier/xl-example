// xl:title `for..in` 一个字符串：键是下标文本
// xl:round 305
// xl:judge stdout
// xl:end

let keys = "";
for (const k in "abc") keys += k;
console.log(keys);
