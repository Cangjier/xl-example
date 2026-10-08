// xl:title 类表达式的**字段初始化式**要看得见外层的变量
// xl:judge stdout
// xl:end

function make(k: number) {
  return class { v = k; };
}
console.log(new (make(5))().v);
const outer = 7;
const C = class { w = outer; };
console.log(new C().w);
