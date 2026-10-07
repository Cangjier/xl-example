// xl:expect Function,BinaryOperator
// xl:note 下一行以双目运算符 `+` / `*` 开头时是接着写，不是新语句（ASI 不在它前面断句）
function stamp(millis) {
    return DateDays(millis) * 86400000
        + hours * 3600000 + minutes * 60000
        + seconds * 1000;
}
