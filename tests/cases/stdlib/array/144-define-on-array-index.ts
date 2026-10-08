// xl:title 数组下标上的数据属性改写（与访问器那一档分开量）
// xl:round 691
// xl:judge stdout
//       读写走的是**元素槽**，完全没有问过属性表（`FindProperty` 找不到那一格 ⇒
//       新装的那一格躺在 `Props` 里没人读）。访问器那一档同理。要做——
//       改法是让数组的下标读写先问属性表，那是**引擎侧**的一处改动。
// xl:end
const a: any = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9 });
console.log(a[1], a.length, JSON.stringify(a), Object.keys(a).join(","));
Object.defineProperty(a, "1", { enumerable: false });
console.log(Object.keys(a).join(","), a[1], JSON.stringify(a));
