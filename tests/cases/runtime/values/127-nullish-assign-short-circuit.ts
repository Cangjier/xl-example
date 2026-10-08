// xl:title `??=` 短路：左值不是 null/undefined 时右边**不求值**
// xl:round 305
// xl:judge stdout
// xl:end

let a: any = 0;
let b: any = null;
let calls = 0;
const f = () => { calls++; return 5; };
a ??= f();
b ??= f();
console.log(a, b, calls);
