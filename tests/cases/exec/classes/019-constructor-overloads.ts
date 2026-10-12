// xl:title 构造函数重载签名 + 一个实现
// xl:judge stdout
// xl:end

class P {
  x: number;
  constructor(x: number);
  constructor(x: string);
  constructor(x: any) {
    this.x = typeof x === "number" ? x : x.length;
  }
}
console.log(new P(3).x, new P("abcd").x);
