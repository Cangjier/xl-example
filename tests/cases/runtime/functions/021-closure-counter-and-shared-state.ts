// xl:title 闭包计数器：两个实例各有一份状态
// xl:round 323
// xl:judge stdout
// xl:end

function counter() { let n = 0; return { inc: () => ++n, get: () => n }; }
const a = counter(); const b = counter();
a.inc(); a.inc(); b.inc();
console.log(a.get(), b.get());
