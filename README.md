# session-id-header

DeepSeek Harness 会话 ID 透传插件。通过 `llm-pi-ai/request-headers` 扩展，把 Harness 已有的会话 ID 动态加入自定义模型 API 的 HTTP 请求头。`0.2.0` 起默认覆盖所有通过 `llm-pi-ai` 适配器发出的会话请求，不再限定 `linksub`。

## 安装

从 `0.1.0` 起，本仓库提供完整的 Harness 组合包声明。在 Harness 的「插件」页面选择 Git 仓库安装，填写：

```text
https://github.com/17716847870/session-id-header.git
```

如果之前遇到“这个包没有声明组合包，不能作为插件管理”，原因是早期仓库缺少 `package.json` 和 `dsh.bundle.patch`。该问题已在 `0.1.0` 修复。重新添加最新版本；如仍命中旧缓存，可使用带最新完整提交 SHA 的地址：

```text
https://github.com/17716847870/session-id-header.git#完整提交SHA
```

等待安装成功，若界面提示重启，按提示重启后生效。通过插件管理器安装时，不需要手动填写插件文件路径，也不需要再追加 `insert` 条目。

本包没有依赖项或安装脚本；安装和启用由使用者手动操作。

## 默认行为

- 默认配置 `providers: ['*']`，处理所有通过 `llm-pi-ai` 适配器发出的会话推理请求；新增 provider、切换模型无需修改本插件配置。代码中省略 `providers` 时也默认匹配全部。
- 请求头为 `x-session-id`，值来自当前请求的 `request.sessionId`。
- 同一会话的请求使用相同 ID，不同会话使用各自 ID。
- 无 sessionId 的辅助调用不添加该头。
- 不新建会话，不修改聊天正文，不保存或上传日志。

请求头示例：

```http
x-session-id: session-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

中转站需要读取这个请求头才能按会话关联请求。若要继续传给上游，中转站还需支持相应透传；本插件不修改中转站配置。

## 自定义 provider 和请求头

通常无需额外配置。若要显式设置全部 provider 和请求头，可将下列配置覆盖项追加到当前 profile 的 `cordis.patch.yml`。同目录的 `cordis.patch.example.yml` 提供了相同示例。

```yaml
- id: session-id-header
  config:
    providers: ['*']
    headers: [x-session-id]
```

`'*'` 表示匹配所有 provider，YAML 中请保留引号。如需只对指定服务商生效，可改为 `providers: [my-gateway, another-gateway]`。这些名称是模型配置中 `providers` 字典的键，不是模型名称。`providers: []` 表示不匹配任何 provider。

从 `0.1.0` 升级时，请在插件管理器手动更新到 `0.2.0`。如果安装地址固定了旧提交 SHA，请改为新提交地址；按界面提示重启。旧版本不会自动改变行为。如果自己添加过 `providers: [linksub]` 等覆盖项，需要将它改成 `providers: ['*']`，否则仍只匹配列出的服务商。

覆盖范围取决于适配器：OpenAI 兼容、Anthropic、Google 等协议只要经由 `llm-pi-ai` 并携带 `request.sessionId`，都会经过同一请求头扩展。使用其他插件或独立适配器的模型不在此扩展范围内；本插件不会识别或改写它们的请求。

`headers` 填中转站实际读取的请求头名称；可指定多个头名，它们会使用相同的会话 ID。不要把真实 ID 写成固定 header 值。

默认 desktop profile 的补丁文件位置通常为：

- macOS / Linux：`~/.dsh/profiles/desktop/cordis.patch.yml`
- Windows：`%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml`

使用其他 profile 或自定义数据目录时，以实际路径为准。修改前先自行备份，保留原文件中的其他条目。如果已有该 ID 的覆盖项，直接修改原项；不要重复插入同 ID 插件。

## 检查效果

从中转站收到的 HTTP 请求检查指定请求头：同一会话发送两次消息应看到相同 ID；另一会话应看到不同 ID。

## 停用与移除

在 Harness 插件页面停用或移除此组合包，按界面提示重启。自行添加过配置覆盖项时，可在不再使用后手动移除该项。

使用过早期“绝对文件路径 + insert”方式手动加载时，先自行移除那条旧插入项，再使用组合包安装，避免重复插件 ID。

## 包结构

- `package.json`：声明包名、版本、模块入口和 `dsh.bundle.patch`。
- `cordis.patch.yml`：组合包的实际配置层，通过包名加载插件。
- `session-id-header.mjs`：请求头扩展实现。
- `cordis.patch.example.yml`：安装后的可选配置覆盖示例。

## 验证范围

针对桌面版 `0.2.2-rc.3` 验证了组合包识别、补丁解析、通过包名的模块加载，以及实际 Cordis / PiAiAdapter 请求头透传。`0.2.0` 使用多个 provider 和模型连接本地 OpenAI 兼容 SSE 模拟接口，验证跨 provider 默认匹配、同会话 ID 稳定、不同会话 ID 不同，以及无 ID 的调用不添加头。另有 `npm test` 覆盖通配符、显式服务商列表和自定义请求头。没有对所有上游协议或服务逐一执行网络测试。

组合包加载测试仅在工作目录的隔离配置中进行，没有向使用者的 desktop profile 安装或启用。其他 Harness 版本需要保留同名事件和 `request.sessionId` 参数；未验证所有操作系统及所有中转服务。

可以分享本仓库链接或源码压缩包。仓库不含个人路径、API 密钥、聊天记录或真实会话 ID。
