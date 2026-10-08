// xl:title 数值 → 文本的几处边界写法
// xl:round 330
// xl:judge stdout
// xl:end

console.log((1e21).toString(), (1e-7).toString(), (0.000001).toString());
console.log((-0).toString(), (123456789012345680000).toString());
console.log((255).toString(16), (8).toString(2), (1.5).toString());
