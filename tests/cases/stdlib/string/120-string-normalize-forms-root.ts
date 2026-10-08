// xl:title String.normalize：NFC / NFD / 省略实参都是确定的
// xl:judge stdout
// xl:end

const s = "\u00e9";
console.log(s.length, s.normalize().length, s.normalize("NFD").length, s.normalize("NFC") === s);
console.log("\u0041\u030a".normalize("NFC"), "\u0041\u030a".normalize("NFD").length);
