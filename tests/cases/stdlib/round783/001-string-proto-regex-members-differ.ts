// xl:title `String.prototype` 上那三个**收正则**的成员：`match` / `matchAll` / `search`
// xl:round 783
// xl:judge stdout
// xl:want differ
// xl:why 第 783 轮量到的：`String.prototype` 的**自有名表**里少三个名字——
// xl:why `match`、`matchAll`、`search`（本仓 49 格、JS 52 格，差额正好这三个）；
// xl:why 相邻的 `replace` / `replaceAll` / `split` **在**，而且都是函数，所以这不是
// xl:why 「字符串方法那一族没做」，是**那三个收正则的入口没登记**。
// xl:why 它连着 `RegExp` 那一族（`RegExp` 全局名本仓也没有，登在
// xl:why `stdlib/round779/r779j-01` / `r779j-02`）：`String.prototype.match` 的规范定义
// xl:why 就是「读 `Symbol.match` 那一格、是正则就走正则那条路」，所以**三格一起缺**
// xl:why 与正则那一族是**一层包一层**的关系——先有三格，才有「收什么」的问题。
// xl:why 三个名字一个都不在时，`"abc".match(...)` 报的是
// xl:why `TypeError: cannot call a non-closure value`（**离现场很远**：
// xl:why 它看起来像「字符串坏了」，而不是「这一格没登记」）。
// xl:why **不许被带偏的那一半**：`replace` / `replaceAll` / `split` 三格要照旧在、
// xl:why 名表里其余 46 格一个不许多一个不许少（这一条把**整张名表**逐字钉住）。
// xl:end

const names = Object.getOwnPropertyNames(String.prototype).sort();

// 三个缺席的名字：逐个问一次「在不在」（比 `typeof` 更直接）
for (const name of ["match", "matchAll", "search", "replace", "replaceAll", "split", "normalize", "at"]) {
  console.log("01 " + name + " in = " + names.includes(name) + ", typeof = " + typeof (String.prototype as any)[name]);
}

// 整张名表逐字对（收这一条时不许顺手多出或少掉别的格）
console.log("02 count = " + names.length);
console.log("03 names = " + names.join(","));

// 缺席那三格在调用位上的症状（本仓给「不是可调用的值」）
const show = (label: string, f: () => any): void => {
  try {
    console.log(label + " = ok:" + String(f()));
  } catch (e) {
    console.log(label + " = throw:" + ((e as any) && (e as any).constructor ? (e as any).constructor.name : "?"));
  }
};
show("04 call match", () => ("abc" as any).match("b"));
show("05 call search", () => ("abc" as any).search("b"));
show("06 call matchAll", () => ("abc" as any).matchAll("b"));
show("07 call replace", () => ("abc" as any).replace("b", "X"));
show("08 call split", () => ("a,b" as any).split(","));
show("09 call replaceAll", () => ("aba" as any).replaceAll("a", "X"));

// `Symbol.match` 那一格：JS 的 `String.prototype[Symbol.match]` 就是 `match` 那个函数本身
console.log("10 proto[Symbol.match] type = " + typeof (String.prototype as any)[Symbol.match]);
console.log("11 proto own has Symbol.match = " + Object.prototype.hasOwnProperty.call(String.prototype, Symbol.match));
console.log("12 String.prototype.length = " + (String.prototype as any).length);
