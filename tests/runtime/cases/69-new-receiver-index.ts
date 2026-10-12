// 第 191 轮：**裸 `new` 表达式当接收者**（`new C()["m"]()`）+ **数组上的「不是下标」的键**。
//
// ① 第 183 轮量到的那一格：`new C()["m"]()` 报 `unimplemented: calling a non-closure value`
//    （**整份文件进不来**）。根因在 **token 层**：`JsonArrayReorganization` 判「`[` 是不是
//    数组字面量的开头」时，会看一眼**前一个单元**是不是**操作数**
//    （`Identifier` / `Bracket` / `String` / `Method` / `PropertyAccess` / `ObjectLiteral` /
//    `this` / `super`…）——而 **`New` 不在那张名单里** ✗。
//    于是 `new C()["m"]` 里那个 `["m"]` 被收成 `ArrayLiteral` ✓，
//    成员访问链（`PropertyAccess`）**没有起点** ✓ → 整段在产物里塌掉（实测 ✓）。
//    修法：名单里补一格 `New`（它已经是一个操作数，与 `Method` / `PropertyAccess` 同源 ✓）。
//
// ② 顺带把**数组**那一支也收进「一条判据」：`arr["map"]` / `arr["0"]` 原来也抛
//    `unimplemented: non-numeric index needs ToString` ✗（数组那一条**无条件**转给
//    `props.GetIndex` ✓，而它只认数字键 ✗）。现在与字符串那一支同一条判据：
//    键字符串化 → 是下标就走下标、不是就走**属性**。

class C {
  m() { return 3; }
  items: number[] = [10, 20];
  "s p"() { return 4; }
}
const c = new C();

// ① 裸 `new` 接收者：下标调用与下标读
console.log(new C()["m"]());
console.log(new C()["s p"]());
console.log(new C()["items"].length, new C()["items"][1]);
const key = "m";
console.log(new C()[key](), new C()["m" + ""]());

// ② 数组上的「不是下标」的键（同一个根因的另一半）
const arr: any = [1, 2];
console.log(arr["length"], arr["0"], arr["join"]("-"));
console.log(new Array(3)["length"], [...new Array(3)].length);

// ③ 回归：本来就好的那几条
console.log(c["m"](), new C().m(), (new C() as any)["m"]());
console.log(new Map([["a", 1]])["get"]("a"));
console.log(new C()["items"].map((v: any) => v * 2).join(","));
