// xl:title `arguments` 的形状与 `length` 同步
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why 本仓的 `arguments` **就是一个数组**（降级层造成的），没有「与形参联动」的映射语义：
//       `a = 9` 之后 `arguments[0]` 该是 9、本仓还是 1。与 `stdlib/object/138-object-tostring-arguments-gap`
//       同一条根（那一条量的是标签）。要做。
// xl:end
function f(a: any): void {
  console.log(arguments.length, arguments[0], arguments[9]);
  a = 9;
  console.log(arguments[0]);
}
f(1);
f(1, 2, 3);
