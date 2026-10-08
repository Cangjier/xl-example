// xl:title 码元与码点：at / codePointAt / fromCodePoint
// xl:round 291
// xl:judge stdout
// xl:end

const s = "a😀b";
console.log(s.length, s.codePointAt(1), s.charAt(1).length);
console.log(s.at(0), s.at(-1), s.at(10));
console.log(String.fromCodePoint(97, 128512));
