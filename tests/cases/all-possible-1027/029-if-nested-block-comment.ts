// xl:note 两层嵌套、最内层只剩注释：实测基线**不**回退。
// xl:expect ok
if (a) { if (b) { /*x*/ } }
