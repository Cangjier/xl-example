// xl:title 三层继承与 super 方法链
// xl:round 291
// xl:judge stdout
// xl:end

class Base { m() { return "base"; } }
class Mid extends Base { m() { return super.m() + "-mid"; } }
class Leaf extends Mid { m() { return super.m() + "-leaf"; } }
console.log(new Leaf().m(), new Leaf() instanceof Base);
