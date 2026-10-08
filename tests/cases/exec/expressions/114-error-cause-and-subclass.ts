// xl:title Error 的 cause 与自定义错误子类
// xl:round 676
// xl:judge stdout
// xl:end

const inner = new Error("inner");
const outer = new Error("outer", { cause: inner });
console.log(outer.message, outer.cause === inner, outer.name);
class MyError extends Error {
  constructor(m: string) {
    super(m);
    this.name = "MyError";
  }
}
const e = new MyError("boom");
console.log(e instanceof Error, e instanceof MyError, e.name, e.message);
