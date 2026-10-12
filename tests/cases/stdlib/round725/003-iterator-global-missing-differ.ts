// xl:title `Iterator` 这个全局对象没登记（第 725 轮登记的缺口）
// xl:round 725
// xl:judge stdout
// xl:want differ
// xl:why **`Iterator` 这个名字没进 `GlobalNames()` / `BuildGlobals`**（第 725 轮量到的）：
// xl:why `typeof Iterator` 给 `undefined`（JS 里是 `"function"`），`Iterator.from([1, 2])` 也用不了。
// xl:why 三个助手本身已经在**迭代器自己身上**能用（`p725a-a01`），
// xl:why 差的只是那个全局对象与它上面那张表——与第 717 轮 `Reflect` 是同一形状的活。
// xl:end
console.log(typeof (globalThis as any).Iterator);
console.log(typeof (globalThis as any).Iterator?.from);
const it: any = [1, 2].values();
console.log(typeof it.take, typeof it.toArray);
