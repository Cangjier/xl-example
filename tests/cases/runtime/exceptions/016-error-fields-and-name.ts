// xl:title Error 的 name / message / toString 与自定义子类
// xl:judge stdout
// xl:end

const e = new Error("boom");
console.log(e.name, e.message, e.toString());
const t = new TypeError("bad");
console.log(t.name, t instanceof Error, t instanceof TypeError, t.toString());
class MyError extends Error { constructor(m: string) { super(m); this.name = "MyError"; } }
const m = new MyError("mine");
console.log(m.name, m.message, m.toString(), m instanceof Error, m instanceof MyError);
