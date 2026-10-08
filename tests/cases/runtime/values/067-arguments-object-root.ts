// xl:title arguments：length / 下标 / 箭头里看外层那一份
// xl:judge stdout
// xl:end

function f(a: number, b: number) {
  console.log(arguments.length, arguments[0], arguments[1], arguments[5]);
}
f(1, 2);
f(1, 2, 3, 4, 5, 6);
function g() {
  const inner = () => arguments.length;
  console.log(inner());
}
g(1, 2, 3);
