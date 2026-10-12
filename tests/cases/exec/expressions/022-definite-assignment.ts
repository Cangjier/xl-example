// xl:title 明确赋值断言 `!:` 与可选字段 `?:`：一个都不产生属性
// xl:judge stdout
// xl:end

class C {
  v!: number;
  w?: string;
  init() { this.v = 5; }
}
const c = new C();
console.log("v" in c, "w" in c, c.w);
c.init();
console.log(c.v, "v" in c, Object.keys(c).join(","));
