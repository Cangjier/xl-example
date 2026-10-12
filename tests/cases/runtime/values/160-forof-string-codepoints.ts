// xl:title `for..of` 一个字符串：按码点、含代理对
// xl:round 330
// xl:judge stdout
// xl:end

let count = 0;
const seen: string[] = [];
for (const ch of "a\uD83D\uDE00b") {
  count = count + 1;
  seen.push(ch.length + ":" + ch);
}
console.log(count, seen.join(" "));
console.log("a\uD83D\uDE00b".length, [..."\uD83D\uDE00"].length);
