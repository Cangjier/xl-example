// xl:title parseInt / parseFloat / Number() 的截断点与失败形态
// xl:judge stdout
// xl:end

console.log(parseInt("42px"), parseInt("  12  "), parseInt("0x1f"), parseInt("1f", 16));
console.log(parseInt("2", 2), parseInt("z", 36), parseInt("x"), parseInt(""));
console.log(parseFloat("3.14abc"), parseFloat(".5"), parseFloat("1e3"), Number(""), Number(" 7 "), Number("x"));
