// xl:title 一元运算：+ - ! void typeof 在一批值上的结果
// xl:judge stdout
// xl:end

console.log(+"", +"x", -"3", -true, !0, !"", ![], !{}, !!null);
console.log(void 0, typeof void 0, typeof null, typeof [], typeof (() => 0));
