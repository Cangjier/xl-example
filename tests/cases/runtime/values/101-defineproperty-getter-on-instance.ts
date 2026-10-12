// xl:title defineProperty 在实例上装一个 getter
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = { _v: 2 };
Object.defineProperty(o, "double", { get() { return this._v * 2; }, enumerable: true });
console.log(o.double, Object.keys(o).join(","));
o._v = 5;
console.log(o.double);
