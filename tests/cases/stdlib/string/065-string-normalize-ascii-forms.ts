// xl:title normalize 在已规范化的串上是恒等
// xl:round 304
// xl:judge stdout
// xl:end

const s = "abc";
console.log(s.normalize(), s.normalize("NFC") === s, s.normalize("NFD") === s);
console.log("e\u0301".normalize("NFC").length, "\u00e9".normalize("NFD").length);
