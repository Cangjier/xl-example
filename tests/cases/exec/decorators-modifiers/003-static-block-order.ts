// xl:title 静态块与静态字段的执行顺序
// xl:judge stdout
// xl:end

const log: string[] = [];
class C {
  static a = (log.push("a"), 1);
  static { log.push("block1"); }
  static b = (log.push("b"), 2);
  static { log.push("block2"); }
}
console.log(C.a, C.b, log.join(","));
