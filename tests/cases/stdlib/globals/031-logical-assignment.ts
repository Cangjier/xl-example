// xl:title 逻辑赋值 ??= ||= &&= 的短路与返回
// xl:round 623
// xl:judge stdout
// xl:end

let a: any = null;
a ??= 1; a ??= 2;
let b: any = 0;
b ||= 3; b &&= 4;
console.log(a, b);
const o: any = {};
o.x ??= "y";
console.log(o.x);
