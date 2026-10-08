// xl:title `JSON.stringify` 对 `Map` / `Set` / 迭代器（都是空对象）
// xl:round 737
// xl:judge stdout
// xl:want differ
// xl:why **本仓的迭代器就是那个数组**（第 279 / 331 轮的模型，第 725 轮登过同一条根）：
// xl:why `[1, 2].values()` 在 Node 里是**另一个对象**（`JSON.stringify` 给 `{}`、
// xl:why `Array.isArray` 为假、取出 `next` 再 `call` **推进同一个游标**），
// xl:why 本仓给的就是那个数组本身（`JSON.stringify` 给 `[1,2]`、`Array.isArray` 为真）。
// xl:why **它不是「少了个方法」**：一致性差在模型上——要收得让迭代器有自己的对象格子
// xl:why （`__i` 与 `next` 挂在自己身上，`p725a-b01` 的 `xl:why` 写着同一条）。
// xl:end
console.log(JSON.stringify(new Map([[1, 2]])), JSON.stringify(new Set([1])));
console.log(JSON.stringify([1, 2].values()), JSON.stringify("ab"));
console.log(JSON.stringify({ m: new Map() }), JSON.stringify([new Set([1])]));
