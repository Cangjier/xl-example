// xl:note body 是空语句（`;`）：实测基线**不**回退，AST 逐字一致。
// xl:expect ok
if (a) ;
