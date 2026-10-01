// xl:note 继承段：类 / 接口 / 匿名类表达式 / 括号化继承表达式四处都收成 HeritageClause + ExpressionWithTypeArguments（第 66 轮第七批）
// xl:expect HeritageClause:5,ExpressionWithTypeArguments:7,Class:3,Interface,Let,GenericType
class C extends B implements I, J {}
interface K extends L<M>, N {}
const E = class extends F {};
class G extends (Base) {}
