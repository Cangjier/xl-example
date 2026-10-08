// xl:title Number / parseInt / parseFloat：空白、后缀垃圾、空串、十六进制
// xl:judge stdout
// xl:end

console.log(Number(""), Number("  "), Number("1x"), Number("0x10"), Number("1e3"), Number(null), Number(undefined));
console.log(parseInt("12px", 10), parseInt("0x1f"), parseInt(""), parseInt("-7.9"), parseFloat("1.5e2x"));
console.log(Number.isNaN(Number("x")), Number.isFinite(Number("1")), isFinite("1"));
