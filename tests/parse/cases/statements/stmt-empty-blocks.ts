// xl:note 空块：`if` / `else` / `while` / `do..while` / `for..of` 的体括号由 token 出的 `BodyBraceAt` 定位
declare const flag: boolean
declare const xs: number[]
if (flag) {} else {}
while (flag) {}
do {} while (flag)
for (const x of xs) {}
for (const x of xs) { break }
