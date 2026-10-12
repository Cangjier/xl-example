// xl:note `if` 当**对象字面量的成员名**：`{ if(): T { … } }` 与 `if (…)` 形状一模一样，
//       分它们的只有「宿主那个花括号是不是值位」（第 647 轮：`IfSetBranch` 的位置闸）
// xl:expect ObjectLiteral,MethodDeclaration,MethodBody,ReturnType,TypeLiteral,Parameter
const table = {
  if(): number { return 1; },
  else(): number { return 2; },
};
console.log(table.if(), table.else());
const nested = { inner: { if(): number { return 3; } } };
console.log(nested.inner.if());
take({ if(): number { return 4; } });
type HasIf = { if(): number };
function take(o: HasIf): number { return o.if(); }
console.log(take({ if(): number { return 5; } }));
