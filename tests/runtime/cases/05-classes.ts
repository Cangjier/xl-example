// 语料 05：类（构造函数、方法、访问器、继承与 super、instanceof、类表达式）。
//
// **没写的**（这一层明确抛，见 typescript-exec/README.md）：字段初始化、`static`、
// 计算键方法、类里的生成器 / async 方法、**派生类不带构造函数**（默认构造函数没法转发实参）。
// 派生类这一份**自己写构造函数并调 `super(...)`**✓——那是这一层要求的形状。

class Counter {
  // **类体里的空成员**（单独一个 `;`）在这份语料里是**回归哨**（第 677 轮）：
  // TS 叫它 `SemicolonClassElement`，运行期什么都不产生——降级层原来在这上面直接抛，
  // 整份类都进不来。放在最前面，是为了让「这一句被谁吃掉了」一眼看得出来。
  ;
  constructor(start: number = 0) {
    this.value = start;
  }
  ;
  bump(by: number): number {
    this.value += by;
    return this.value;
  }
  ;
  get current(): number {
    return this.value;
  }
  set current(next: number) {
    this.value = next;
  }
  label(): string {
    return "counter(" + this.value + ")";
  }
}

class Tally extends Counter {
  constructor(start: number, step: number) {
    super(start);
    this.step = step;
  }
  bump(by: number): number {
    return super.bump(by * this.step);
  }
  describe(): string {
    return "tally step=" + this.step + " at " + this.label();
  }
}

const plain = new Counter();
const started = new Counter(10);
console.log("ctor", plain.label(), started.label(), started.bump(5), started.current);
started.current = 2;
console.log("accessor", started.current, started.label());

const tally = new Tally(1, 3);
console.log("inherit", tally.bump(2), tally.describe());
console.log("instanceof", tally instanceof Tally, tally instanceof Counter, plain instanceof Tally);

// 类表达式 + 没有构造函数时那个默认构造函数。
const Anon = class {
  hello(): string {
    return "anon";
  }
};
console.log("expression", new Anon().hello());

// 方法沿原型链找：覆盖之后子类那份赢，父类那份还能通过 super 拿到。
console.log("override", new Tally(0, 1).bump(4));
