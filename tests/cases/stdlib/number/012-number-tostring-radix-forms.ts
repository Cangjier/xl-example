// xl:title toString 的进制（2 / 8 / 16 / 36）与负数
// xl:judge stdout
// xl:end

console.log((255).toString(16), (255).toString(2), (8).toString(8), (35).toString(36));
console.log((-255).toString(16), (0).toString(16), (1.5).toString(2).length > 0);
