// xl:title 计算键访问器的名字（`get c` / `set c`）
// xl:round 732
// xl:judge stdout
// xl:why **第 755 轮收掉了**（指令已撤、用例留着当守卫）：`EmitComputedFunctionName`
// xl:why 现在收一个前缀——非空的 `"get "` / `"set "` 交给语言层的
// xl:why `set_function_name(闭包, 键, 前缀)` 去拼（在降级层拼要多占两格槽，
// xl:why 实测把三条语料打成 `slot out of range`）。
// xl:why 根子那一段留着做历史：静态键由 `LowerFunctionValue` 的实参给（第 732 轮），
// xl:why 动态键只能运行期补，而那个辅助函数原来只写键本身。
// xl:end
const o = { get ["g"]() { return 1; }, set ["s"](v: number) {}, get ["x" + "y"]() { return 2; } };
const dg = Object.getOwnPropertyDescriptor(o, "g") as any;
const ds = Object.getOwnPropertyDescriptor(o, "s") as any;
const dx = Object.getOwnPropertyDescriptor(o, "xy") as any;
console.log(dg.get.name, ds.set.name, dx.get.name);
