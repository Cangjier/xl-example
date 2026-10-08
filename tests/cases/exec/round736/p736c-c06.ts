// xl:title 类表达式的 `name` 与 `toString` 形状
// xl:round 736
// xl:judge stdout
// xl:end
const C = class Named {};
const D = class {};
console.log(C.name, D.name);
const inst = new (class { m() { return 1; } })();
console.log(inst.m(), typeof inst.constructor);
console.log(String(C).indexOf("class") === 0, C.name.length);
