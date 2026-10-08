// xl:title 具名类表达式的名字在类体与静态初始化里可见
// xl:round 323
// xl:judge stdout
// xl:end

const K = class Named {
  static id = "n1";
  get tag() { return Named.id; }
  static make() { return new Named(); }
};
console.log(K.id, new K().tag, K.make() instanceof K);
