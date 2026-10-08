// xl:title 类表达式与具名类表达式
// xl:round 291
// xl:judge stdout
// xl:end

const C = class { m() { return "c"; } };
const D = class Named extends C { m() { return super.m() + "D"; } };
console.log(new C().m(), new D().m(), typeof D);
