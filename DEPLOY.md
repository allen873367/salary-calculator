# 免費部署教學

把打工計算機放到網路上，不用開自己的電腦就能用。

## 方案：PythonAnywhere（後端）+ Vercel（前端）

兩者都有免費方案，且 SQLite 資料可以持久保存。

---

## 一、後端 — PythonAnywhere

### 1. 註冊帳號

到 [pythonanywhere.com](https://www.pythonanywhere.com) 註冊 **Free 方案**（免費、永久、不需信用卡）。

### 2. 上傳程式碼

進到 Dashboard → **Consoles** → 開一個 **Bash console**：

```bash
# Clone 你的專案（需先上傳到 GitHub）
# 或直接在 Web 介面手動上傳檔案（Dashboard → Files）

# 如果你有 GitHub 倉庫：
git clone https://github.com/你的帳號/打工計算.git
cd 打工計算/backend
```

### 3. 建立虛擬環境與安裝套件

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. 設定環境變數（重要）

PythonAnywhere 預設用 Python 3.10+。確認版本：

```bash
python --version
```

### 5. 資料庫遷移

```bash
cd ~/打工計算/backend
source venv/bin/activate
python manage.py migrate
python manage.py createsuperuser   # 建立管理員帳號（可略過）
```

### 6. 設定 Web App

Dashboard → **Web** → **Add a new web app**：

- **Manual configuration**（不要選 Django template）
- Python 版本選跟你虛擬環境一樣的（3.10 / 3.11）

#### WSGI 設定檔

在 Web 頁面點 **WSGI configuration file** 連結，把內容改成：

```python
import os
import sys

# 你的專案路徑
path = '/home/你的使用者名稱/打工計算/backend'
if path not in sys.path:
    sys.path.append(path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

#### 靜態檔案

在 Web 頁面往下找到 **Static files**：

| URL | Directory |
|-----|-----------|
| `/static/` | `/home/你的使用者名稱/打工計算/backend/static/` |

先跑一次 collect static：

```bash
cd ~/打工計算/backend
source venv/bin/activate
python manage.py collectstatic
```

### 7. 設定 settings.py

部署前需要修改一些設定，在 `backend/config/settings.py` 加入或調整：

```python
# 允許的網域（改成你的 PythonAnywhere 網址）
ALLOWED_HOSTS = ['你的使用者名稱.pythonanywhere.com', 'localhost']

# 如果有用 CORS，保持 True 或設成前端網址
CORS_ALLOW_ALL_ORIGINS = True  # 開發用，正式可限制

# 靜態檔案路徑
STATIC_ROOT = BASE_DIR / 'static'
```

### 8. 重新載入 Web App

回到 Web 頁面，按 **Reload**。成功後你的 API 網址就是：

```
https://你的使用者名稱.pythonanywhere.com/api/
```

---

## 二、前端 — Vercel

### 1. 修改 API 網址

編輯 `frontend/src/utils/api.js`，把 `API_BASE` 改成你的 PythonAnywhere 網址：

```js
const API_BASE = 'https://你的使用者名稱.pythonanywhere.com/api';
```

### 2. 上傳到 GitHub

```bash
# 在本地端執行
cd 打工計算
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的帳號/打工計算.git
git push -u origin main
```

### 3. 匯入到 Vercel

1. 到 [vercel.com](https://vercel.com) 用 GitHub 登入
2. **Add New → Project**
3. 選 `打工計算` 倉庫
4. **Root Directory** 選 `frontend`
5. **Framework Preset** 選 `Vite`
6. 按 **Deploy**

### 4. 設定 SPA 路由

部署後如果重整頁面會 404，需要加設定檔：

在 `frontend` 目錄建立 `vercel.json`：

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

然後重新部署：

```bash
git add vercel.json
git commit -m "add vercel rewrites for SPA routing"
git push
```

Vercel 會自動重新部署。

### 5. 完成

部署完 Vercel 會給你一個網址，像：

```
https://打工計算.vercel.app
```

打開它就能用了！

---

## 三、常見問題

### Q: PythonAnywhere 免費方案會休眠嗎？

會。如果一段時間沒人訪問，Web app 會進入休眠。下次有人打開時會喚醒，需要等幾秒鐘。這是免費方案的限制。

### Q: 資料會不見嗎？

不會。PythonAnywhere 的 SQLite 資料庫是持久儲存的，不會因為休眠或被重啟而消失。建議還是定期用「設定 → 匯出」備份 JSON。

### Q: 可以用自訂網域嗎？

免費方案不支援自訂網域，只能用 `你的使用者名稱.pythonanywhere.com`。如果你想要自訂網域，PythonAnywhere 付費方案（每月 $5 起）支援。

### Q: 免費方案儲存空間夠嗎？

PythonAnywhere 免費方案有 **512MB**。你的 SQLite + 程式碼只佔幾 MB，非常夠用。

### Q: Vercel 有流量限制嗎？

Vercel 免費方案每月 **100GB 頻寬**、**100 小時建置時間**，個人使用完全足夠。

---

## 四、替代方案

### 全部放 PythonAnywhere（適合只想部署一個地方）

可以讓 PythonAnywhere 同時服務 API 和前端靜態檔案：

1. `npm run build` 把 React 打包到 `frontend/dist/`
2. 把 `frontend/dist/` 上傳到 PythonAnywhere
3. 在 Web 頁面新增 Static File 指向該目錄
4. 前端 `/api/` 路徑設定 API proxy

步驟較多，但少了 Vercel 這層。

### Render + PostgreSQL（適合願意小額付費）

[Render](https://render.com) 免費方案搭配 PostgreSQL 可以跑 Django，但資料庫需要額外設定。如果未來願意花少少的錢（約 $5-7/月），這也是一個選擇。
