// xl:note 实例化表达式的后继字符：`>` 后面接 `]` / `?` / `:` / `||` / `&&` 时仍是类型实参段
// xl:expect GenericType:6
const a1 = [f<number>]
const a2 = f<number> ? 1 : 2
const a3 = x ? f<number> : 1
const a4 = f<number> ?? 1
const a5 = f<number> || 1
const a6 = f<number> && 1
