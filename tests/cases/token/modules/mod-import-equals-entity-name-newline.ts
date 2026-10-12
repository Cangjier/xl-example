// xl:note `import A = foo` 换行 `("m");` 是**两条**语句——import-equals 的右值只能是 `require(…)` 或一条限定名，不是一次调用（第 984 轮）
// xl:expect Import:1,Bracket:1,ConstString:1
// xl:absent Method
import A = foo
("m");
