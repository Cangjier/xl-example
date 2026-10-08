// xl:title `yield` 的**返回值**与 `next(实参)` 的注入
// xl:round 737
// xl:judge stdout
// xl:end
function* g() {
  const a = yield 1;
  const b = yield a + 1;
  return a + b;
}
const it = g();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next(10)));
console.log(JSON.stringify(it.next(100)));
console.log(JSON.stringify(it.next(1000)));
