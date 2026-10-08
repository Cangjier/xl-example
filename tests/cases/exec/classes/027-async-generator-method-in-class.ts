// xl:title 类里的 `async *items()` 方法
// xl:round 305
// xl:judge stdout
// xl:end

class Stream {
  #base = 10;
  async *items(): AsyncGenerator<number> {
    yield this.#base;
    yield this.#base + 1;
  }
}
async function main() {
  const out: number[] = [];
  for await (const v of new Stream().items()) out.push(v);
  console.log(out.join(","));
}
main();
