// xl:title 闭包：捕获的是变量（不是值），两个闭包共享同一格
// xl:round 7
// xl:judge stdout
// xl:end

function pair() {
  let n = 0;
  return { inc: () => ++n, get: () => n };
}
const p = pair();
const q = pair();
console.log(p.inc(), p.inc(), p.get(), q.get());
