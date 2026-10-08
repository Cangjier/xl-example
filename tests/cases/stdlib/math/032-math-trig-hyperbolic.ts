// xl:title 三角函数与双曲函数在 0 / π / 大值上的读数
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Math.sin(0), Math.cos(0), Math.tan(0));
console.log(Math.sin(Math.PI / 2), Math.cos(Math.PI));
console.log(Math.asin(0), Math.acos(1), Math.atan(0), Math.atan2(0, -1) === Math.PI);
console.log(Math.sinh(0), Math.cosh(0), Math.tanh(0));
console.log(Math.asinh(0), Math.acosh(1), Math.atanh(0));
console.log(Math.sin(Infinity), Math.atan2(0, 0));
