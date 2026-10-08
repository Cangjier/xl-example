// xl:title 生成器的两条接口：同步那族有 `Symbol.iterator`、异步那族两个都有
// xl:round 320
// xl:judge stdout
// xl:end

function* sync(): Generator<number> { yield 1; }
async function* asy(): AsyncGenerator<number> { yield 2; }
const s: any = sync();
const a: any = asy();
console.log(typeof s[Symbol.iterator], typeof s[Symbol.asyncIterator]);
console.log(typeof a[Symbol.iterator], typeof a[Symbol.asyncIterator]);
console.log(s[Symbol.iterator]() === s, a[Symbol.asyncIterator]() === a);
