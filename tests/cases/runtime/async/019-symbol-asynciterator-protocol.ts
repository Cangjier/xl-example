// xl:title `Symbol.asyncIterator` 与 `for await`
// xl:round 651
// xl:judge stdout
// xl:end

const bag: any = {
  [Symbol.asyncIterator]() {
    let i = 0;
    return { next: () => Promise.resolve(i < 3 ? { value: i++, done: false } : { value: undefined, done: true }) };
  },
};
async function main(): Promise<void> {
  let sum = 0;
  for await (const v of bag) { sum += v; }
  console.log("sum", sum);
}
main().then(() => console.log("done"));
