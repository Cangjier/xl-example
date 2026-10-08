// xl:title toFixed 的舍入与补零
// xl:judge stdout
// xl:end

console.log((1.005).toFixed(2), (1.55).toFixed(1), (2).toFixed(2), (0).toFixed(0));
console.log((-1.5).toFixed(1), (1234.5678).toFixed(3), (1e21).toFixed(2));
