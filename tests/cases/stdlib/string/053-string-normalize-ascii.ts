// xl:title normalize：ASCII 上原样、组合字符上合一
// xl:round 291
// xl:judge stdout
// xl:end

console.log("abc".normalize("NFC"), "e\u0301".normalize("NFC").length, "e\u0301".length);
