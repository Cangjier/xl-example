// 语料 20：**实例字段初始化 · `static` 成员 · 静态块**（第 128 轮）——与 `node` 逐字节对拍。
//
// 这一批量的是一条顺序口径：**静态成员在类声明的位置求值**（按源码顺序）、
// **实例字段在构造函数体之前**（参数默认值之后）、派生类里**跟在 `super(...)` 之后**。
// 最后那一条最容易写错，所以下面把 `super(...)` 特意放在**第一条语句之后**。

class Point {
  x = 1;
  y: number;
  label = "p" + this.x;
  static count = 0;
  static names: string[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    Point.count += 1;
    Point.names.push("p" + x);
  }

  static tag(): string {
    return "Point#" + Point.count;
  }

  static get zero(): number {
    return Point.count - Point.count;
  }

  static {
    Point.names.push("block");
  }

  sum(): number {
    return this.x + this.y;
  }
}

// **静态初始化的先后**：`count` 与 `names` 都在这里就位了（按源码顺序、类声明处求值）。
console.log("static-first", Point.count, Point.names.join(","), Point.tag(), Point.zero);
console.log("instance", new Point(2, 3).sum(), new Point(4, 5).sum());
console.log("fields", new Point(6, 1).x, new Point(6, 1).y, new Point(6, 1).label);
console.log("in", "x" in new Point(1, 1), "y" in new Point(1, 1), "zz" in new Point(1, 1));
console.log("static-after", Point.count, Point.names.join(","));

// **静态字段在类声明的位置按源码顺序求值**：下面这个类的 `b` 看得见刚写好的 `a`。
class Ordered {
  static a = 1;
  static b = Ordered.a + 1;
  static c = 3;
  static sum(): number {
    return Ordered.a + Ordered.b + Ordered.c;
  }
}
console.log("ordered", Ordered.a, Ordered.b, Ordered.c, Ordered.sum());

class Base {
  id: number;
  constructor(id: number) {
    this.id = id;
  }
  name(): string {
    return "base" + this.id;
  }
}

class Derived extends Base {
  empty: number;
  extra = this.id * 10;
  tag = "d" + this.id;

  constructor(id: number) {
    // **`super(...)` 不是第一条语句**：字段初始化必须等它返回（否则这里会静默拿到
    // 「还不存在的 this」——实测就是 `arithmetic on a non-numeric operand`）。
    const doubled = id * 2;
    super(doubled);
  }

  name(): string {
    return "derived:" + super.name() + ":" + this.extra;
  }
}

const d = new Derived(3);
console.log("derived", d.id, d.extra, d.tag, d.name(), "empty" in d, d.empty);

class Counter {
  value = 0;
  static made = 0;
  static make(): Counter {
    Counter.made += 1;
    return new Counter();
  }
  bump(): number {
    this.value += 1;
    return this.value;
  }
}

console.log("counter", Counter.make().bump(), Counter.made, Counter.made);
console.log("after", 1 + 1);
