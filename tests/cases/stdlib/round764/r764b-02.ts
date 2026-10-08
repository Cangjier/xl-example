// xl:title 格式串不是第一个实参时什么都不换
// xl:round 764
// xl:judge stdout
// xl:note 第 764 轮收掉的两格（都在 `FormatConsoleLine` 那一趟里）：
// xl:note ① **`%c` 消耗一个实参、自己换成空串**——原来写在 `%%` 旁边（「不消耗实参」），
// xl:note    于是 `console.log("%c", "css")` 给 `" css"`（Node 给**空行**）；
// xl:note ② **`%j` 一次都不换**——原来那一格写着「没做」（**要做**），
// xl:note    而它是 `JSON.stringify`（给不出字符串的那几档 Node 印 `"undefined"`）。
// xl:note **两张表都是实测的**，量错的原因写在 `FormatConsoleLine` 那一段里：
// xl:note 格式串**只有落在第一个实参上**才生效——第 763 轮那一版的探针把它放在了第二个，
// xl:note 于是「Node 什么都不换」被当成了「这一层也不该换」（`r764b-02` 把这一半也钉住）。
// xl:end
console.log("a", "%s", "x");
console.log("a", "%d", 1);
console.log("a", "%o", { a: 1 });
console.log("a", "%%", "x");
console.log("a", "%c", "x");
console.log("a", "%j", "x");
