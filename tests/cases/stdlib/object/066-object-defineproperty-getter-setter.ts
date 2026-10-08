// xl:title `defineProperty` 的 get/set 描述符能用
// xl:round 305
// xl:judge stdout
// xl:end

const o: any = { _v: 1 };
Object.defineProperty(o, "v", {
  get() { return this._v * 10; },
  set(next: number) { this._v = next; },
  enumerable: true,
});
o.v = 3;
console.log(o.v, o._v, Object.keys(o).join(","));
