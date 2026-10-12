// xl:title `arguments` 与具名函数表达式写在同一个函数里
// xl:round 332
// xl:judge stdout
// xl:end

const f = function self(a: number, b: number) {
  return self.name + ":" + arguments.length + ":" + a;
};
console.log(f(1, 2, 3));
console.log(typeof self);
function g(x: number) {
  const inner = () => arguments.length + self2();
  function self2() { return 1; }
  return inner();
}
console.log(g(9));
