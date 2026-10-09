// xl:note 守卫：`f<number> + 1` 与 `x < y > z` 仍读成比较式（`<…>` 不成形）
// xl:absent GenericType
const a = f<number> + 1
const b = x < y > z
