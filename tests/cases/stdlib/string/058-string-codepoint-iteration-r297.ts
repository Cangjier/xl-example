// xl:title 字符串迭代按码点：代理对合成一个、孤立代理原样、JSON 里落单的要转义
// xl:round 297
// xl:judge stdout
// xl:end

const s = "a\u{1F600}b";
const seen: string[] = [];
for (const c of s) seen.push(c);
console.log(s.length, [...s].length, Array.from(s).length, seen.length, seen[1].length);
const [x, y] = "a\u{1F600}";
console.log(x, y.length, [..."\uDC00\uD800"].length);
console.log(JSON.stringify([..."\uD800"]), JSON.stringify("\uD83D\uDE00"));
