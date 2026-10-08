// xl:title 类表达式赋值给常量 · 静态方法里的 this 是构造函数
// xl:judge stdout
// xl:end

const C = class Named { static who() { return this.name; } };
console.log(C.who());
C.name = "Renamed";
console.log(C.who());
