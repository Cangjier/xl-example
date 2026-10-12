// xl:title `this` 形参（类型位，但调用要真的换 this）
// xl:judge stdout
// xl:end

function read(this: { n: number }, k: number): number { return this.n + k; }
const box = { n: 10 };
console.log(read.call(box, 1));
console.log(read.apply(box, [2]));
