// xl:title 闭包成对：一个改、一个读
// xl:judge stdout
// xl:end

function counter() {
  let n = 0;
  return { inc: () => ++n, get: () => n };
}
const c = counter();
c.inc();
c.inc();
console.log(c.get());
const d = counter();
console.log(d.get(), c.get());
