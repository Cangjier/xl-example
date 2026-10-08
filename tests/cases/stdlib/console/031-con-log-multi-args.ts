// xl:title 多实参之间空一格、`%s` 那一族格式说明符
// xl:round 691
// xl:judge stdout
// xl:note 第 691 轮登记的缺口、**同一轮就收掉了**：`console.log` 的第一个实参是字符串
//       并且后面还有实参时，那个字符串是一张**格式串**（`util.format`）——
//       `%s` / `%d` / `%i` / `%f` / `%o` / `%O` 各消耗一个实参、`%c` 与 `%%` 不消耗，
//       认不出的说明符与「没有实参可消耗」两种都原样留着。
//       **`%j` 还没做**（要走 `JSON.stringify` 那一整支）——写在 `globals.xl.md` 那一处。
// xl:end
console.log("a", 1, { b: 2 });
console.log("%s", "x");
console.log();
console.log(undefined, null, true);
