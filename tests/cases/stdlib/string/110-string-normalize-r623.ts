// xl:title String.normalize 的四种形式
// xl:round 623
// xl:judge stdout
// xl:end

const s = "\u00e9";
console.log(s.normalize("NFC") === s, s.normalize("NFD").length, s.normalize().length);
console.log("\u0041\u030a".normalize("NFC"), "\u00c5".normalize("NFD").length);
