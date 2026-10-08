// xl:title 字符串迭代按码点：代理对合成一个
// xl:round 323
// xl:judge stdout
// xl:end

const s = "a\u{1F600}b";
console.log([...s].length, s.length);
console.log(Array.from(s).map((c) => c.length).join(","));
for (const ch of s) console.log(ch.length);
