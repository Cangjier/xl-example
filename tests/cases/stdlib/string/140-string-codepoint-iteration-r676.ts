// xl:title String.codePointAt / fromCodePoint / 迭代代理对
// xl:round 676
// xl:judge stdout
// xl:end

const s = "a\u{1F600}b";
console.log(s.length, [...s].length, s.codePointAt(1) === s.codePointAt(2));
console.log(String.fromCodePoint(97, 0x1f600), [...s].map((c) => c.codePointAt(0)!.toString(16)).join(","));
