// xl:title 计算键访问器的名字（`get c` / `set c`）
// xl:round 732
// xl:judge stdout
// xl:want differ
// xl:why **动态键的访问器名字没人补**：字面量键那两格（`get g` / `set s`）第 732 轮收掉了，
// xl:why 而 `{ get ["x" + "y"]() {} }` 的 getter 名字在 Node 里是 **`"get xy"`**、本仓给空串。
// xl:why 根子：名字那两半里，**静态键**由 `LowerFunctionValue` 的实参给（第 732 轮接上的），
// xl:why **动态键**只能由运行期的 `EmitComputedFunctionName` 补写——而那个辅助函数写的是
// xl:why **键本身**（`closure["name"] = key`，为「方法 / 箭头」那一档写的），
// xl:why 访问器要的是**带 `get `/`set ` 前缀**的串（判据 `c371-stdlib-function-tostring-and-name`
// xl:why 量过非计算键那一档）。要收它得让那个辅助函数收一个前缀（或先拼串再写）。要做。
// xl:end
const o = { get ["g"]() { return 1; }, set ["s"](v: number) {}, get ["x" + "y"]() { return 2; } };
const dg = Object.getOwnPropertyDescriptor(o, "g") as any;
const ds = Object.getOwnPropertyDescriptor(o, "s") as any;
const dx = Object.getOwnPropertyDescriptor(o, "xy") as any;
console.log(dg.get.name, ds.set.name, dx.get.name);
