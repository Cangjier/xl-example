// xl:title `Error` 的 `cause` 与自定义 `name`
// xl:round 305
// xl:judge stdout
// xl:end

const e = new Error("m", { cause: new RangeError("inner") });
console.log(e.message, e.name, (e.cause as Error).name);
class MyErr extends Error { name = "MyErr"; }
const m = new MyErr("x");
console.log(m.name, m.message, m instanceof Error, String(m));
