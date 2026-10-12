// xl:title getter 里抛：try/finally 收尾，属性没变
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = {
  _v: 1,
  get v() { if (this._v < 0) throw new RangeError("negative"); return this._v; },
};
try {
  o._v = -1;
  console.log(o.v);
} catch (e: any) {
  console.log(e.name, e.message);
} finally {
  o._v = 5;
}
console.log(o.v);
