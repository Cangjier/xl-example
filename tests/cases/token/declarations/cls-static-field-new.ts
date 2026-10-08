// xl:note 类的静态字段初始化里有 `new` 时，**后面那个成员会被吞掉**：
// `A: T = new R(1);` 之后的 `B: T = new R(2);` 收不成 Field。
// 与 `new` 无关写法（`= 1` / `= [1]`）都正常，所以是 NewReorganization 与 ClassBody 成员边界的交互。
// 真实语料里这类形状只在实现文件（dist/ts/**）出现，本题第 28 轮加新文件时才暴露出来
// xl:expect Field:2,Class,ClassBody
class C {
  public static readonly A: T = new R(1);
  public static readonly B: T = new R(2);
}
