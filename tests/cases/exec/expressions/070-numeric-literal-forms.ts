// xl:title 数字字面量：分隔符、进制、指数、BigInt 之外的全部形态
// xl:round 371
// xl:judge stdout
// xl:end
const forms = [1_000_000, 0b1010, 0o17, 0xff, 1e3, 1E-2, 0.5, .5, 5., 1_0.5_0];
console.log(forms.join(","));
console.log(0.1 + 0.2, 1e21, 1e-7, 9007199254740991, 0x10 + 0o10 + 0b10);
console.log((123.456).toFixed(2), 1_000 + 1);
