// xl:title 字符串的越界与代理对：`charAt` / `at` / `codePointAt` / 下标
// xl:round 750
// xl:judge stdout
// xl:end
const s = "a😀b";
console.log(s.length, s[1], s[2], s.charAt(1).length, s.charCodeAt(1));
console.log(s.at(1)!.length, s.codePointAt(1), s.codePointAt(0));
console.log(s.slice(1, 3).length, s.slice(1, 3) === s[1] + s[2]);
console.log([...s].length, Array.from(s).length);
console.log(s.indexOf("b"), s.lastIndexOf("b"), s.includes("😀"));
console.log("abc".charAt(10), "abc"[10], "abc".at(-1), "abc".at(10));
