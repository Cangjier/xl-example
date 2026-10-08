// xl:title 逻辑赋值与逻辑运算符并排
// xl:round 738
// xl:judge stdout
// xl:end
const o: any = { a: 0, b: 1 };
o.a ||= 5;
o.b &&= 7;
o.c ??= 9;
console.log(o.a, o.b, o.c);
let x: any = 0;
x ||= 1 && 2;
console.log(x);
