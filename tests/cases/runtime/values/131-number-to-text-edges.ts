// xl:title 数字取文本的几个边界（1e21 / 1e-7 / 0.1+0.2 / toFixed）
// xl:round 305
// xl:judge stdout
// xl:end

console.log(String(1e21), String(1e-7), String(0.1 + 0.2), (1234.5678).toFixed(2));
