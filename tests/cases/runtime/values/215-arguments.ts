// xl:title arguments 对象：length / 下标 / 与形参的联动
// xl:round 623
// xl:judge stdout
// xl:end

function f(a: number, b: number) {
  console.log(arguments.length, arguments[0], arguments[1], arguments[5]);
  return a + b;
}
console.log(f(1, 2));
