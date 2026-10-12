// xl:title 分号可省、各种注释、JSDoc 夹在中间
// xl:judge stdout
// xl:end

// 行注释
/** JSDoc 块注释 */
const a = 1
const b = 2 /* 行内 */
/*
多行
*/
console.log(a + b)
;[1, 2].forEach((v) => { console.log("v" + v) })
