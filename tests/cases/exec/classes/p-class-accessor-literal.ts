// xl:title 字面量里的取值器与设值器
// xl:round 692
// xl:judge stdout
// xl:end

const o = {
  get x() {
    return 1;
  },
  set x(v) {
    this._v = v;
  },
};
o.x = 5;
console.log(o.x, o._v);
