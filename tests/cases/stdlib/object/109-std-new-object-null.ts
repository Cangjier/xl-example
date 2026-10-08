// xl:title new Object(null)：构造调用该造一个空对象（不是原样返回 null）
// xl:judge stdout
// xl:why 第 690 轮**两行都收了**：`new Object(x)` 那一档早就对（`constructing` 先判），
//       而 `Object(null)` 原来**原样返回 `null`**（第 2 行就是它）——JS 里那也是 `{}`。
//       台账（原来记 `differ`）在第 690 轮撤掉。
// xl:end
console.log(new Object(null as any) === null);
console.log(Object(null as any) === null);
