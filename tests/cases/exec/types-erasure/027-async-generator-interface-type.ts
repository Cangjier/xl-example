// xl:title 异步迭代器的类型标注（`AsyncIterable` / `Symbol.asyncIterator`）
// xl:round 305
// xl:judge stdout
// xl:end

async function* g(): AsyncGenerator<number> { yield 1; }
const it: AsyncIterable<number> = g();
console.log(typeof (it as any)[Symbol.asyncIterator], typeof (it as any).next);
