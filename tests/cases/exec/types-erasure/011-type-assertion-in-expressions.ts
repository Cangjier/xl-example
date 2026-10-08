// xl:title as 落在实参 / 返回 / 数组元素 / 三元分支里
// xl:judge stdout
// xl:end

function id(x: any) { return x; }
console.log(id(1 as any), id("s" as string), [1 as number, 2 as number].length);
const flag = true;
console.log(flag ? (1 as number) : (2 as number));
const cast = { a: 1 } as { a: number };
console.log(cast.a);
