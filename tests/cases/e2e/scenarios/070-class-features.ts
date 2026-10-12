// xl:title 类：字段、静态块、访问器、私有感与参数属性
// xl:round 338
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Config {
  static registry: string[] = [];
  static { Config.registry.push("static-block"); }
  static kind = "config";
  #secret = 42;
  readonly name: string;
  constructor(name: string, private level: number = 1) { this.name = name; }
  get label(): string { return this.name + "@" + this.level; }
  set label(next: string) { this.name = next; }
  reveal(): number { return this.#secret; }
  static describe(): string { return Config.kind + "/" + Config.registry.length; }
}
const c = new Config("root");
console.log(c.label, c.reveal(), Config.describe());
c.label = "changed";
console.log(c.label, c instanceof Config);
class Sub extends Config {
  constructor() { super("sub", 2); }
  get label(): string { return "sub:" + super.label; }
}
const sub = new Sub();
console.log(sub.label, sub.reveal(), Sub.describe(), sub instanceof Config);
