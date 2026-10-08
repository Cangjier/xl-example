// xl:title 手写迭代协议：next() 的三段返回形状
// xl:round 291
// xl:judge stdout
// xl:end

const xs = [10, 20];
const it = xs[Symbol.iterator]();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
