// xl:title `normalize` 的四种形式在纯 ASCII 上是恒等
// xl:round 305
// xl:judge stdout
// xl:end

console.log("abc".normalize("NFC"), "abc".normalize("NFD"), "abc".normalize(), "abc".normalize("NFKC") === "abc");
