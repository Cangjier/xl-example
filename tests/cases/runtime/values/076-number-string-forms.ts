// xl:title 数字转字符串：大数、小数、指数、负零
// xl:judge stdout
// xl:end

console.log(String(1e21), String(1e-7), String(-0), (1234.5678).toString(), (0.1 + 0.2).toString());
console.log((255).toString(16), (8).toString(2), (-0).toString(), Object.is(-0, -0));
