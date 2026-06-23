# Runlongyuan Community Hub

面向润珑苑小区的社区信息共享平台。

产品 slogan：

```text
让润珑苑生活，多一些方便和回应
```

## 项目定位

`runlongyuan-community-hub` 是一个轻量级邻里互助平台，用于承载小区里的拼车、跑腿、家政、保洁、失物招领和公告等信息。

当前版本使用 Supabase 保存共享数据，适合部署到 Netlify 后做小区内部试运行。

## 功能

- 用户注册、登录和退出
- 按频道浏览信息：拼车、跑腿、家政、保洁、失物招领、公告
- 按状态筛选：进行中、已完成、已关闭
- 关键词搜索标题、内容、地点和分类
- 发布“我有需求”或“我能提供”的社区信息
- 按分类展示发布样例，一键填充示例内容
- 发布时可上传图片补充说明
- 查看详情和联系方式
- 邻里评论回应
- 发帖人可标记完成、关闭或删除自己的信息
- 管理员可删除违规信息
- 发布页展示社区安全提示和免责声明

## 技术栈

- 前端：React + Vite
- 后端与数据库：Supabase
- 认证：Supabase Auth
- 部署：Netlify

## Supabase 设置

1. 在 Supabase 项目中打开 `SQL Editor`。
2. 复制并执行 `supabase/schema.sql` 中的全部 SQL。
3. 打开 `Authentication` -> `Providers` -> `Email`。
4. 关闭 `Confirm email`，否则手机号注册后不会自动登录。

SQL 会创建 `community_posts`、`comments` 等数据表，也会创建公开读取的 `community-images` Storage bucket，用于保存帖子图片。

本项目用手机号生成内部邮箱来接入 Supabase Auth，例如 `13800000000@runlongyuan-users.com`。用户界面仍然只展示手机号登录。

### 设置管理员

执行 `supabase/schema.sql` 后，`profiles` 表会有 `is_admin` 字段。需要把某个用户设为管理员时，在 Supabase SQL Editor 中执行：

```sql
update public.profiles
set is_admin = true
where phone = '管理员手机号';
```

管理员登录后可以删除违规信息。

## 本地运行

安装依赖：

```bash
npm install
```

复制环境变量示例：

```bash
cp .env.example .env.local
```

然后在 `.env.local` 中填写：

```text
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon public key
```

启动开发服务：

```bash
npm run dev
```

构建生产版本：

```bash
npm run build
```

## 部署

这是一个静态前端应用，可以直接部署到 Netlify。

推荐配置：

```text
Build command: npm run build
Publish directory: dist
```

在 Netlify 的 `Project configuration` -> `Environment variables` 中添加：

```text
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon public key
```

## 后续可扩展方向

- 信息置顶和公告轮播
- 举报与审核队列
- 小区住户认证
- 微信登录或手机号验证码登录
