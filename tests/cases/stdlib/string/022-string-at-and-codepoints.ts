// xl:title at / codePointAt / fromCodePoint 与代理对
// xl:judge stdout
// xl:end

const s = "a\u{1F600}b";
console.log(s.at(0), s.at(-1), s.at(99), s.at(1).length);
console.log(s.codePointAt(1), "A".codePointAt(0));
console.log(String.fromCodePoint(65, 0x1f600).length, String.fromCharCode(65, 66));
