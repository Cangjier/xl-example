// xl:title parseInt / parseFloat / Number 的边角
// xl:round 623
// xl:judge stdout
// xl:end

console.log(parseInt("0x1f"), parseInt("12px"), parseInt("-3"), parseInt("z", 36));
console.log(parseFloat("1.5e2"), parseFloat(".5"), parseFloat("x"));
console.log(Number(""), Number(" 12 "), Number("x"), Number(true), Number(null));
