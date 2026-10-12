// xl:title 数字取文本的几种量级
// xl:round 291
// xl:judge stdout
// xl:end

console.log(0.1 + 0.2, 1e21, 1e-7, 123456789.123456789);
console.log((0.000001).toString(), (0.0000001).toString(), (-1e21).toString());
