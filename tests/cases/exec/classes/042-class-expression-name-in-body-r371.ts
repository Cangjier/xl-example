// xl:title 具名类表达式在体内能看见自己的名字
// xl:round 371
// xl:judge stdout
// xl:end
const A = class Self {
  static name2(): string { return Self.name; }
  who(): string { return Self.name2(); }
};
const B = class { static name2(): string { return typeof (this as any); } };
console.log(new A().who(), A.name, new B() instanceof B);
const C = class Named { static create(): Named { return new Named(); } v = 1; };
console.log(C.create().v, C.name);
