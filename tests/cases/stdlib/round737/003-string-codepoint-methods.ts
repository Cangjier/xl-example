// xl:title `String.prototype` 的码点方法（`codePointAt` / `fromCodePoint`）
// xl:round 737
// xl:judge stdout
// xl:end
const s = "\u{1F600}";
console.log(s.length, s.codePointAt(0), s.charCodeAt(0));
console.log(String.fromCodePoint(0x1F600).length, String.fromCodePoint(65, 66));
console.log(String.fromCharCode(0x1F600).length, String.fromCharCode(65));
console.log("\u{1F600}".codePointAt(2));
