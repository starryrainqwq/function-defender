# Git 提交配置文件

## 仓库信息
- **远程仓库地址**: https://github.com/starryrainqwq/function-defender.git
- **Git 用户名**: starryrain
- **Git 邮箱**: dzy505531034@gmail.com

## 提交指令模板

> 使用方法：将以下内容复制到 Cline 的输入框中，只需提供一句提交信息即可自动完成增量代码提交与推送。

### 示例指令

```
提交并推送所有更改，提交信息为："feat: 添加了XXX功能"
```

### 标准提交流程

1. 配置用户名和邮箱（如未配置）：
   ```
   git config user.name "starryrain"
   git config user.email "dzy505531034@gmail.com"
   ```

2. 添加所有更改：
   ```
   git add .
   ```

3. 提交更改：
   ```
   git commit -m "提交信息"
   ```

4. 推送到远程仓库：
   ```
   git push