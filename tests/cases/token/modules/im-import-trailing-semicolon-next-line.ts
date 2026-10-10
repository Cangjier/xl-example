// xl:note 导入声明自己吃着尾分号：换行之后那个 `;` 不是空语句（第 944 轮起 `Statement:1`——原来那一层空壳正是「`;` 另起一条」的产物，现在 `Statement.TrailingSemicolonJoins` 把那个分号判给上一行）
// xl:expect Bracket:1,ConstString:1,Identifier:2,Import:1,Root:1,Statement:1,String:1
import { a } from "m"
;
