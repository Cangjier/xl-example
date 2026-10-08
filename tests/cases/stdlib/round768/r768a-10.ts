// xl:title `splice` / `slice` / `concat` 的负数参数与洞
// xl:round 768
// xl:judge stdout
// xl:note `slice` 与 `splice` 的负数参数各钉一遍（都从尾巴数），起点大于终点给空数组。
// xl:note `splice(-2)` 是「从倒数第二格删到尾巴」——它**改的是接收者**，所以两次打印要分开看。
// xl:note **洞那一档**是三条路的分界：`slice` / `concat` **保留洞**（`1 in 结果` 为假），
// xl:note 而 `splice` 取走的那一段是**按 `length` 走**的——这一条把三个朝向一次钉住
// xl:note （第 724 轮登的 `p724a-b02` 量的是 `toSorted` 那一族**不留洞**，与本条不是同一条）。
// xl:end
const a = [1, 2, 3, 4, 5];
console.log("01", JSON.stringify(a.slice(1, 3)), JSON.stringify(a.slice(-2)), JSON.stringify(a.slice(3, 1)));
console.log("02", JSON.stringify(a.splice(1, 2)), JSON.stringify(a));
const b = [1, 2, 3, 4, 5];
console.log("03", JSON.stringify(b.splice(-2)), JSON.stringify(b));
const c: any[] = [1, , 3];
console.log("04", c.slice(0).length, 1 in c.slice(0), c.splice(0).length);
const d: any[] = [1, , 3];
console.log("05", d.concat([4]).length, 1 in d.concat([4]));
