// xl:title new 不带括号 / new 一个表达式给出的构造函数
// xl:judge stdout
// xl:end

class Box { v = 5; }
const a = new Box;
console.log(a.v);
const ctor = Box;
const b = new ctor();
console.log(b.v, b instanceof Box);
console.log(new Date(0).getTime());
