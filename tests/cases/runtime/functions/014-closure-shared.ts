// xl:title 两个闭包共享一格：各自实例互不串
// xl:judge stdout
// xl:end

function make() {
  let n = 0;
  return { inc: () => ++n, get: () => n };
}
const c1 = make();
const c2 = make();
c1.inc();
c1.inc();
c2.inc();
console.log(c1.get(), c2.get());
