// xl:title `new Map(…)` 里不是条目的那一项要抛 `TypeError`
// xl:round 735
// xl:judge stdout
// xl:end
// 原来**静默跳过**（`if (pair.Tag !== ValueTag.Array) continue;`）⇒ `new Map([1])`
// 给一个**空表**、一句异常都没有。JS 走 `Get(entry, "0")` / `Get(entry, "1")`。
const show = (f: () => void) => { try { f(); console.log("no-throw"); } catch (e: any) { console.log(e.constructor.name); } };
show(() => { new Map([1] as any); });
show(() => { new Map([[1, 2], "x"] as any); });
// **`null` 也是抛的那一档**（实测复核）：`new Map([null])` 在 Node 里报
// `Iterator value null is not an entry object`——不是「两格都是 undefined」。
show(() => { new Map([[1, 2], null] as any); });
show(() => { new Set(["ab"] as any); });
console.log(JSON.stringify([...new Map([[1, 2, 3]] as any)]));
console.log(JSON.stringify([...new Map([[]] as any)]));
console.log(new Map().size, new Map(null as any).size, new Set(undefined as any).size);
