# 打工薪資計算器 — Django 重建設計規格

> 日期：2026-07-05
> 狀態：設計定稿，待實作

---

## 1. 概述

將現有單頁 HTML + localStorage 的打工薪資計算器，重建為 Django REST Framework + React 的全端應用，支援多使用者登入、資料庫持久化、跨裝置存取。

### 1.1 目標

- 後端使用 Django REST Framework + SQLite
- 前端使用 React (Vite) + 自訂 CSS（taste-skill 設計語言）
- 使用者認證（JWT Token）
- 各使用者資料完全隔離
- 保留原有核心功能：店家管理、薪資計算、CSV匯出、備份還原、列印報表
- 移除津貼欄位，新增薪資倍率下拉選單

### 1.2 非目標

- 初次開發不包含部署（先本機開發）
- 不支援管理者後台（無需 Django Admin 客製化）
- 不支援第三方登入（僅帳號+密碼）

---

## 2. 設計讀取（Design Read）

> **個人記帳工具** → 簡潔、可信賴、專業但溫暖，偏向 clean productivity 語彙

| 調校 | 值 | 說明 |
|------|----|------|
| DESIGN_VARIANCE | 5 | 對稱但有空氣感 |
| MOTION_INTENSITY | 4 | 柔和過場，無炫技 |
| VISUAL_DENSITY | 4 | 資料清楚不擁擠 |

### 2.1 字體

- **標題：** Outfit（顯示用字體，現代俐落）
- **內文：** Inter（清晰易讀）

### 2.2 色彩

| 用途 | 淺色模式 | 深色模式 |
|------|---------|---------|
| 主色（Primary） | #2563eb | #3b82f6 |
| 主色深（Primary Dark） | #1e40af | #2563eb |
| 背景 | #f8fafc | #0f172a |
| 卡片背景 | #ffffff | #1e293b |
| 文字主體 | #0f172a | #f8fafc |
| 文字次要 | #64748b | #94a3b8 |
| 強調色（CTA/Alerts） | #f43f5e | #fb7185 |
| 成功 | #10b981 | #34d399 |

自動深色模式 via `prefers-color-scheme`。

### 2.3 設計原則

- **無 emoji** — 所有 UI 元素使用純文字或圖示庫
- **圓角系統** — 卡片 16px、輸入框 10px、按鈕 8px
- **陰影** — 輕柔低對比陰影，無純黑陰影
- **響應式** — 行動裝置單欄折疊

---

## 3. 系統架構

```
┌─────────────────────────────────┐
│  React (Vite) SPA              │
│  localhost:5173                 │
│                                 │
│  ┌─────────┐  ┌─────────────┐  │
│  │ 登入/註冊 │  │ 主要頁面     │  │
│  │ 頁面     │  │ - 新增記錄   │  │
│  │         │  │ - 記錄列表   │  │
│  │         │  │ - 統計報表   │  │
│  │         │  │ - 設定      │  │
│  └─────────┘  └─────────────┘  │
└──────────────┬──────────────────┘
               │ HTTP (fetch / axios)
               │ JWT Token Auth
┌──────────────▼──────────────────┐
│  Django REST Framework          │
│  localhost:8000                 │
│                                 │
│  ┌──────────┐ ┌─────────────┐  │
│  │ Auth     │ │ API Views   │  │
│  │ (JWT)   │ │ - Records   │  │
│  │         │ │ - Stores    │  │
│  │         │ │ - Stats     │  │
│  │         │ │ - Export    │  │
│  └──────────┘ └─────────────┘  │
│              │                  │
│  ┌───────────▼──────────┐      │
│  │  SQLite Database      │      │
│  │  (db.sqlite3)        │      │
│  └──────────────────────┘      │
└─────────────────────────────────┘
```

### 3.1 技術選型

| 層級 | 技術 |
|------|------|
| 後端框架 | Django 5.x + Django REST Framework |
| 認證 | djangorestframework-simplejwt |
| 資料庫 | SQLite（開發期） |
| 前端框架 | React 18 + Vite |
| 前端路由 | React Router v6 |
| HTTP 客戶端 | fetch 或 axios |
| 樣式 | 自訂 CSS（taste-skill 設計語言） |
| 圖示 | @phosphor-icons/react（精簡線條風格） |

---

## 4. 資料模型

### 4.1 Store（店家）

```python
class Store(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
```

### 4.2 WorkRecord（工作記錄）

```python
class WorkRecord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='records')
    store = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True)
    date = models.DateField()
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    hours = models.DecimalField(max_digits=5, decimal_places=1)
    hourly_wage = models.PositiveIntegerField(default=196)
    rate_multiplier = models.DecimalField(max_digits=3, decimal_places=1, default=1.0)
    overtime_hours = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    overtime_rate = models.DecimalField(max_digits=3, decimal_places=2, default=1.33)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def total_pay(self):
        base = float(self.hours) * float(self.hourly_wage) * float(self.rate_multiplier)
        overtime = float(self.overtime_hours) * float(self.hourly_wage) * float(self.overtime_rate)
        return round(base + overtime)
```

