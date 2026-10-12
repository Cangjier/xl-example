// xl:title 具名类表达式：名字只在类体里可见
// xl:round 305
// xl:judge stdout
// xl:end

const C = class Named {
  static id = "N";
  get tag(): string { return Named.id; }
};
console.log(new C().tag, C.id, typeof (C as any).Named);
