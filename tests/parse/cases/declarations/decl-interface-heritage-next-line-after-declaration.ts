// xl:expect Interface,InterfaceBody,HeritageClause
// xl:note 声明头跨行，且**前面还有一条声明**：段首那一格是上一条留下的软换行（`WordOf` 给空串）
interface BaseOptions {
    timeout?: number;
}
interface RunningScriptOptions
    extends BaseOptions, Pick<BaseOptions, "timeout">
{
    contextName?: string;
}
