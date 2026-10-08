// xl:title 代理对：for..of 一次一个码点，下标一次一个码元
// xl:judge stdout
// xl:end

const s = "a\u{1F600}b";
console.log(s.length, [...s].length, Array.from(s).length);
const seen: string[] = [];
for (const ch of s) seen.push(ch);
console.log(seen.length, seen[1].length);
console.log(s[1].length);
