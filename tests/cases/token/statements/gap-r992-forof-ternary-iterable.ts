// xl:note `for…of` 的枚举对象是条件表达式：`for (const x of a ? [b] : [c]) { … }` 该整条收成 `ForOfStatement`（第 1007 轮收掉，第 992 轮登记时缺 51 漂 0 多 2）。
// xl:note 收法：判据落在**这一列的宿主括号是不是 `for (`** 上（`of` 在 TypeScript 里不是保留字、可以是普通标识符，所以不能按词判），见 `typescript/tokens/ternary-operator/ternary-operator.xl.md` 的 `IterableStartInForeachHeader`；这一份留着当守卫。
export function f(kind: any, tag: any, key: any): any {
  const table: any = new Map();
  for (const name of kind === undefined ? [tag] : [kind, tag]) {
    const inner = table.get(name);
    if (!(inner instanceof Map)) continue;
    const field = inner.get(key);
    if (typeof field === "string") return field;
  }
  return undefined;
}
