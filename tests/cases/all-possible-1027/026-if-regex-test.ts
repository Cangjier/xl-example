// xl:note 唯一实测回退：正则字面量 + 成员调用做条件，shell 路径抛异常后整条文件回退 legacy。
// xl:expect fallback
if (/x/.test(s)) {}
