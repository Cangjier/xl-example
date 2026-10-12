// xl:title 访问器、`defineProperty` 与冻结
// xl:round 338
// xl:judge stdout
// xl:end

const box: any = { _v: 1 };
Object.defineProperty(box, "v", {
  get() { return this._v; },
  set(next: number) { this._v = next * 2; },
  enumerable: true,
  configurable: true,
});
box.v = 5;
console.log(box.v, box._v);
const plain: any = { x: 1 };
Object.defineProperty(plain, "ro", { value: 7, writable: false, enumerable: true });
plain.ro = 9;
console.log(plain.ro);
const frozen: any = Object.freeze({ a: 1 });
frozen.a = 2;
frozen.b = 3;
console.log(frozen.a, frozen.b, Object.isFrozen(frozen), Object.isFrozen({}));
const arr: any = Object.freeze([1]);
try { arr.push(2); console.log("pushed"); } catch (e) { console.log("threw", (e as Error).name); }
