// xl:title `Array.from` 两支：迭代协议那一边与类数组那一边
// xl:round 737
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p737b-b03`；正文一字未动）。
// 判定点只有一个：**`Array.from` 认哪一支**——有 `Symbol.iterator` 就走迭代协议
// （自定义可迭代物 / 字符串 / `Set`），没有就看 `length` 逐下标取；`Map` 交出的是 `[k, v]`。
// （`exec/round709/005-array-from-array-likes` 量的是类数组那一支的边角，与本条同一条根。）
const box: any = { [Symbol.iterator]() { let i = 0; return { next: () => (i < 2 ? { value: "v" + ++i, done: false } : { value: undefined, done: true }) }; } };
console.log(Array.from(box).join(","));
console.log(Array.from("ab").join(","), Array.from(new Set([1, 1, 2])).join(","));
console.log(Array.from({ length: 2, 0: "a" }).join(","));
console.log(Array.from(new Map([[1, 2]])).length, Array.from(new Map([[1, 2]]))[0].join(":"));
