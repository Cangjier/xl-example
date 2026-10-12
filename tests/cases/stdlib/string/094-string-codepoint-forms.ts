// xl:title codePointAt / fromCodePoint / 代理对
// xl:round 371
// xl:judge stdout
// xl:end
const s = "a\u{1F600}b";
console.log(s.length, [...s].length);
console.log(s.codePointAt(0), s.codePointAt(1), s.codePointAt(2), s.codePointAt(3));
console.log(String.fromCodePoint(97), String.fromCodePoint(0x1f600).length);
console.log(String.fromCharCode(0x1f600).length, String.fromCharCode(65, 66));
try { String.fromCodePoint(-1); } catch (e) { console.log((e as Error).name); }