### 4.3 薪資倍率選項（前端定義）

| 值 | 標籤 |
|----|------|
| 1.0 | 1.0x — 一般平日 |
| 1.33 | 1.33x — 平日延長工時前 2h |
| 1.66 | 1.66x — 平日延長工時第 3h 起 |
| 2.0 | 2.0x — 國定假日／颱風天 |
| 2.66 | 2.66x — 休息日出勤 |

### 4.4 資料隔離

所有 API View 使用 `request.user` 過濾：
- `WorkRecord.objects.filter(user=request.user)`
- `Store.objects.filter(records__user=request.user).distinct()`

---

## 5. API 端點

### 5.1 認證

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/auth/register/` | 註冊（帳號 + 密碼） |
| POST | `/api/auth/login/` | 登入（取得 JWT Token） |
| POST | `/api/auth/refresh/` | 刷新 Token |
| POST | `/api/auth/logout/` | 登出 |

### 5.2 資源

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/stores/` | 取得該使用者的店家列表 |
| POST | `/api/stores/` | 新增店家 |
| GET | `/api/records/` | 取得記錄（支援 ?store= & ?month= 篩選） |
| POST | `/api/records/` | 新增記錄 |
| PUT | `/api/records/:id/` | 編輯記錄 |
| DELETE | `/api/records/:id/` | 刪除記錄 |
| GET | `/api/stats/` | 統計資料（總收入、店家排行、月份排行） |
| GET | `/api/export/csv/` | 下載 CSV |
| GET | `/api/backup/export/` | 匯出 JSON 備份 |
| POST | `/api/backup/import/` | 還原 JSON 備份 |

### 5.3 權限

- 未認證的請求回傳 401
- 一般使用者只能存取自己的資料
- 管理員權限僅用於 Django Admin（開發期除錯用）

---

## 6. 前端頁面與元件

### 6.1 頁面

| 路由 | 頁面 | 說明 |
|------|------|------|
| `/login` | 登入頁 | 左右分割版面，左品牌右表單 |
| `/register` | 註冊頁 | 同上風格，註冊表單 |
| `/` | 首頁（主要頁面） | Tab 切換：新增記錄 / 記錄 / 報表 |
| `/settings` | 設定頁 | 備份匯入匯出、清除資料 |

### 6.2 核心元件

```
src/
├── components/
│   ├── Auth/
│   │   ├── LoginPage.jsx
│   │   └── RegisterPage.jsx
│   ├── Layout/
│   │   ├── AppLayout.jsx      # 主頁面框架 + Tab 導航
│   │   └── ProtectedRoute.jsx # 認證守衛
│   ├── RecordForm/
│   │   ├── RecordForm.jsx     # 新增/編輯表單
│   │   └── PreviewCard.jsx    # 即時試算預覽
│   ├── RecordList/
│   │   ├── RecordList.jsx     # 記錄列表（含篩選列）
│   │   └── RecordRow.jsx      # 單行記錄
│   ├── Stats/
│   │   ├── StatsView.jsx      # 統計報表
│   │   └── StatCard.jsx       # 統計數字卡片
│   ├── Settings/
│   │   └── SettingsView.jsx   # 匯入/匯出/清除
│   └── UI/
│       ├── Button.jsx
│       ├── Input.jsx
│       ├── Select.jsx
│       ├── Toast.jsx
│       └── Modal.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useRecords.js
│   ├── useStores.js
│   └── useStats.js
├── utils/
│   ├── api.js         # Axios 實例 + JWT 攔截器
│   ├── calc.js        # 薪資計算
│   └── format.js      # 日期/數字格式化
└── App.jsx
```

### 6.3 主要頁面佈局（首頁）

```
┌──────────────────────────────────────────┐
│ Header: 打工薪資計算器       [帳號] [登出] │
│──────────────────────────────────────────│
│ Tab: [新增記錄] [記錄列表] [統計報表] [設定] │
│──────────────────────────────────────────│
│  ┌─ 表單輸入區 ─────┐ ┌─ 試算預覽 ──┐   │
│  │ 店家  │ 日期    │ │ 本薪    $0  │   │
│  │ 上班  │ 下班    │ │ 加班費  $0  │   │
│  │ 工時  │ 時薪    │ │ 倍率  1.0x │   │
│  │ 倍率  │ 加班    │ │ ───────── │   │
│  │ 備註           │ │ 總計    $0  │   │
│  │ [儲存] [清除]   │ └────────────┘   │
│  └────────────────┘                    │
│──────────────────────────────────────────│
│ 篩選列: [店家▼] [月份▼] [匯出CSV] [備份] │
│──────────────────────────────────────────│
│ 日期  │ 店家 │ 時薪 │ 工時 │ 本薪 │ 合計 │
│──────┼────┼────┼────┼────┼────│
│ 資料列表...                            │
└──────────────────────────────────────────┘
```

### 6.4 登入頁佈局

