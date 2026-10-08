// xl:title 类里方法的重载签名 + 一个实现
// xl:round 305
// xl:judge stdout
// xl:end

class Util {
  parse(v: string): number;
  parse(v: number): number;
  parse(v: any): number { return typeof v === "string" ? v.length : v; }
}
console.log(new Util().parse("abc"), new Util().parse(7));
