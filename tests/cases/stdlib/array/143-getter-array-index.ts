// xl:title 数组下标位置上的访问器（`defineProperty`）
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why 在**数组下标**那一格上 `defineProperty` 装访问器没有生效（`a[1]` 还是 `2`）：
//       数组的下标读写走的是元素槽，没有问过属性表。要做。
// xl:end
const a: any = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true });
console.log(a[1], a.join(","), JSON.stringify(a), a.length);
