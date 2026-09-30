// xl:note 数组字面量展开 [...xs] 与 [1, 2, ...xs]
// xl:expect JsonArray
const a = [...xs];
const b = [1, 2, ...xs];
