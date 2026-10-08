// xl:title `charCodeAt` / `codePointAt` / `fromCodePoint` 的越界
// xl:round 691
// xl:judge stdout
// xl:end
console.log("A".charCodeAt(0), "A".charCodeAt(9), "A".charCodeAt(-1));
console.log("\u{1F600}".length, "\u{1F600}".codePointAt(0));
console.log(String.fromCodePoint(65, 128512));
console.log("abc".charAt(9), JSON.stringify("abc".charAt(9)));
