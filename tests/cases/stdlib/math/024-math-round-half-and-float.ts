// xl:title `Math.round` 的平局方向与浮点尾巴
// xl:round 305
// xl:judge stdout
// xl:end

console.log(Math.round(0.5), Math.round(-0.5), Math.round(2.5), Math.round(-2.5), Math.round(1.005 * 100) / 100);
