// xl:title String.normalize：NFC / NFD / NFKC 的形状
// xl:round 676
// xl:judge stdout
// xl:end

const s = "\u00e9";
console.log(s.length, s.normalize("NFD").length, s.normalize("NFC").length);
console.log(s.normalize("NFD").codePointAt(0), s.normalize("NFD").codePointAt(1));
console.log("\uFB01".normalize("NFKC"), "\uFB01".length);
