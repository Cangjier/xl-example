// xl:title `readonly` 字段在构造函数里赋值
// xl:round 305
// xl:judge stdout
// xl:end

class P {
  readonly id: number;
  name: string;
  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
}
const p = new P(1, "a");
console.log(p.id, p.name, Object.keys(p).join(","));
