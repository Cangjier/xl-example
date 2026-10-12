// xl:title 参数属性：public / private / protected / readonly / 可选 / 默认值
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Service {
  constructor(
    public name: string,
    private secret: number = 3,
    protected flag?: boolean,
    public readonly id: string = "x",
  ) {}
  describe(): string { return this.name + this.secret + String(this.flag) + this.id; }
}
const s = new Service("svc");
console.log(s.name, s.describe(), s.id, Object.keys(s).join(","));
s.name = "other";
console.log(s.name);
