// xl:title 冻结的数组上 `sort` / `reverse`（原地改那两格）
// xl:round 723
// xl:judge stdout
// xl:want differ
// xl:why **原地改元素的那两格（`sort` / `reverse`）不问「这一格可写吗」**：`Object.freeze(a)`
// xl:why 之后 `a.sort()` 在 JS 里抛 `TypeError`（规范里 `sort` / `reverse` 写元素走的是
// xl:why `Set(…, true)`，写不下去就抛），而本仓照样排好（判据 `p723a-r11`）。
// xl:why **根子与 `push` 那一档不同**：`push` 走 `RequireArrayGrowable`（它问的是「可扩展吗」，
// xl:why 而 `sort` 不新增格子——`Object.preventExtensions(a); a.sort()` 在 JS 里是**好的**），
// xl:why 所以不能顺手把那一句搬过来。要的是「**元素那一摞里有没有不可写的那一格**」那一问
// xl:why （第 723 轮给 `freeze` / `seal` 补的元素影子正好答得出它，只是还没有人去问）。
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [3, 1, 2];
Object.freeze(a);
run(() => { a.sort(); console.log("sorted:" + a.join(",")); });
run(() => { a.reverse(); console.log("reversed:" + a.join(",")); });
console.log(show(a.join(",")));
