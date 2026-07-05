# 打工薪資計算機

一個全端打工薪資管理系統，幫你記錄每日工時、計算薪資、產出報表。

## 系統架構

```
打工計算/
├── backend/          # Django REST API 後端
│   ├── config/       # Django 設定（settings.py, urls.py）
│   ├── accounts/     # 使用者註冊／登入
│   ├── records/      # 店家、打工記錄、統計、匯出
│   └── manage.py     # Django 管理指令
├── frontend/         # React + Vite 前端
│   └── src/
│       ├── components/  # 頁面元件
│       │   ├── Auth/        # 登入／註冊
│       │   ├── Layout/      # 主版型（分頁導航）
│       │   ├── RecordForm/  # 新增記錄表單
│       │   ├── RecordList/  # 記錄列表＋編輯
│       │   ├── Stats/       # 統計報表
│       │   └── Settings/    # 店家管理、備份還原
│       ├── hooks/       # useAuth 認證
│       └── utils/       # Axios API 實例
└── docs/             # 設計文件
```

## 功能一覽

| 功能 | 說明 |
|------|------|
| 新增記錄 | 選店家、輸入時間、自動計算工時、自訂倍率 |
| 記錄列表 | 篩選店家／月份、編輯、刪除、匯出 CSV、列印 |
| 統計報表 | 總收入、上班天數、最高連續上班、總工時、店家排名、月份排名 |
| 店家管理 | 新增／刪除店家 |
| 備份還原 | 匯出 JSON 備份、還原資料 |
| 使用者認證 | 註冊／登入，跨裝置同步 |

## 快速開始

### 前置需求

- Python 3.10+（建議 3.11 以上）
- Node.js 20+

### 1. 後端設定

```bash
# 進到後端目錄
cd backend

# 建立虛擬環境
python -m venv venv

# Windows PowerShell 啟動
venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate

# 安裝相依套件
pip install -r requirements.txt

# 執行資料庫遷移
python manage.py migrate

# 啟動開發伺服器（http://localhost:8000）
python manage.py runserver
```

### 2. 前端設定

```bash
# 進到前端目錄
cd frontend

# 安裝相依套件
npm install

# 啟動開發伺服器（http://localhost:5173）
npm run dev
```

### 3. 開啟瀏覽器

打開 **http://localhost:5173**，註冊帳號後即可開始使用。

## 操作說明

### 新增打工記錄

1. 點選「**新增記錄**」分頁
2. 選擇店家（或輸入新店家名稱按 `＋`）
3. 選日期、輸入上下班時間（工時會自動計算）
4. 確認時薪（預設 196 元）、選擇薪資倍率
5. 如有加班，填加班時數與費率
6. 按「**儲存記錄**」

### 薪資計算公式

```
本薪     = 工時 × 時薪 × 倍率
加班費   = 加班時數 × 時薪 × 加班費率
總薪資   = 本薪 + 加班費
```

### 倍率說明

| 倍率 | 適用情況 |
|------|----------|
| 1.0x | 一般平日 |
| 1.33x | 平日延長工時前 2 小時 |
| 1.66x | 平日延長工時第 3 小時起 |
| 2.0x | 國定假日／颱風天 |
| 2.66x | 休息日出勤 |

### 編輯／刪除記錄

1. 到「**記錄列表**」分頁
2. 點擊該筆的「編輯」按鈕 → 彈窗修改 → 按「更新記錄」
3. 點擊「刪除」按鈕 → 確認刪除

### 統計報表

- 到「**統計報表**」分頁查看總收入、上班天數、最高連續上班天數、總工時
- 可用月份下拉篩選特定月份的統計
- 按「列印報表」可列印或存成 PDF
- 店家收入與每月收入各有佔比百分比

### 匯出 CSV

1. 到「記錄列表」點「**匯出 CSV**」
2. 下載的 CSV 可用 Excel 開啟（含 BOM，中文正常顯示）

### 備份還原

1. 到「**設定**」→ 資料管理
2. 按「匯出」下載 JSON 備份檔
3. 還原時選擇備份檔上傳，會**取代**現有資料

### 店家管理

- 在「**設定**」頁可看到所有店家列表
- 點店家旁的「刪除」可移除（相關記錄的店家會變成「未指定」）
- 在新增記錄表單旁也可快速新增店家

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/register/` | 註冊 |
| POST | `/api/auth/token/` | 登入取得 JWT |
| POST | `/api/auth/token/refresh/` | 刷新 JWT |
| GET/POST | `/api/stores/` | 店家列表／新增 |
| DELETE | `/api/stores/{id}/` | 刪除店家 |
| GET/POST | `/api/records/` | 記錄列表／新增（支援 `?store=&month=`） |
| PUT/DELETE | `/api/records/{id}/` | 更新／刪除記錄 |
| GET | `/api/stats/?month=` | 統計報表（可選月份） |
| GET | `/api/export/csv/` | 匯出 CSV |
| GET | `/api/backup/export/` | 匯出 JSON 備份 |
| POST | `/api/backup/import/` | 匯入 JSON 備份 |

## 生產環境建置

```bash
cd frontend
npm run build      # 輸出到 frontend/dist/
```

可將 `dist/` 交由 Nginx 或其他伺服器提供靜態檔案，後端 Django 需設定 `DEBUG=False` 與 `ALLOWED_HOSTS`。

## 技術棧

- **後端**: Django 6.0、Django REST Framework、SimpleJWT、SQLite
- **前端**: React 19、Vite 8、React Router 7、Axios
- **認證**: JWT（Access Token 7 天、Refresh Token 30 天）
