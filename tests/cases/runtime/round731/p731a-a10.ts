// xl:title `Function.prototype` 上那两格受限属性（`arguments` / `caller`）
// xl:round 731
// xl:judge stdout
// xl:want differ
// xl:why **`Function.prototype` 自己那两格受限属性没挂**：它本身是一个**松散函数对象**
// xl:why （`typeof` 给 `"function"`、`length` / `name` 第 731 轮挂上了），所以按规范它
// xl:why **自有** `arguments` / `caller` 两格（Node 给 `true true`；`hasOwnProperty` 那一行给真），
// xl:why 本仓给 `false false`。
// xl:why 根子在 `props.xl.md` 那两格是**按闭包那一位**（`HeapClosure.HasRestricted`）答的，
// xl:why 而 `protos.Function` 是一个**普通对象**（带一格可调用载荷）——没有闭包载荷可问。
// xl:why 要收它得给这一处单开一条判据（「这个接收者是不是 `protos.Function`」），
// xl:why 与第 709 轮那两格**同一条口径**，只是回答的落点不同。要做。
// xl:end
console.log("arguments" in Function.prototype, "caller" in Function.prototype);
console.log(Object.prototype.hasOwnProperty.call(Function.prototype, "arguments"));
