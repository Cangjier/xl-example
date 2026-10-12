// xl:note 对象字面量里的 `function` / `import` 当**成员名**（第 654 轮）：同词同父单元，
//       分开它们的只有名字**前面那一格**——成员起点 ⇒ 方法名；`:` / `=` ⇒ 值位的函数表达式
// xl:expect ObjectLiteral,MethodDeclaration,MethodBody,ReturnType,Function,FunctionBody,ImportType,TypeLiteral
const table = {
  function(): number { return 1; },
  import(): number { return 2; },
  async function(): Promise<number> { return 3; },
  values: function () { return 4; },
  named: function inner() { return 5; },
  nested: { function(): number { return 6; } },
};
type Query = { a: typeof import("./m").A };
const dynamic = import("./m");
const call = (): number => table.function() + table.import();
console.log(call(), table.values(), table.named(), table.nested.function(), dynamic);
export type { Query };
