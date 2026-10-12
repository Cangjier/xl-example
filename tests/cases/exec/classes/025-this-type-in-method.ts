// xl:title this 类型与多态 this 只在类型位
// xl:round 304
// xl:judge stdout
// xl:end

class Builder {
  value = "";
  add(s: string): this { this.value += s; return this; }
}
class Sub extends Builder { tag = "sub"; }
const out = new Sub().add("a").add("b");
console.log(out.value, out.tag, out instanceof Sub);
