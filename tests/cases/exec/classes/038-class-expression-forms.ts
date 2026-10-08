// xl:title 类表达式：匿名、具名自引用、extends 表达式
// xl:round 371
// xl:judge stdout
// xl:end
const A = class { v = 1; };
const B = class Named { static self(): string { return Named.name; } v = 2; };
const Base = class { base(): string { return "b"; } };
const C = class extends Base { extra(): string { return this.base() + "c"; } };
const pick = true;
const D = class extends (pick ? Base : (class {})) { };
console.log(new A().v, new B().v, B.self(), new C().extra(), new D() instanceof Base);
