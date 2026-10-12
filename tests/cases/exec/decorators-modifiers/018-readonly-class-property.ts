// xl:title readonly 字段：只在类型位，运行期可写
// xl:round 304
// xl:judge stdout
// xl:end

class Cfg {
  readonly name: string;
  readonly items: readonly string[];
  constructor(name: string, items: string[]) { this.name = name; this.items = items; }
}
const c = new Cfg("a", ["x"]);
console.log(c.name, c.items.join(","));
