// xl:title 冻结之后 `defineProperty` 抛，同值改写也抛
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.freeze(o);
try { Object.defineProperty(o, "a", { value: 1 }); console.log("same ok"); } catch (e: any) { console.log("same", e.constructor.name); }
try { Object.defineProperty(o, "a", { value: 2 }); console.log("diff ok"); } catch (e: any) { console.log("diff", e.constructor.name); }
try { Object.defineProperty(o, "b", { value: 3 }); console.log("new ok"); } catch (e: any) { console.log("new", e.constructor.name); }
