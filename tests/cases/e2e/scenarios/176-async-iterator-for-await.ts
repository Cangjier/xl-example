// xl:title 端到端：异步迭代器 + for await + 提前 break + return 收尾
// xl:round 639
// xl:judge stdout
// xl:end

const trace: string[] = [];
const source = {
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      next(): Promise<IteratorResult<number>> {
        i += 1;
        return Promise.resolve(i <= 5 ? { value: i, done: false } : { value: 0, done: true });
      },
      return(): Promise<IteratorResult<number>> {
        trace.push("closed");
        return Promise.resolve({ value: 0, done: true });
      },
    };
  },
};
async function main(): Promise<void> {
  for await (const n of source) {
    trace.push("got " + n);
    if (n === 3) break;
  }
  console.log(trace.join("|"));
}
main();
