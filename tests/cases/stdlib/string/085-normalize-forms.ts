// xl:title `normalize` 的四个形态与非法形态
// xl:round 332
// xl:judge stdout
// xl:end

const composed = "\u00e9";
const decomposed = "e\u0301";
console.log(composed.length, decomposed.length);
console.log(decomposed.normalize("NFC").length, decomposed.normalize("NFC") === composed);
console.log(composed.normalize("NFD").length, composed.normalize("NFD") === decomposed);
console.log("abc".normalize("NFKC"), "\uFB01".normalize("NFKC"), "\uFB01".length);
try {
  "abc".normalize("NFX");
} catch (e) {
  console.log((e as Error).name);
}
