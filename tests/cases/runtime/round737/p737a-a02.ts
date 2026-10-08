// xl:title 字符串的**码点迭代**（代理对算一格）
// xl:round 737
// xl:judge stdout
// xl:end
const s = "a\u{1F600}b";
console.log(s.length, [...s].length, [...s].join("|"));
const out: string[] = [];
for (const ch of s) out.push(ch.length + "");
console.log(out.join(","));
console.log(s.charAt(1), s.codePointAt(1), s.charCodeAt(1));
