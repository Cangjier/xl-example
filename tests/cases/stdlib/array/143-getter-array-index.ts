// xl:title 数组下标位置上的访问器（`defineProperty`）
// xl:round 691
// xl:judge stdout
// xl:why **第 756 轮收掉了**（指令已撤、用例留着当守卫）：`a.join(",")` 原来按
//        `source.GetLength()`（**元素区的格子数**）循环，而装访问器会把那一格
//        **摘成洞**（`props.xl.md` 的 `IndexAccessorAt` 那一处写着为什么）——
//        于是循环一次都不进。现在上界换 `ArrayLikeLength`、装了访问器那一格
//        改走 `GetProperty`（判据与 `RtOp.GetIndex` 那处同一句）。
// xl:end
const a: any = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true });
console.log(a[1], a.join(","), JSON.stringify(a), a.length);
