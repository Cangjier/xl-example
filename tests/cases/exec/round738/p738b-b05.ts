// xl:title `yield` 的逻辑操作数是**对象 / 调用 / 成员**时的形状
// xl:round 738
// xl:judge stdout
// xl:end
function* g() {
  const o = { a: 1, b: 0 };
  yield o.a && o.b;
  yield o["a"] || o["b"];
  yield (o.a ? 1 : 2) && 3;
  yield o.a && (() => 4)();
}
console.log([...g()].join(","));
