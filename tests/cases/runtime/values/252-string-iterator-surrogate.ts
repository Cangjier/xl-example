// xl:title 字符串迭代按码点、length 按码元
// xl:round 8
// xl:judge stdout
// xl:end

const s = "a\u{1F600}b";
console.log(s.length, [...s].length, [...s].map((c) => c.length).join(","));
console.log(Array.from(s).join("|"));
