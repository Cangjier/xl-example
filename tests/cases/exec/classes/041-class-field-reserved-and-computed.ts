// xl:title 字段名与语言关键字 / 内建名字撞车
// xl:round 371
// xl:judge stdout
// xl:end
class Odd {
  static = 1;
  get = 2;
  set = 3;
  class = 5;
  function = 6;
  default = 7;
  if = 8;
  typeof = 9;
}
const o = new Odd();
console.log(o.static, o.get, o.set, (o as any).class, (o as any).function);
console.log((o as any).default, (o as any).if, (o as any).typeof, Object.keys(o).join(","));
