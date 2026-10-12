// xl:title 对象字面量里的访问器（get / set 一对）
// xl:round 304
// xl:judge stdout
// xl:end

const o = {
  _n: 1,
  get n() { return this._n * 10; },
  set n(v: number) { this._n = v + 1; },
};
o.n = 4;
console.log(o.n, o._n);
