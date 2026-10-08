// xl:title 冻结之后 `defineProperty` / `setPrototypeOf` / `delete` 的静默与抛
// xl:round 736
// xl:judge stdout
// xl:end
const o: any = Object.freeze({ a: 1 });
try { console.log(Object.defineProperty(o, "a", { value: 2 }).a); } catch (e: any) { console.log("dp-throw", e.constructor.name); }
try { Object.setPrototypeOf(o, { b: 2 }); console.log("sp-ok"); } catch (e: any) { console.log("sp-throw", e.constructor.name); }
console.log(delete o.a, o.a, Object.isFrozen(o));
