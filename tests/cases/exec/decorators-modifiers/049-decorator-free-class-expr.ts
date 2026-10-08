// xl:title 类表达式：具名 / 匿名 / 立即实例化 / 作为返回值
// xl:round 9
// xl:judge stdout
// xl:end

const A = class { m() { return "anon"; } };
const B = class Named { m() { return "named"; } };
console.log(new A().m(), new B().m(), B.name);
function make() { return class { v = 7; }; }
console.log(new (make())().v);
