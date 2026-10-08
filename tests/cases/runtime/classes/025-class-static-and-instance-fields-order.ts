// xl:title 静态字段与实例字段的求值顺序
// xl:round 323
// xl:judge stdout
// xl:end

const log: string[] = [];
class C {
  static a = (log.push("static-a"), 1);
  b = (log.push("inst-b"), 2);
  static c = (log.push("static-c"), 3);
  constructor() { log.push("ctor"); }
}
new C();
console.log(log.join(","));
console.log(C.a, C.c, new C().b);
