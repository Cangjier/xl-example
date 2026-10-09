// xl:title 符号上的**下标读**：`description` / `toString` 两格读不到
// xl:round 777
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**（第 777 轮普查当场红的那几行）：`Symbol("s")["description"]`
// xl:why 在 Node 里给 `"s"`、本仓给 `undefined`；`typeof Symbol("s")["toString"]`
// xl:why Node 给 `"function"`、本仓给 `"undefined"`。
// xl:why **点号那两格一直是好的**（`Symbol("s").description` 给 `"s"`）——
// xl:why 因为符号**不是对象**（没有属性表、也没有原型那一格），那两格由
// xl:why `RtOp.GetProp` **自己特判**（`vm.xl.md` 里「符号上的 `description` / `toString`」
// xl:why 那两段）；而 `RtOp.GetIndex` 那边一句特判都没有。
// xl:why **与同一轮收掉的那一格是同一个病灶的两个出口**：`get_index` 原来还有一句
// xl:why 「不是对象就给 `undefined`」的早退（数字 / 布尔那一档这一轮收掉了），
// xl:why 符号因为**根本没有目标可查**而留在了那一句上。
// xl:why **为什么这一轮不顺手收**：收法要让两处特判**住到一处**（现在它们长在
// xl:why `RtOp.GetProp` 的代码里），照抄一份就是「两处会漂」——而这一族一共只有
// xl:why 两格，抄一份的代价与抽一处的代价这轮量不出来。**先如实登记，不猜**。
// xl:end
const show = (v: any): string => (typeof v === "string" ? JSON.stringify(v) : String(v));
const s: any = Symbol("s");
console.log('01 description 点号读', show(s.description));
console.log('02 description 下标读', show(s["description"]));
console.log('03 toString 点号读', show(typeof s.toString));
console.log('04 toString 下标读', show(typeof s["toString"]));
console.log('05 不存在的键两读一致', show(typeof s.nope) + ":" + show(typeof s["nope"]));
console.log('06 无描述的符号', show(s.description) + ":" + show(Symbol()["description"]));
