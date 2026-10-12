// xl:title `this` 的几种绑法：方法、摘下来、call/apply/bind、箭头
// xl:round 338
// xl:judge stdout
// xl:end

const counter = {
  n: 0,
  bump() { this.n = this.n + 1; return this.n; },
  describe() { return `n=${this.n}`; },
};
console.log(counter.bump(), counter.bump(), counter.describe());
const detached = counter.describe;
console.log(typeof detached(), detached() === "n=2");
console.log(detached.call(counter), counter.describe.apply(counter, []));
const bound = counter.bump.bind(counter);
console.log(bound(), bound(), counter.n);
const arrowUser = {
  n: 9,
  run() { const f = () => this.n; return f(); },
};
console.log(arrowUser.run());
function plain(this: any): string { return this === globalThis ? "global" : "other"; }
console.log(plain(), plain.call(undefined), plain.call(null), plain.call({}));
