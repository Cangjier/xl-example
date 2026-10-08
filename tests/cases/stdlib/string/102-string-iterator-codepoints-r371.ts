// xl:title 字符串迭代按码点、下标按码元（两把尺子的差别）
// xl:round 371
// xl:judge stdout
// xl:end
const s = "a\u{1F600}b";
console.log(s.length, [...s].length, Array.from(s).length);
console.log([...s].map((c) => c.length).join(","));
for (const ch of s) console.log("ch", ch.length);
console.log(s[1], s[2], s.slice(1, 3).length);
