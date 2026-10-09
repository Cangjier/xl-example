// xl:note 第 869 轮普查量出的缺口（declare-module-wildcard-newline-6）：这一条钉的是上面那条根因的一个落点
// xl:known-gap 环境模块体里 `const c:` 换行 `string;`：类型标注跨行时那一段被当成下一条语句
declare module "*.css" { const c: 
 string; export default c; }
