// xl:title 删除进行中的名字：`delete` 的返回值与属性去向
// xl:round 748
// xl:judge stdout
// xl:end
// **第 778 轮转绿**（台账按规矩撤掉，用例留着当守卫）：这一条原来记的是
// `delete 字符串下标` 给 `true`（Node 给 `false`——`"abc"[0]` 那一格**不可配置**）。
// 第 778 轮在 `vm.xl.md` 的 `del_prop` 里给**字符串接收者**单开了一档：
// 「`length` 或落在长度以内的下标 ⇒ `false`」，判据就是本文件第 3 行。
// xl:end
const o: any = { a: 1, b: 2 };
console.log(delete o.a, "a" in o, o.a, Object.keys(o).join(","));
console.log(delete (o as any).missing, delete o["b"]);
const s = "abc";
console.log(delete (s as any)[0], s[0]);
const frozen = Object.freeze({ k: 1 });
console.log(delete (frozen as any).k, frozen.k);
console.log(delete (1 as any).x);
