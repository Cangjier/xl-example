// xl:title `Error.isError` + `bind` / `super` 两条 `this` 规则各归各位
// xl:round 343
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

console.log(Error.isError(new Error("x")), Error.isError(new TypeError("y")));
console.log(Error.isError({}), Error.isError("Error"), Error.isError(null), Error.isError(undefined));
class MyErr extends Error {
  constructor(m: string, public code: number = 0) { super(m); this.name = "MyErr"; }
}
const e = new MyErr("boom", 7);
console.log(e.message, e.name, e.code, e instanceof Error, Error.isError(e), String(e));
const plain = Error("without new");
console.log(plain instanceof Error, Error.isError(plain), String(plain));
const obj = { tag: "obj", who(this: any) { return this === undefined ? "undef" : this.tag; } };
const bound = (obj.who as any).bind(obj);
console.log(bound(), bound.call({ tag: "other" }), obj.who());
function target(this: any, a: number, b: number) { return (this === undefined ? "u" : this.tag) + ":" + a + "," + b; }
const b2 = target.bind({ tag: "bound" }, 1);
console.log(b2(2), b2.call({ tag: "ignored" }, 3));
console.log(typeof Error.isError, Error.prototype.constructor === Error);
