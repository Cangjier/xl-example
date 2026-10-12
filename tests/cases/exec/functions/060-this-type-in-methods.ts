// xl:title this 类型与链式调用
// xl:round 371
// xl:judge stdout
// xl:end
class Builder {
  parts: string[] = [];
  add(p: string): this { this.parts.push(p); return this; }
  build(): string { return this.parts.join("+"); }
}
class Sub extends Builder {
  extra(): this { this.parts.push("E"); return this; }
}
console.log(new Sub().add("a").extra().build());
const b: Builder = new Builder();
console.log(b.add("x").add("y").build());
