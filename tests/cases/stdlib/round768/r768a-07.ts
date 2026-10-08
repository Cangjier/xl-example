// xl:title getter 抛异常时的取值族：次序、副作用与 `TypeError` 的传递
// xl:round 768
// xl:judge stdout
// xl:note `JSON.stringify` / `Object.values` / 展开读的都是**可枚举自有属性**，
// xl:note 而 getter 抛出的那一抛**当场往外冒**（`a` 先读过、`b` 读到就炸）。
// xl:note `Object.keys` **不读值**（一次 getter 都不进）——它与前三条是两件事。
// xl:note 这一条钉的是「取值族走到哪一步会调 getter、抛了之后停在哪」。
// xl:end
const order: string[] = [];
const o: any = {};
Object.defineProperty(o, "a", { get() { order.push("a"); return 1; }, enumerable: true });
Object.defineProperty(o, "b", { get() { order.push("b"); throw new Error("boom"); }, enumerable: true });
try { JSON.stringify(o); } catch (e) { console.log("01", (e as Error).message, order.join(",")); }
order.length = 0;
try { Object.values(o); } catch (e) { console.log("02", order.join(",")); }
order.length = 0;
console.log("03", Object.keys(o).join(","), order.join(","));
order.length = 0;
try { const spread: any = { ...o }; console.log("04", Object.keys(spread).length); } catch (e) { console.log("04", order.join(",")); }
