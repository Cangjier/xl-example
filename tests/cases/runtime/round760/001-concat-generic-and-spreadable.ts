// xl:title `concat` 是**通用**的：类数组 / 原始值接收者，以及 `Symbol.isConcatSpreadable` 两个朝向
// xl:round 760
// xl:judge stdout
// xl:note 这一条钉的是第 760 轮**收掉的那一处**（普查当场红）。规范里 `concat` 对
// xl:note **接收者自己**与**每一个实参**都问一句 `IsConcatSpreadable`，而本仓原来长着
// xl:note **两条**互不相干的支（一条只认数组接收者、一条类数组接收者），**两条都没问那一句**：
// xl:note `Array.prototype.concat.call(1, 2)` 报「this method needs an array receiver」
// xl:note （Node 给 `[1, 2]`）、`[0].concat({ [Symbol.isConcatSpreadable]: true, length: 2, … })`
// xl:note 该摊成 `[0, "x", "y"]` 而给 `[0, {…}]`、反方向 `[0].concat(标记为 false 的数组)`
// xl:note 该给 `[0, [1, 2]]` 而给 `[0, 1, 2]`——**两个朝向都是静默错值**。
// xl:note 收法：两条并成一条，接收者与实参走**同一个**判据（`spreads`）。
// xl:end
const show = (v: any) => JSON.stringify(v);
console.log("1", show((Array.prototype.concat as any).call(1, 2)));
console.log("2", show((Array.prototype.concat as any).call("abc", "d")));
console.log("3", show((Array.prototype.concat as any).call(true)));
console.log("4", show((Array.prototype.concat as any).call({ 0: "a", length: 1 }, [2])));
console.log("5", show(Array.from((Array.prototype.concat as any).call(function f() { }, [1])).length));
const flagged: any = { length: 2, 0: "x", 1: "y" };
flagged[Symbol.isConcatSpreadable] = true;
console.log("6", show([0].concat(flagged)));
const refused: any = [1, 2];
refused[Symbol.isConcatSpreadable] = false;
console.log("7", show([0].concat(refused)));
console.log("8", show(Array.from((Array.prototype.concat as any).call(flagged))));
console.log("9", show([0].concat([1], "a", [2])));
console.log("10", show([1, , 2].concat([3, , 4]).length + ":" + (1 in [1, , 2].concat([3, , 4])) + ":" + (4 in [1, , 2].concat([3, , 4]))));
const threw = (f: () => any) => { try { f(); return "none"; } catch (e) { return (e as Error).constructor.name; } };
console.log("11", show(threw(() => (Array.prototype.concat as any).call(null))));
console.log("12", show(threw(() => (Array.prototype.concat as any).call(undefined))));
