// xl:title 自定义错误的 `name` / `message` / `instanceof`
// xl:round 691
// xl:judge stdout
// xl:end
class MyErr extends Error { constructor(m: string) { super(m); this.name = "MyErr"; } }
const e: any = new MyErr("boom");
console.log(e.name, e.message, e instanceof MyErr, e instanceof Error);
console.log(new TypeError("x").name, new RangeError("y").message);
console.log(Error("z").message, String(new Error()));
