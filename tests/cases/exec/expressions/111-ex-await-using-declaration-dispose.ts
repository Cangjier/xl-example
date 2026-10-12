// xl:title await using 声明：块结束时该调 Symbol.asyncDispose
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:want differ
// xl:why `await using` 同上：不调 `[Symbol.asyncDispose]()`，少一次释放（静默）
// xl:end

class ARes {
  name: string;
  constructor(name: string) { this.name = name; console.log("new " + name); }
  async [Symbol.asyncDispose]() { console.log("dispose " + this.name); }
}
async function main() {
  {
    await using a = new ARes("a");
    console.log("body");
  }
}
main();
