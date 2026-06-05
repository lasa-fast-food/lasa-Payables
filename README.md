# LASA — Accounts Payable Control

A private, offline-first stock expenditure tracking app. All data is stored in your browser's localStorage — no server, no login, no data leaves your device.

---

## Features

- **New Purchase** — Record stock buys with supplier, item, quantity, unit price, payment method, status (Paid / Unpaid / Partial), invoice number, due date, and notes
- **Purchase History** — Search, filter by status or category, edit or delete any transaction
- **Suppliers** — Auto-built supplier ledger showing total spend, transaction count, and outstanding balance per supplier
- **Reports** — Period-based spending summaries with charts (by category and by supplier), plus an outstanding payments table
- **Dashboard** — At-a-glance stats, recent purchases, category doughnut chart, monthly bar chart
- **Export CSV** — Download all your data as a spreadsheet at any time

---

## How to Deploy to GitHub Pages

### Step 1 — Create a GitHub repository

1. Go to [github.com](https://github.com) and sign in (or create a free account)
2. Click the **+** icon → **New repository**
3. Name it `lasa-ap` (or anything you like)
4. Set it to **Private** (recommended — your data only)
5. Click **Create repository**

### Step 2 — Upload the files

You have three files:
```
index.html
style.css
app.js
```

**Option A — GitHub web interface (easiest)**
1. Open your new repo
2. Click **Add file** → **Upload files**
3. Drag and drop all three files
4. Click **Commit changes**

**Option B — Git command line**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lasa-ap.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. In your repo, go to **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**
5. Wait ~1 minute, then your app is live at:
   `https://YOUR_USERNAME.github.io/lasa-ap/`

---

## Important Notes

- **Data is local** — stored in your browser only. If you clear browser data, transactions are lost. Use the **Export CSV** button regularly to keep backups.
- **Private repo** — GitHub Pages on a private repo requires GitHub Pro/Team, OR you can keep the repo public (the app itself has no login, so the data is still only on your device).
- To back up your data: click **Export CSV** in the sidebar.

---

## Updating the App

To update the app after changes:
1. Replace the files in your repo
2. GitHub Pages will auto-redeploy within a minute

---

*Built for LASA — Private use only.*
