// xl:title 参数属性 + 可选形参 + 默认值混用
// xl:round 304
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Req {
  constructor(public url: string, public method = "GET", public body?: string) {}
  show(): string { return this.url + " " + this.method + " " + (this.body ?? "-"); }
}
console.log(new Req("/a").show(), new Req("/b", "POST", "x").show());
