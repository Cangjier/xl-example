// xl:title 函数对象的 toString / name / length 三个内省口
// xl:round 371
// xl:judge stdout
// xl:end
function named(a: number, b: number) { return a + b; }
console.log(named.name, named.length, named.toString().startsWith("function named"));
const arrow = (x: number) => x;
console.log(arrow.name, arrow.length);
const obj = { m() { return 0; }, get g() { return 1; } };
console.log(obj.m.name, Object.getOwnPropertyDescriptor(obj, "g")!.get!.name);
console.log((function () { return 0; }).name === "", typeof Function.prototype);
