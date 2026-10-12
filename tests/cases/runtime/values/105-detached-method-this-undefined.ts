// xl:title 把方法摘下来单独调：松散模式 this 是全局对象
// xl:round 304
// xl:judge stdout
// xl:end

const o = { tag: "o", who(this: any) { return this === undefined ? "undefined" : this === globalThis ? "global" : "other"; } };
const f = o.who;
console.log(f(), o.who());
