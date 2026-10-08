// xl:title 静态块：类求值时跑一次，可以读别的静态字段
// xl:judge stdout
// xl:end

class Config {
  static values: number[] = [];
  static total = 0;
  static { Config.values.push(1); Config.values.push(2); Config.total = 3; }
}
console.log(Config.values.join(","), Config.total);
