// xl:title static 成员、静态方法互调、静态字段
// xl:judge stdout
// xl:end

class Counter {
  static total = 0;
  static bump(): number { return ++Counter.total; }
  static get doubled(): number { return Counter.total * 2; }
}
Counter.bump();
Counter.bump();
console.log(Counter.total, Counter.doubled, Counter.bump());
