// xl:title Unicode：代理对、码点、长度、切片
// xl:round 371
// xl:judge stdout
// xl:end
const s = "a\u{1F600}b\u{1F601}c";
console.log(s.length, [...s].length, Array.from(s).map((c) => c.length).join(","));
console.log(s.charAt(1).charCodeAt(0), s.charCodeAt(1), s.codePointAt(1));
console.log(s.slice(0, 3).length, s.substring(1, 3).length);
console.log(JSON.stringify(s), s.split("").length, s.split("b").length);
console.log(s.indexOf("b"), s.includes("\u{1F600}"), s.lastIndexOf("c"));
