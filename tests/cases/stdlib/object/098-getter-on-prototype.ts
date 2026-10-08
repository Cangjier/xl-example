// xl:title 原型上的访问器被子类实例读到
// xl:round 623
// xl:judge stdout
// xl:end

function Base(this: any) { this._n = 1; }
Object.defineProperty(Base.prototype, "n", {
  get() { return this._n; },
  set(v: number) { this._n = v; },
  configurable: true,
});
const b: any = new (Base as any)();
b.n = 4;
console.log(b.n, Object.getOwnPropertyDescriptor(Base.prototype, "n").configurable);
