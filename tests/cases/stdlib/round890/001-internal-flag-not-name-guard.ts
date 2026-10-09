// xl:title 记账格那一族的守卫：用户自己的同名属性、`in`、名表、赋值后读回
// xl:round 890
// xl:judge stdout
// xl:end
// **这一条钉的是「按标记滤、不按名字滤」那一半**（第 890 轮）：
// `f.bind(x)` 身上的 `__boundTarget` / `__boundThis` / `__boundArgs` / `prototype`
// 是**引擎记账格**（`PropertyFlagInternal`），用户看不见；可用户**自己**写一个
// `{ ["__boundTarget"]: 1 }` 是一个**真的**自有属性名——JS 给 `["__boundTarget"]`，
// 按名字滤的那一版会把它一起藏掉（`globals.xl.md` 第 737 轮 `#p` 那一族同一个坎）。
//
// 另一半是**赋值**：`bound.prototype = 7` 在 JS 里新开一格**普通**自有属性
// （记账那一格不是属性，赋值看不见它），之后读回 7、`in` 给真；
// 而 `new bound()` 照旧用**目标**的 `prototype`（那一格是记账那一份）。
const own: any = { ["__boundTarget"]: 1, ["__boundThis"]: 2, ["__boundArgs"]: 3 };
console.log("01", Object.getOwnPropertyNames(own).join(","));
console.log("02", "__boundTarget" in own, own.__boundTarget, Object.keys(own).join(","));
function F(this: any) { this.a = 1; }
const bound: any = (F as any).bind(null);
console.log("03", Object.getOwnPropertyNames(bound).join(","));
console.log("04", "__boundTarget" in bound, bound.__boundTarget, "prototype" in bound, typeof bound.prototype);
bound.prototype = 7;
console.log("05", "prototype" in bound, bound.prototype, Object.getOwnPropertyNames(bound).join(","));
console.log("06", new bound().a, new bound() instanceof F);
