// xl:title 具名类表达式：内部名只在类体内可见
// xl:round 623
// xl:judge stdout
// xl:end

const C = class Inner {
  static self() { return typeof Inner; }
  me() { return typeof Inner; }
};
console.log(C.self(), new C().me(), typeof Inner);
