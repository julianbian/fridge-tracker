# 冰箱台账

记录冰箱食材、追踪新鲜度、避免浪费。基于 Vite + React 构建，可安装为 PWA，数据存储在 Supabase。

## 本地开发

```bash
npm install
cp .env.example .env   # 已存在 .env 则跳过，并填入你的 Supabase 项目信息
npm run dev
```

## 部署到 Vercel

1. 把本仓库推送到 GitHub/GitLab，并在 [vercel.com](https://vercel.com) 中 Import Project。
2. Vercel 会自动识别为 Vite 项目（Build Command: `npm run build`，Output Directory: `dist`）。
3. 在 Vercel 项目的 Settings → Environment Variables 中添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Settings → General → Node.js Version 选择 `22.x`（Supabase SDK 依赖需要）。
5. 点击 Deploy 即可。之后每次 push 都会自动重新部署。

也可以用 Vercel CLI 部署：

```bash
npm i -g vercel
vercel        # 预览部署
vercel --prod # 生产部署
```

## PWA 安装

部署后用手机浏览器打开站点：
- iOS Safari：分享 → 添加到主屏幕
- Android Chrome：菜单 → 安装应用 / 会自动弹出安装提示

应用支持离线打开界面（静态资源由 Service Worker 缓存），但食材数据读写仍需联网访问 Supabase。

## 目录说明

`legacy/fridge_tracker.html` 是改造前的单文件版本（依赖浏览器内 Babel 运行时编译，仅适合作为画布/预览片段嵌入使用），仅作存档保留，已不再使用，可以随时删除。

## 图标

`public/favicon.svg` 是图标源文件，修改后运行 `npm run gen-icons` 重新生成 `public/icons/*.png` 与 `apple-touch-icon.png`。
