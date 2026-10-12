// 第 193 轮：**对象自己的 `toString`**（`${o}` / `"x" + o` / `String(o)`）。
//
// 这三种写法在 JS 里都走 `ToPrimitive(o, "string")`——**先问对象自己的 `toString`**。
// 本仓原来一步都不问，直接给 `[object Object]`：那一刻是「**静默错值**」——
// 每一格单看都像对的（`[object Object]` 确实是「某个默认值」），
// 只有与 Node 逐字节比才看得出来（普查表的 `class-tostring-template` 就是这么红的）。
//
// 修法：在**两个入口**（`String(x)` 与 `+` 的拼接）先问一次
// 「自有或原型链上那一格 `toString` 是不是能被调」——能就**带 `this` 调一次**，
// 结果**必须是字符串**才用它（JS 的口径）；没有那一格就照旧落回 `[object Object]`。
//
// **还没做的那一半**（写在明处）：`toString` 给了非原始值时，JS 会接着问 `valueOf`，
// 而 `o + 1`（走 `ToPrimitive(o, "default")`，**先 `valueOf`**）今天还是抛
// `arithmetic on a non-numeric operand`——那是**引擎的算术那一格**，单独立一轮。

class C {
  toString() { return "C!"; }
}
const c = new C();

// ① 三种写法都问对象自己的 `toString`
console.log(`${c}`);
console.log("x" + c);
console.log(String(c));

// ② 类里继承链上那一格也算（父类定义的 `toString` 沿原型链找到）
class Base {
  toString() { return "base"; }
}
class Derived extends Base {}
console.log(`${new Derived()}`, String(new Derived()), "d" + new Derived());

// ③ 普通对象没有那一格 → 照旧 `[object Object]`（回归）
console.log(`${({ a: 1 })}`, String({ b: 2 }), "y" + { c: 3 });

// ④ 返回非字符串 → 不当答案（照旧落回默认；JS 会接着问 `valueOf`，那一半还没做）
class Weird {
  toString() { return 42; }
}
console.log(`${new Weird()}`);

// ⑤ 数组 / 函数的渲染不受影响（回归）
console.log(`${[1, 2]}`, String([3, 4]), [1, [2, 3]].toString());
console.log(`${null} ${undefined}`, String(true), `${1.5}`);
