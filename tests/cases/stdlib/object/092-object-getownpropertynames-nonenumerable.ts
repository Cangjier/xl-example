// xl:title `getOwnPropertyNames` 与 `Object.keys` 的分界：**可枚举**那一格
// xl:round 623
// xl:judge stdout
// xl:end
// 判定点只有一个（也是这一族**唯一**与 `Object.keys` 分道扬镳的地方）：
// **不可枚举的格，`getOwnPropertyNames` 带上、`Object.keys` 不带。**
//
// 本条原来叫 `092-object-descriptors`，里面混了三件事（`getOwnPropertyNames` /
// `getOwnPropertyDescriptor` / `defineProperty`）——按「一条用例一个判定点」只留第一件，
// 那两件各自**已经有**自己的文件（`017` / `024` / `078`）。
//
// 本条还**吸收**了原先同一个判定点的五条原子探针（它们各自只问了这一件事的一面）：
//   probe695-o12（定义之后翻成不可枚举）· probe698-c07（翻转的第二种写法）
//   probe694-o35（显式写全四个标志但 `enumerable: false`）· probe695-o01（取值器键）
//   · probe698-c01（`propertyIsEnumerable` 那一面）
const o: any = { a: 1 };
Object.defineProperty(o, "b", { value: 2, enumerable: false, writable: true, configurable: true });

console.log(Object.getOwnPropertyNames(o).join(","));
console.log(Object.keys(o).join(","));
// 同一片的两个侧面：非枚举那一格的**值**仍然读得到，只是不进枚举那一族
console.log(o.b, Object.getOwnPropertyDescriptor(o, "b")!.enumerable);

// 侧面一：**先把格定义出来，再翻成不可枚举**——`keys` 跟着变空（不是只在定义时才算数）
const flip: any = { a: 1 };
Object.defineProperty(flip, "a", { enumerable: false });
console.log(Object.keys(flip).length + "," + flip.a);

// 侧面二：四个标志**全部显式写出来**、只有 `enumerable` 是假
const full: any = {};
Object.defineProperty(full, "a", { value: 1, writable: true, enumerable: false, configurable: false });
console.log(Object.keys(full).length);

// 侧面三：**取值器**键在枚举那一族里的待遇与数据键相同
const acc: any = {};
Object.defineProperty(acc, "a", { get() { return 1; }, enumerable: false });
console.log(Object.keys(acc).length + "," + acc.a);
console.log(Object.keys({ get a() { return 1; } }).join(","));

// 侧面四：`propertyIsEnumerable` 是这一格的**自问自答**（与 `keys` 同一口径）
const pe: any = {};
Object.defineProperty(pe, "a", { value: 1 });
console.log([pe.a, Object.keys(pe).length, pe.propertyIsEnumerable("a")].join(","));
