// xl:title 全局 parseInt / parseFloat（含基数与半个数字）
// xl:judge stdout
// xl:end

console.log(parseInt("12"), parseInt("12.9"), parseInt("0x1f"), parseInt("ff", 16), parseInt("z"));
console.log(parseFloat("1.5"), parseFloat("1.5e2"), parseFloat("x"), parseFloat(".5"));
