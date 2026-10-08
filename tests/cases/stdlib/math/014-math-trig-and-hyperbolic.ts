// xl:title 三角与双曲：sin / cos / tan / atan2 / sinh 的确定读数
// xl:judge stdout
// xl:end

console.log(Math.sin(0), Math.cos(0), Math.tan(0), Math.sin(Math.PI / 2));
console.log(Math.atan2(0, 1), Math.atan2(1, 0), Math.asin(0), Math.acos(1));
console.log(Math.sinh(0), Math.cosh(0), Math.tanh(0), Math.sinh(1) > 1.17);
