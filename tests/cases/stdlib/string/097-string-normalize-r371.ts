// xl:title normalize 的 NFC / NFD / 无实参
// xl:round 371
// xl:judge stdout
// xl:end
const composed = "\u00e9";
const decomposed = "e\u0301";
console.log(composed.length, decomposed.length);
console.log(composed.normalize("NFD").length, decomposed.normalize("NFC").length);
console.log(composed.normalize("NFC") === composed, composed.normalize() === composed);
console.log(decomposed.normalize("NFC") === composed);
