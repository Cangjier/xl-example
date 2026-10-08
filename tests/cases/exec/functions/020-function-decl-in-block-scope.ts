// xl:title 块里的函数声明：块内可见、块外是另一格
// xl:judge stdout
// xl:end

function f() {
  { function g() { return "inner"; } console.log(g()); }
  return typeof g;
}
console.log(f());
const h = function named() { return "named"; };
console.log(h(), typeof named);
