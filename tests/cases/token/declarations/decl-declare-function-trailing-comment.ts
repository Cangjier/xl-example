// xl:note 无体环境声明的返回类型后面夹一条注释、再跟 `;`
// xl:known-gap 无体声明的区间只到自己最后一个实义单元，尾随注释与 `;` 没算进去（TS 到 `;` 为止）
// xl:expect Function,ReturnType,Keyword
declare function f(): void /* c */ ;
