// xl:note 文件以 import 结尾（后面除了换行什么都没有）时，Import 的内容只能渲染一份
// 真缺口：重组把 `import ...` 收成 `Import` 时没有把吃掉的单元从列表里摘掉，
// 而末尾那条语句重组规则收到的下标是上一次扫描留下的（那时这些单元还没被收走），
// 于是它在旧下标上又把整段收了一遍——
// 产物里 `<Import>` 的内容出现两次（一次在 `<Import>` 里、一次在它旁边那个多余的 `<Statement>` 里）。
// 触发条件两条：**这一行是文件的最后一个构造**，且它后面**没有 `;`**（只有换行）。
// 用计数钉住：重复渲染会让 Bracket / Identifier / String 各多一倍。
// xl:expect Import:1,Bracket:1,Identifier:2,String:1
// xl:absent Class,Interface,Enum,Function
import { readFile } from 'node:fs'
