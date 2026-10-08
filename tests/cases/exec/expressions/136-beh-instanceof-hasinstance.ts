// xl:title instanceof 与 Symbol.hasInstance 走的是哪条路
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why 同上一格：`instanceof` 自己走的是原型链（那部分是对的），但**自定义 `Symbol.hasInstance`** 要先用 `defineProperty` 装一个 symbol 键，于是整条用例断在这一步，量不到 `instanceof` 的后半段
// xl:end

class A {}
class B extends A {}
console.log(new B() instanceof B, new B() instanceof A, {} instanceof A);
console.log(typeof (A as any)[Symbol.hasInstance]);
const custom: any = { [Symbol.hasInstance](v: any) { return v === 42; } };
const C: any = function (): void {};
Object.defineProperty(C, Symbol.hasInstance, { value: custom[Symbol.hasInstance] });
console.log(42 instanceof C, 43 instanceof C);
