// xl:title `await` 与 `as` / 非空断言 / 可选链
// xl:round 739
// xl:judge stdout
// xl:want differ
// xl:why **可选链那一格还在**（第 739 轮量到、如实登记）：`await o?.p + 1` 里 `await` 的操作数
// xl:why 是 `o?.p` 那一条**可选链**——产物的形状与上面覆盖的那些不同（链在 NCO 那一层散着），
// xl:why 投影折出来的仍是 `await (o?.p + 1)` ⇒ 本仓给 `[object Promise]1`、Node 给 `3`。
// xl:why 同一条用例里前两行（`as` 那一格）与第三行（`!` 非空断言）**都过了**，
// xl:why 所以它不是「`await` 的紧密度」这条根，而是 **`?.` 那一条链的接线**（第 729 轮那一族的邻居）。
// xl:end
const o: any = { p: Promise.resolve(2) };
async function main() {
  console.log(await Promise.resolve(1) as any);
  console.log((await Promise.resolve(1)) as any);
  console.log(await o.p! + 1);
  console.log(await o?.p + 1);
}
main();
