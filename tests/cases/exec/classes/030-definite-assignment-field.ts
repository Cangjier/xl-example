// xl:title 明确赋值断言字段（`v!: number`）在构造函数里补上
// xl:round 305
// xl:judge stdout
// xl:end

class C {
  v!: number;
  constructor() { this.init(); }
  init() { this.v = 5; }
}
console.log(new C().v);
