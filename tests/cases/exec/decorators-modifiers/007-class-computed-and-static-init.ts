// xl:title 类的计算成员名 · 静态字段与静态块的初始化顺序
// xl:judge stdout
// xl:end

const k = "dyn";
const order: string[] = [];
class C {
  static a = (order.push("static-a"), 1);
  static { order.push("block"); }
  static b = (order.push("static-b"), 2);
  [k] = (order.push("field-dyn"), 3);
  plain = (order.push("field-plain"), 4);
  constructor() { order.push("ctor"); }
}
const c: any = new C();
console.log(order.join(","), c.dyn, c.plain, C.a, C.b);
