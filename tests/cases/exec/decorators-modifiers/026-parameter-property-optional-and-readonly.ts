// xl:title 参数属性：`readonly` 与可选一起用
// xl:round 305
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class P {
  constructor(readonly id: number, private tag?: string) {}
  get(): string { return this.id + "/" + (this.tag ?? "none"); }
}
console.log(new P(1).get(), new P(2, "t").get(), Object.keys(new P(3)).join(","));
