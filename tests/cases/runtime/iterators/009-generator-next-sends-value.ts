// xl:title 生成器：next(v) 把值送进挂起点
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
console.log(JSON.stringify(it.next(20)));
