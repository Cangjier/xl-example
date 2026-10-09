// xl:note 第 869 轮普查量出的缺口（declare-global-newline-2）：这一条钉的是上面那条根因的一个落点
// xl:known-gap `declare` 换行 `global`：`declare` 是上下文关键字、换行处走 ASI（第 839 轮量过并如实留着），于是 `global` 那个环境模块声明整条认不出来
declare global 
 { interface W { a: number } }
