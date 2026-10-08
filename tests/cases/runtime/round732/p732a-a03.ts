// xl:title 类里计算键方法的名字
// xl:round 732
// xl:judge stdout
// xl:want differ
// xl:why **类成员那条路的名字只从标识符取**：`class C { ["m"]() {} }` 的 `m` 在 Node 里
// xl:why 名字是 `"m"`（静态键）或 `"n1"`（动态键，运行期补）、静态成员 `"s"` 同理，
// xl:why 本仓**三格全给空串**。
// xl:why 根子：对象字面量那条路（`LowerObjectLiteral` 的 `MethodDeclaration` / `GetAccessor`）
// xl:why 第 620 / 732 两轮把「静态键给名字、动态键运行期补」两半都接上了，
// xl:why 而**类成员走的是另一条**（`LowerClass` 那一族，名字那一格只认 `Identifier` / 关键字）——
// xl:why 同一个形状在两条路上，只接了一条。要做。
// xl:end
class C { ["m"]() { return 1; } static ["s"]() { return 2; } ["n" + 1]() { return 3; } }
console.log(C.prototype.m.name, C["s"].name, C.prototype.n1.name);
