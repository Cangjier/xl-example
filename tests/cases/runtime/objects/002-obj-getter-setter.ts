// xl:title 访问器：读走 getter、写走 setter、内部用另一个字段
// xl:judge stdout
// xl:end

const o: any = {
  _v: 1,
  get v() { return this._v; },
  set v(x: number) { this._v = x * 2; },
};
o.v = 5;
console.log(o.v, o._v);
