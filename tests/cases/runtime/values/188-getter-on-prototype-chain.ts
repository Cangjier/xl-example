// xl:title 访问器沿原型链的查找与 this
// xl:round 371
// xl:judge stdout
// xl:end
const base = {
  _v: 1,
  get v() { return this._v; },
  set v(x: number) { this._v = x * 10; },
};
const child: any = Object.create(base);
child._v = 2;
console.log(child.v, base.v);
child.v = 3;
console.log(child._v, child.v, base._v, Object.hasOwn(child, "v"));
const grandchild = Object.create(child);
console.log(grandchild.v);
grandchild.v = 4;
console.log(grandchild.v, child._v, Object.hasOwn(grandchild, "_v"));
