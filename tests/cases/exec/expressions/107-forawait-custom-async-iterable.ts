// xl:title 自定义 Symbol.asyncIterator 接上 for await
// xl:round 8
// xl:judge stdout
// xl:end

const source = {
  [Symbol.asyncIterator]() {
    let n = 0;
    return {
      next() { n++; return Promise.resolve(n <= 3 ? { value: n * 10, done: false } : { value: undefined, done: true }); },
    };
  },
};
async function main() {
  const out = [];
  for await (const v of source) out.push(v);
  console.log(out.join(","));
}
main();
