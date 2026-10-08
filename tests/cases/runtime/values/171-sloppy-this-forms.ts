// xl:title 非严格 `this` 的几档：普通调用 / 摘下来的方法 / call(undefined) / 回调
// xl:round 337
// xl:judge stdout
// xl:end

function who(this: any): string {
  return this === undefined ? "undefined" : this === globalThis ? "global" : "other";
}
console.log(who());
console.log(who.call(undefined), who.call(null), who.call({ tag: 1 }) === "other");
const obj = { tag: "obj", who };
const detached = obj.who;
console.log(detached(), obj.who(), detached.call(obj));
console.log([1].map(function (this: any) { return who.call(this); }).join(","));
const arrowThis = { tag: "lex", run() { return (() => this.tag)(); } };
console.log(arrowThis.run());
