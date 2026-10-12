// xl:title 解构默认值 + 默认值里的 this 与前面的形参
// xl:round 8
// xl:judge stdout
// xl:end

function f({ a = 1, b = a + 1 } = {}, c = a) {
  return [a, b, c];
}
console.log(f(), f({ a: 5 }).join(","), f({}, 3).join(","));
const obj = { v: 2, m(x = this.v) { return x; } };
console.log(obj.m(), obj.m(9));
