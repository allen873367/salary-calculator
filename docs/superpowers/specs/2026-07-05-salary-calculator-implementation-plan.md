# 打工薪資計算器 — 實作計畫

> 基於設計規格：`2026-07-05-salary-calculator-django-design.md`

---

## 第一階段：專案初始化

### Step 1：建立 Django 後端專案

**檔案：`backend/`**

1. 建立虛擬環境並安裝依賴：
   ```
   Django, djangorestframework, djangorestframework-simplejwt, django-cors-headers
   ```
2. 建立 Django 專案 `config/` 與兩個 App：
   - `accounts/` — 使用者認證
   - `records/` — 薪資記錄
3. 設定 `settings.py`：
   - DRF + JWT 認證
   - CORS（允許前端 localhost:5173）
   - SQLite 資料庫
   - 中文時區 (`Asia/Taipei`)

### Step 2：建立 React 前端專案

**檔案：`frontend/`**

1. `npm create vite@latest frontend -- --template react`
2. 安裝依賴：`react-router-dom`, `axios`
3. 建立目錄結構：`components/`, `hooks/`, `utils/`

---

## 第二階段：後端 API

### Step 3：資料模型

**檔案：`records/models.py`**
- 實作 `Store` model（name, created_at）
- 實作 `WorkRecord` model（user, store, date, start_time, end_time, hours, hourly_wage, rate_multiplier, overtime_hours, overtime_rate, notes, created_at, updated_at）
- 實作 `total_pay()` 方法
- 註冊 Admin

### Step 4：認證系統

**檔案：`accounts/`**
- `serializers.py`：RegisterSerializer（帳號、密碼）
- `views.py`：RegisterView
- `urls.py`：註冊端點
- `config/urls.py`：加入 JWT Token 路徑（login, refresh）

### Step 5：Stores API

**檔案：`records/views.py`, `records/serializers.py`, `records/urls.py`**
- StoreSerializer
- StoreViewSet（list, create），依使用者過濾
- URL 註冊

### Step 6：Records API

- RecordSerializer（含 total_pay 唯讀欄位）
- RecordViewSet（list, create, update, destroy）
  - list 支援 `?store=` 和 `?month=` 篩選
  - 自動帶入 `user=request.user`
- URL 註冊

### Step 7：統計與匯出 API

- `StatsView`：回傳總收入、總筆數、店家排行、月份排行
- `ExportCSVView`：回傳 CSV 檔案（含 BOM）
- `BackupExportView`：回傳 JSON
- `BackupImportView`：接受 JSON 上傳並覆蓋使用者資料

---

## 第三階段：前端開發

### Step 8：專案骨架 + 認證頁

**檔案：`frontend/src/`**
- `utils/api.js`：Axios 實例 + JWT Token 攔截器
- `hooks/useAuth.js`：login, register, logout, isAuthenticated
- **登入頁**：左右分割版面，左欄品牌區(深藍漸層) + 右欄登入表單
- **註冊頁**：同風格，帳號+密碼+確認密碼
- `ProtectedRoute.js`：未登入導向 /login

### Step 9：主要頁面框架

- `AppLayout.jsx`：Header（品牌名 + 登出按鈕）+ Tab 導航（新增記錄/記錄列表/統計報表/設定）
- Tab 切換顯示對應內容區塊

### Step 10：記錄表單 + 預覽

- `RecordForm.jsx`：
  - 店家下拉選單（從 API 載入）+ 新增按鈕
  - 日期 input
  - 智慧時間輸入（input 失焦時解析 HH:MM）
  - 工時（自動從上下班時間計算）
  - 時薪（預設 196）
  - 薪資倍率下拉（1.0x ~ 2.66x）
  - 加班時數 + 加班費率
  - 備註 textarea
  - 儲存 / 清除按鈕
- `PreviewCard.jsx`：即時試算（本薪、加班費、總計）

### Step 11：記錄列表

- `RecordList.jsx`：
  - 篩選列（店家下拉 + 月份下拉 + 匯出CSV + 備份按鈕）
  - 表格顯示（日期、店家、時薪、工時、本薪、合計、操作按鈕）
  - 編輯按鈕：載入表單 + 刪除舊記錄
  - 刪除按鈕：確認後刪除
- 空白狀態顯示「還沒有打工記錄」

### Step 12：統計報表

- `StatsView.jsx`：
  - 四張統計卡片（總收入、總筆數、店家數、總工時）
  - 各店家收入排行
  - 每月收入排行
- 列印按鈕

### Step 13：設定頁

- `SettingsView.jsx`：
  - 備份匯出按鈕（下載 JSON）
  - 備份還原（上傳 JSON）
  - 清除資料（雙重確認）
  - 深色模式切換（future）

---

## 第四階段：整合測試

### Step 14：整合 + 最終調整

- 確認前後端連線正常
- 測試完整流程（註冊 → 登入 → 新增 → 編輯 → 刪除 → 統計 → 匯出）
- 測試深色模式
- 測試響應式佈局
- 調整 CSS 細節

---

## 執行順序

```
Step 1  (Django 初始化) ──┐
                          ├──> Step 3 (Models) ──> Step 4 (Auth)
Step 2  (React 初始化) ──┘                         │
                                                  ▼
                                        Step 5 (Stores API)
                                        Step 6 (Records API)
                                        Step 7 (Stats/Export)
                                                  │
                                                  ▼
                                        Step 8 (Auth Pages)
                                        Step 9 (App Layout)
                                        Step 10 (RecordForm)
                                        Step 11 (RecordList)
                                        Step 12 (Stats)
                                        Step 13 (Settings)
                                                  │
                                                  ▼
                                        Step 14 (Integration)
```
