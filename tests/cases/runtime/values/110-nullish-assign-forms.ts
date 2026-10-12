// xl:title ??= / ||= / &&= 与副作用的次数
// xl:round 304
// xl:judge stdout
// xl:end

let calls = 0;
const bump = () => { calls += 1; return undefined; };
let a: any = null;
a ??= "filled";
let b: any = "keep";
b ||= "no";
let c: any = 1;
c &&= c + 1;
console.log(a, b, c, calls);
let d: any = undefined;
d ??= bump();
console.log(d, calls);
