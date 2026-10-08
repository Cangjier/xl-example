// xl:title String.normalize：NFC 把组合字符合成一个
// xl:judge stdout
// xl:end

const s = "e\u0301";
console.log(s.length, s.normalize("NFC").length, s.normalize("NFC") === "\u00e9");
