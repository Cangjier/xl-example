// xl:title using 声明：块结束时该调 Symbol.dispose
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:want differ
// xl:why `using` 被当普通 `const` 降级：块结束时不调 `[Symbol.dispose]()`，少一次释放（静默）
// xl:end

class Res {
  name: string;
  constructor(name: string) { this.name = name; console.log("new " + name); }
  [Symbol.dispose]() { console.log("dispose " + this.name); }
}
{
  using a = new Res("a");
  using b = new Res("b");
  console.log("body");
}
