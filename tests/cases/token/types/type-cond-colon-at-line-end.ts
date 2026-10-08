// xl:expect TypeAssign,ConditionalType
// xl:note 条件类型的假分支写在下一行：`:` 收尾时换行处不该收壳（`.d.ts` 里的常见排版）
type AutocompletePrimitiveBaseType<T> =
    T extends string ? string :
    T extends number ? number :
    T extends boolean ? boolean :
    never;
