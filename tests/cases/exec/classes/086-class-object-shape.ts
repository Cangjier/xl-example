// xl:title 类对象自己那一格：`name` / `length` / `typeof` / 原型链 / 自有名表 / `toString`
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收原先逐条一问的 26 条用例——
//   · 069-class-name、078-class-a-name、079-class-a-tostring
//   · exec/classes/probe693-c02、probe693-c03、probe693-c18、probe-c03、probe-c10
//   · probe694-k06、k22、k23、k24、k25、k26、k27、k28、k30
//   · probe695-k14
//   · probe699-k-e20、e21、e43、e44、e50、e51
//   · probe704-k-c09、c10
// 判据一行一条：`probe(f)` 就是原子探针那个小壳（`show` 的打印口径一字未改，
// 每条自带的 try/catch 也照旧）⇒ 输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};

// name：匿名的给空串、具名的给名字，类表达式的名字也在这一格
probe(() => (class {}).name);
probe(() => (class Foo { }).name);
probe(() => (class A {}).name);
probe(() => { const A = class { }; return A.name; });
probe(() => { class A { } return A.name; });
// `toString` 是类自己的文本
probe(() => (class A {}).toString());
// typeof：类、类表达式、原型三格
probe(() => { class A { } return typeof A; });
probe(() => typeof class {});
probe(() => { const A = class { }; return typeof A; });
probe(() => { class A { } return typeof A.prototype; });
probe(() => typeof (class {}).prototype);
// length：看 constructor 的形参表
probe(() => { class A { } return A.length; });
probe(() => { class A { constructor(a, b) { } } return A.length; });
probe(() => { class A { constructor(a = 1) { } } return A.length; });
probe(() => (class A { constructor() { this.a = 1; } }).length);
// 类对象自己那一格型：原型指针、自有名表
probe(() => { class A { } return Object.getPrototypeOf(A) === Function.prototype; });
probe(() => { class A { } return Object.getOwnPropertyNames(A).sort().join(","); });
probe(() => Object.getOwnPropertyNames(class A { m() {} }).length);
// 构造函数返回原始值时那一趟照旧给实例
probe(() => { class A { constructor() { return 1; } } return typeof new A(); });
// 空静态块不改变类对象自己那一格
probe(() => { class A { static { } } return typeof A; });
