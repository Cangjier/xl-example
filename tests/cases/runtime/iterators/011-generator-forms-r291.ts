// xl:title 生成器：双向传值与三段返回
// xl:round 291
// xl:judge stdout
// xl:end

function* gen() { const x = yield 1; yield x * 2; }
const g = gen();
console.log(JSON.stringify(g.next()), JSON.stringify(g.next(5)), JSON.stringify(g.next()));
