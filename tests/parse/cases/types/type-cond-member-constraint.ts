// xl:note 约束段里有成员访问：回扫必须跨过 `.`，否则整条条件类型认不出来
// xl:expect ConditionalType,GenericType,Keyword
// xl:absent TernaryOperator
type V<T> = T extends NodeJS.ArrayBufferView<infer B> ? Buffer<B> : never
