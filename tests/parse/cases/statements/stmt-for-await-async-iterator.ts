// xl:expect Foreach:1,ForeachDefine:1,ForeachEnumable:1,ForeachBody:1
// xl:expect ObjectLiteral:5,MethodDeclaration:3,MethodBody:3,ReturnType:2
// xl:expect IfSet:1,TernaryOperator:1,GenericType:4,PropertyAccess:3
// xl:note `for await` 的自定义异步可迭代物：计算键方法名 `[Symbol.asyncIterator]`、
// xl:note 迭代器对象里的 `next()` / `return()`（两个关键字方法名）、`IteratorResult<T>` 返回类型
const source = {
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      next(): Promise<IteratorResult<number>> {
        i += 1;
        return Promise.resolve(i <= 3 ? { value: i, done: false } : { value: 0, done: true });
      },
      return(): Promise<IteratorResult<number>> {
        return Promise.resolve({ value: 0, done: true });
      },
    };
  },
};
async function main() {
  for await (const n of source) {
    if (n === 2) break;
  }
}
