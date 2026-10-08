// xl:title var 的提升与函数作用域（let 的 TDZ 不谈）
// xl:round 623
// xl:judge stdout
// xl:end

function f() {
  console.log(typeof v);
  var v = 1;
  return v;
}
console.log(f(), typeof v);
