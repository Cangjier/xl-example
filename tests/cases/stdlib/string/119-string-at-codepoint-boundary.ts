// xl:title String.at / codePointAt：负下标与代理对边界
// xl:judge stdout
// xl:end

const s = "a😀b";
console.log(s.length, s.at(0), s.at(-1), s.at(1), s.at(99));
console.log(s.codePointAt(1) === 0x1f600, s.codePointAt(0), s.codePointAt(99));
console.log("abc".charCodeAt(1), "abc".charCodeAt(9), Number.isNaN("abc".charCodeAt(9)));
