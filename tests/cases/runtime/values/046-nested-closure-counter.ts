// xl:title 闭包共享同一格：两个计数器各算各的
// xl:judge stdout
// xl:end

function counter() { let n = 0; return { inc: () => ++n, get: () => n }; }
const a = counter();
const b = counter();
a.inc(); a.inc(); b.inc();
console.log(a.get(), b.get());
