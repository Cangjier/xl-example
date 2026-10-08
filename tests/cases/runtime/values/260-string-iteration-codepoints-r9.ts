// xl:title 字符串按码点迭代与代理对
// xl:round 9
// xl:judge stdout
// xl:end

const s = "a\u{1F600}b";
console.log(s.length, [...s].length);
console.log([...s].map((c) => c.codePointAt(0)!.toString(16)).join(","));
console.log(s.at(-1), s.at(0));