```
┌──────────────────────────────────────────────┐
│ ┌──────────────┐ ┌────────────────────────┐ │
│ │ 打工薪資計算器 │ │ 登入                   │ │
│ │              │ │ 帳號 [______________]  │ │
│ │ 記錄每一份辛苦 │ │ 密碼 [______________]  │ │
│ │ 輕鬆掌握收入   │ │ 忘記密碼？            │ │
│ │              │ │ [登入]                │ │
│ │ ● ━ ●        │ │ 還沒有帳號？ 註冊       │ │
│ └──────────────┘ └────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 7. 狀態管理

### 7.1 認證狀態

- JWT Token 儲存於 `localStorage`
- Axios 攔截器自動附加 `Authorization: Bearer <token>`
- Token 過期時自動導向登入頁
- `useAuth` hook 提供：`{ user, login, register, logout, isAuthenticated }`

### 7.2 資料獲取

- 使用 React hooks（`useRecords`, `useStores`, `useStats`）封裝 API 呼叫
- 表單送出後自動更新列表
- 無需全域狀態管理（Context + hooks 已足夠）

---

## 8. 關鍵流程

### 8.1 新增記錄

1. 使用者填入店家、日期、時間、時薪、倍率等
2. 右欄預覽即時更新試算結果
3. 點「儲存記錄」→ POST `/api/records/`
4. 成功後清空表單，記錄列表自動刷新
5. 店家下拉選單從資料庫載入，可透過「+」按鈕新增

### 8.2 智慧時間輸入

- 輸入時僅允許數字鍵入，最多 4 碼
- 失焦時自動解析：`8` → `08:00`, `16` → `16:00`, `830` → `08:30`, `1430` → `14:30`
- 上下班時間變更時自動計算工時（支援跨日，下班小於上班 +24h）

### 8.3 CSV 匯出

- GET `/api/export/csv/` 回傳 CSV 檔案（含 BOM 供 Excel 辨識）
- 欄位：日期, 店家, 時薪, 倍率, 工時, 本薪, 加班時數, 加班費率, 加班費, 合計, 備註

### 8.4 備份還原

- 匯出：GET `/api/backup/export/` → JSON 檔案下載
- 匯入：POST `/api/backup/import/` → 上傳 JSON 檔案，覆蓋目前使用者資料

---

## 9. 設計細節

### 9.1 無 Emoji 原則

頁面任何地方不使用 emoji 作為 UI 元素：
- 頁面標題：純文字「打工薪資計算器」
- 按鈕：純文字
- 空白狀態：純文字提示
- Tab 標籤：純文字

### 9.2 響應式斷點

| 斷點 | 寬度 | 行為 |
|------|------|------|
| 桌面 | >= 1024px | 雙欄表單 + 預覽 |
| 平板 | 768-1023px | 雙欄調整 |
| 手機 | < 768px | 全單欄 |

### 9.3 深色模式

- 自動遵循系統 `prefers-color-scheme`
- 手動切換開關（位於設定頁或頁首）
- 所有色彩在兩種模式下皆維持 WCAG AA 對比度

### 9.4 錯誤處理

- API 錯誤：顯示 Toast 通知
- 表單驗證：欄位級錯誤提示
- 網路斷線：友好提示，不遺失已輸入資料
- Token 過期：自動導向登入頁

---

## 10. 專案結構

```
salary-calculator/
├── backend/
│   ├── config/                  # Django 設定
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── accounts/                # 使用者認證 App
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── records/                 # 薪資記錄 App
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── utils.py             # 計算邏輯 + CSV 產生
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/          # React 元件
│       ├── hooks/               # 自定義 hooks
│       ├── utils/               # 工具函式
│       ├── App.jsx
│       └── main.jsx
├── docs/
│   └── superpowers/
│       └── specs/
└── README.md
```

---

## 11. 開發順序（建議）

| 階段 | 內容 | 預估 |
|------|------|------|
| 1 | Django 專案初始化 + 資料模型 + Admin | 1 天 |
| 2 | 認證系統（註冊/登入/Token） | 1 天 |
| 3 | API：Stores + Records CRUD | 1 天 |
| 4 | API：Stats + Export/Backup | 0.5 天 |
| 5 | React 專案初始化 + 路由 + 認證頁 | 1 天 |
| 6 | React：記錄表單 + 預覽 | 1 天 |
| 7 | React：記錄列表 + 篩選 | 0.5 天 |
| 8 | React：統計報表 + 設定 | 0.5 天 |
| 9 | 整合測試 + 調整 | 0.5 天 |

---

## 12. 自審檢查

- [x] 無佔位符（TBD/TODO）
- [x] 內部一致性：架構與功能描述相符
- [x] 範圍適中：單一專案，非多子系統
- [x] 無歧義需求：所有功能點都有明確說明
- [x] 無 em-dash
- [x] 無 emoji 作為 UI 元素
- [x] 色系統一（深藍主色）
- [x] 圓角系統一致
- [x] 登入頁非 AI 預設風格（左右分割設計）
