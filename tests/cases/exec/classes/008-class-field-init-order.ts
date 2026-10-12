// xl:title 字段初始化顺序：基类先、自己的按声明顺序
// xl:judge stdout
// xl:end

const log: string[] = [];
class A { x = (log.push("A.x"), 1); constructor() { log.push("A.ctor"); } }
class B extends A { y = (log.push("B.y"), 2); constructor() { super(); log.push("B.ctor"); } }
const b = new B();
console.log(b.x, b.y, log.join(","));
