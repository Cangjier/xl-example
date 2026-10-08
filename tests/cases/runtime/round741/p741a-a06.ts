// xl:title 可选调用接在**await** 后面
// xl:round 741
// xl:judge stdout
// xl:want differ
// xl:why **`await` 与可选调用叠在一起**：`(await o?.m)()` / `await o?.m?.()` 这一族
// xl:why（实参括号那一格与 `?.` 的另一侧没有接线）——`await o?.m()` 交出来的还是那个方法，
// xl:why `(await o?.m)()` 于是调到了 `await` 的结果上 ⇒ 与 Node 差一整层（`{}` 对 `Promise { 4 }`）。
// xl:why 与 `p741a-a02` / `p741a-a03` **同一条根**。
// xl:end
async function main() {
  const o: any = { m: () => Promise.resolve(4) };
  console.log((await o?.m)());
  console.log(await o?.m());
  console.log(await o?.m?.());
  const n: any = null;
  console.log(await n?.m?.());
}
main();
