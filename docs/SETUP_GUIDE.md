# Setup Guide

This guide takes you from nothing to a working test shop. You do **not** need to know how to code. You only need to copy, paste and click.

**How to read this guide**

- Do the steps **in order**. Don't skip ahead.
- Words in **bold** are the exact buttons or menu names you will see.
- After each step there is a **✅ You should now see…** line. If you see that, carry on.
- If you see something else, look for the **⚠️ If you see… instead** line under that step.
- Still stuck? Copy the exact message you see and send it to the person who is helping you build the shop.

> **Which steps are ready?** Steps 1–4 and 6–8 are below. Step 5 (publishing the shop manager as a web app) and steps 9–16 are added as each part of the shop is delivered. Doing 6–8 before 5 is fine — the website works in "practice mode" without the manager.

---

## Step 1 — Understand the parts (5 minutes of reading)

Your shop is made of five free tools working together. Think of a real shop:

| Tool | In a real shop it's… | What it does for you |
|---|---|---|
| **Google Sheet** | The account book | Keeps your products, orders, stock and settings |
| **Google Apps Script** (lives inside the Sheet) | The shop manager | Checks stock, takes orders, checks payments, makes bills, updates the website |
| **GitHub** | The storeroom | Stores the website files and product photos |
| **Cloudflare Pages** | The shop window | Shows your website to customers, quickly and securely |
| **Razorpay** *(optional)* | The card machine | Takes online payments (UPI, cards, net banking) and sends the money to your bank |

Plus a **domain** (your shop's address, like `www.priyasweets.in`) which you can add later.

**What it costs**

| Item | Cost |
|---|---|
| Google, GitHub, Cloudflare | **₹0 per month** |
| Domain | A yearly fee (usually a few hundred rupees) — optional at first; you get a free `.pages.dev` address |
| Razorpay | A small commission on each online payment, **only if you switch Razorpay on**. A shop that uses only direct UPI, bank transfer, Cash on Delivery or order requests pays no commission at all. |

**There is no email service to set up.** Customers download their bill on screen the moment their order is confirmed. Your own Gmail is only used to send *you* a few rare warnings (for example, "daily order limit reached").

**One rule to remember:** GitHub has a feature called "GitHub Pages". **Never turn it on.** GitHub's rules don't allow running a shop on it. In this setup GitHub only *stores* the files; Cloudflare *shows* them.

✅ **You should now** understand which tool does which job. Nothing to click yet.

---

## Step 2 — Create the accounts (about 30 minutes)

You need four accounts. **For your first practice shop, use your own test accounts.** When you build a shop for a real client, the accounts must be created **in the client's name** (they must own everything).

**Before you start:** open a password manager (Google Password Manager or Bitwarden are free), or take one sheet of paper titled "Shop accounts". For each account, write down the email, the password, and where the 2-step verification codes go (which phone). Keep the paper somewhere safe — never in a photo on your phone.

### 2a. Google account

1. Go to **accounts.google.com/signup**.
2. Create an account (a new Gmail address just for the shop is best, e.g. `priyasweets.shop@gmail.com`).
3. Turn on **2-Step Verification**: open **myaccount.google.com** → **Security** → **2-Step Verification** → follow the steps.

✅ **You should now see** your new Gmail inbox.

### 2b. GitHub account

1. Go to **github.com/signup**.
2. Sign up with the **same shop email**. Choose a short username (e.g. `priyasweets`) — it will appear in the storeroom address.
3. Choose the **Free** plan when asked.
4. Turn on two-factor authentication: click your round picture (top right) → **Settings** → **Password and authentication** → **Enable two-factor authentication**. Save the recovery codes it shows you on your paper.

✅ **You should now see** your GitHub dashboard.

### 2c. Cloudflare account

1. Go to **dash.cloudflare.com/sign-up**.
2. Sign up with the **same shop email**. Confirm the email Cloudflare sends you.
3. Turn on two-factor: profile icon (top right) → **My Profile** → **Authentication** → **Two-Factor Authentication**.

✅ **You should now see** the Cloudflare dashboard.

⚠️ **Good to know:** brand-new Cloudflare accounts have a few temporary limits during their first 48 hours. If Cloudflare says you can't create a project yet in step 8, wait a day and try again — nothing is wrong.

### 2d. Razorpay account (optional — skip if the shop won't use Razorpay)

Skip this if the shop will only use direct UPI, bank transfer, Cash on Delivery and/or order requests. You can add Razorpay any time later.

1. Go to **razorpay.com** → **Sign Up**.
2. Sign up with the shop email and phone.
3. You do **not** need to finish the business verification (KYC) yet. For now we only use **Test Mode**, which uses pretend money.
4. Turn on two-factor login in your Razorpay account settings if offered (recommended).

✅ **You should now see** the Razorpay Dashboard, with a **Test Mode** switch near the top.

---

## Step 3 — Create the Google Sheet and paste the code (about 20 minutes)

### 3a. Create the Sheet

1. Sign in to the **shop Google account**.
2. Go to **sheets.new** (this opens a new, empty Google Sheet).
3. Click the title **Untitled spreadsheet** (top left) and rename it, e.g. `Priya Sweets — Shop Database`. Press **Enter**.

✅ **You should now see** an empty sheet with your new name at the top.

### 3b. Open Apps Script

1. In the Sheet's menu bar click **Extensions** → **Apps Script**.
2. A new tab opens called **Untitled project**. Click that name and rename it to `Shop Manager`. Click **Rename**.

✅ **You should now see** the Apps Script editor with one file on the left called **Code.gs** containing a few lines like `function myFunction() {`.

### 3c. Show the settings file

`appsscript.json` is **hidden by Google until you switch it on**, so at first you will only see **Code.gs**. That is normal.

1. On the narrow strip of icons at the far left, click the **⚙️ gear icon** — it is the **last icon at the bottom** of that strip. Its name, **Project Settings**, appears when you point at it.
2. On the settings page, under **General settings**, tick the box **Show "appsscript.json" manifest file in editor**. (It saves by itself — there is no Save button.)
3. On the same page, under **Time zone**, check it says **(GMT+05:30) India Standard Time** (Kolkata). If not, choose it from the list.
4. Click the **< >** icon (**Editor**) — the second icon from the top of the same strip — to go back.

✅ **You should now see** two files on the left: **appsscript.json** and **Code.gs**.

⚠️ **If you still see only Code.gs**: press **F5** to reload the Apps Script page, then look again. If it's still missing, open the ⚙️ page once more and make sure the tick is really there (click it again if the box is empty).

### 3d. Paste the files, in this exact order

You will paste **7 files** for now. For each one: open the file from the delivered `apps-script` folder in a plain text editor (Notepad on Windows, TextEdit on Mac, or GitHub's file view), select everything (**Ctrl + A**, or **Cmd + A** on a Mac), copy (**Ctrl + C**), and paste it into the editor.

**File 1 — `appsscript.json`**
1. Click **appsscript.json** on the left.
2. Click inside the editor, select everything (**Ctrl + A**) and delete it.
3. Paste the whole content of `apps-script/appsscript.json`.
4. Press **Ctrl + S** (or click the 💾 **Save project** icon).

**File 2 — `Schema`** (we reuse the existing Code.gs file for this one)
1. Next to **Code.gs** on the left, click the **⋮** (three dots) → **Rename** → type `Schema` → press **Enter**. (Don't type `.gs` — the editor adds it.)
2. Select everything inside it and delete it.
3. Paste the whole content of `apps-script/Schema.gs`. Press **Ctrl + S**.

**Files 3 to 7 — `Config`, `Util`, `Setup`, `Menu`, `Triggers`**
For each of these, in this order:
1. Click the **+** next to **Files** (top left) → **Script**.
2. Type the name exactly — `Config` (then `Util`, `Setup`, `Menu`, `Triggers`) — and press **Enter**.
3. The new file has a few starter lines. Select everything and delete it.
4. Paste the whole content of the matching file (`Config.gs`, `Util.gs`, …). Press **Ctrl + S**.

✅ **You should now see** these 7 files on the left, in this order: **appsscript.json, Schema.gs, Config.gs, Util.gs, Setup.gs, Menu.gs, Triggers.gs**. The editor shows no red error message at the top after saving.

⚠️ **If you see** a red message like `Syntax error … line 123` **instead**: the paste was incomplete. Open that file, select everything, delete it, and paste it again — make sure you copied from the very first line to the very last line.

⚠️ **If you see** `Error: … appsscript.json … invalid` **instead**: the settings file was pasted wrongly. Re-paste `appsscript.json` exactly, including the first `{` and the last `}`.

⚠️ **If** a file name on the left shows as **Schema.gs.gs**: rename it (⋮ → **Rename**) to just `Schema`.

---

## Step 4 — Run the shop setup from the Sheet menu (about 15 minutes)

### 4a. Make the menu appear

1. Go back to the **Google Sheet** tab in your browser.
2. **Reload the page** (press **F5**, or the ⟳ button).
3. Wait about 10 seconds.

✅ **You should now see** a new menu called **🛒 Shop Setup** at the end of the menu bar (after **Help**).

⚠️ **If you don't see it**: wait 30 seconds and reload again. Still missing? Go back to Apps Script and check that **Menu.gs** is there and saved.

### 4b. Run first-time setup (and give permission)

1. Click **🛒 Shop Setup** → **1. Run first-time setup**.
2. A box says **Authorization required**. Click **Continue** (or **Review permissions**).
3. Choose the **shop Google account**.
4. You will see **Google hasn't verified this app**. This is normal and expected — read why below. Click **Advanced** (small link, bottom left) → **Go to Shop Manager (unsafe)**.
5. Read the list of permissions and click **Allow**.

> **Why does Google say "unsafe"?** Google shows this warning for *any* script that it hasn't personally reviewed. This script is your own, it lives in your own account, and only you are running it. It asks for permission to: edit this spreadsheet, create files in your Drive (backups, bills, photos), connect to Razorpay and GitHub, send *you* warning emails, run its automatic jobs, and show pop-up boxes in the Sheet. It cannot see your other emails.

6. Sometimes the first click only gives permission. If nothing else happens, click **🛒 Shop Setup** → **1. Run first-time setup** again.
7. Wait. A small "Running script" bar appears at the top. Setup takes about **1–3 minutes**.

✅ **You should now see** a box titled **✅ Setup finished** listing what it did (tabs created, default settings filled in, Drive folders ready, automatic jobs installed). Click **OK**. Along the bottom of the Sheet you'll now see many tabs: **Config, Payment_Methods, Payee_Details, Products, …, Counters**. Some tabs have a red colour — those are the sensitive ones.

⚠️ **If you see** `Exceeded maximum execution time` **instead**: just run **1. Run first-time setup** again. It continues safely and never deletes anything.

⚠️ **If you see** `Authorization is required to perform that action` **instead**: repeat 4b from point 2.

> **Important:** don't type into the shop's tabs by hand. If you try, Google shows a warning — that's on purpose. Everything is changed through the admin website (coming in step 9).

### 4c. Razorpay test keys (skip if not using Razorpay)

1. In the **Razorpay Dashboard**, turn on the **Test Mode** switch (top of the page).
2. Open **Account & Settings** → **API Keys** (in some versions: **Settings** → **API Keys**) → **Generate Key** (or **Generate Test Key**).
3. Razorpay shows a **Key Id** (starts with `rzp_test_`) and a **Key Secret**. Keep this window open — the secret is shown only once. (You can download the keys file it offers and keep it safe.)
4. In the Google Sheet click **🛒 Shop Setup** → **2. Set Razorpay keys**.
5. Paste the **Key Id** → **OK**. Then paste the **Key Secret** → **OK**.

✅ **You should now see** **✅ Razorpay keys saved — Mode: TEST (no real money)**. Write the Key Id on your paper (you'll need it again in step 7). Never write the secret anywhere else — it now lives safely inside the script.

⚠️ **If you see** **That doesn't look right**: you may have copied a space or only part of the key. Try again.

### 4d. GitHub — not yet

Menu item **3. Set GitHub token and repository** is done **after step 6**, when the storeroom exists. Skip it for now.

### 4e. Your alert email and WhatsApp number

1. Click **🛒 Shop Setup** → **4. Set owner alert email and WhatsApp**.
2. Type the email that should receive rare warnings → **OK**.
3. Type the owner's 10-digit mobile number (e.g. `98765 43210`) → **OK**.
4. When asked **Send a test email now?** click **Yes**.

✅ **You should now see** **Test email sent**, and within a minute an email called **Test: your shop alerts work** arrives (check **Spam** the first time; if it's there, mark it **Not spam**).

### 4f. Super Admin code — wait until step 9

Menu item **5. Create or reset the Super Admin** makes a one-time code that is valid for **24 hours**. You'll use it on the admin website, which is ready in step 9 — so do this item **then**, not now.

(Later, this same item is also how the owner resets a forgotten password.)

### 4g. Check everything

1. Click **🛒 Shop Setup** → **Check setup status**.

✅ **You should now see** a list with ✅ for: setup run, all 32 tabs present, automatic jobs installed, (Razorpay keys set — TEST mode, if you did 4c), owner alert email and WhatsApp set. Items with ⏳ (GitHub, Super Admin, web app) are for later steps — that's expected.

2. Click **🛒 Shop Setup** → **Run self-tests**.

✅ **You should now see** **Quick checks: 19 passed, 0 failed**.

⚠️ **If any line says FAIL**: copy the whole box (take a screenshot) and send it to the person helping you. Most often it means one file was pasted incompletely — re-paste that file and run the checks again.

---

**Steps 1–4 are done.** 🎉 Your shop's "account book" and "shop manager" are ready.

---

## Step 5 — Publish the shop manager as a web app

> ⏳ This step arrives with the next part of the build (the admin website), because the code it publishes isn't delivered yet. Skip it for now and continue with step 6.

---

## Step 6 — Create the storeroom on GitHub (about 20 minutes)

### 6a. Create a PRIVATE repository

1. Sign in to **github.com** with the shop account.
2. Click the **+** at the top right → **New repository**.
3. **Repository name:** a short name with no spaces, e.g. `shop`.
4. Choose **Private**. (Very important — never Public.)
5. Leave **Add a README file** UNticked, and leave the other options as they are.
6. Click **Create repository**.

✅ **You should now see** a page titled **Quick setup** with a small link **uploading an existing file**.

### 6b. Upload the shop files

1. On your computer, unzip the delivered file (for example `shop-phase1.zip`). Open the `shop` folder inside it.
2. On the GitHub page, click **uploading an existing file**.
3. Select **everything inside** the `shop` folder (the folders `apps-script`, `client`, `data`, `docs`, `public`, `tools` and the files `README.md`, `VERSION`, `package.json`) — **Ctrl + A** in the folder window — and **drag them** onto the GitHub page. Use Chrome or Edge on a computer for this; they keep the folders intact.
4. Wait until every file shows in the list (about 85 files). At the bottom, in **Commit changes**, click **Commit changes**.

✅ **You should now see** your repository with the folders `apps-script`, `client`, `data`, `docs`, `public`, `tools` and the files `README.md`, `VERSION`, `package.json`.

⚠️ **If you see** the files but no folders (everything in one long list) **instead**: the folders were not kept. Delete the repository (**Settings** → scroll to the bottom → **Delete this repository**) and try again with Chrome or Edge, dragging the folders themselves.

⚠️ **Do NOT** turn on **GitHub Pages** (under Settings → Pages). GitHub's rules forbid running a shop on it. Cloudflare shows your site instead (step 8).

> **Later updates:** each new part of the build comes as a zip. Upload its files the same way (**Add file** → **Upload files** → drag the folders). Files with the same name are replaced automatically.

### 6c. Create the publishing key (a "fine-grained token")

This key lets the shop manager save product changes to the storeroom — and nothing else.

1. Click your round picture (top right) → **Settings**.
2. In the left menu, scroll to the very bottom → **Developer settings**.
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
4. **Token name:** `Shop publishing`.
5. **Expiration:** choose **Custom** and pick a date one year away. Write that date on your paper. (The shop will remind you 14 days before it expires.)
6. **Repository access:** choose **Only select repositories**, then pick your shop repository (e.g. `shop`).
7. **Permissions** → **Repository permissions** → find **Contents** → choose **Read and write**. (GitHub adds **Metadata: Read-only** by itself — that's expected.) Leave everything else as **No access**.
8. Click **Generate token**.
9. GitHub shows a long code starting with `github_pat_`. **Copy it now** — GitHub shows it only once.

✅ **You should now see** a green message and your new token, starting with `github_pat_`.

### 6d. Give the key to the shop manager

1. Go to your **Google Sheet** → **🛒 Shop Setup** → **3. Set GitHub token and repository**.
2. Type the repository as `your-github-username/shop` (for example `priyasweets/shop`) → **OK**.
3. Paste the token → **OK**.

✅ **You should now see** **✅ Connected to GitHub**, with your repository, branch `main` and the token's expiry date.

⚠️ **If you see** **GitHub can't find that repository with this token**: check the spelling of the repository name, and that in step 6c point 6 you picked this repository. ⚠️ **If you see** **This repository is PUBLIC**: follow the instructions in the box to make it Private.

---

## Step 7 — Fill in the shop's details (about 10 minutes)

The file `client/store.config.json` holds this shop's name and contact details. Every value that says `REPLACE_ME` must be changed before going live. You can edit it right on GitHub:

1. In your repository, open the folder **client** → click **store.config.json**.
2. Click the **✏️ pencil icon** (Edit this file) at the top right of the file.
3. Change each `REPLACE_ME`, keeping the quotation marks `" "` around the value:

| Line | What to type | Example |
|---|---|---|
| `"url"` | Your Cloudflare address — you get it in step 8. Leave `REPLACE_ME` for now. | `https://priya-sweets.pages.dev` |
| `"apps_script_url"` | The web app address from step 5. Leave `REPLACE_ME` for now. | `https://script.google.com/macros/s/AKfy…/exec` |
| `"razorpay_key_id"` | Only if using Razorpay: your Key Id from step 4c. Otherwise leave `""`. | `rzp_test_AbCdEf123456` |
| `"name"` | The shop's name as customers see it | `Priya Sweets` |
| `"legal_name"` | The registered business name (for bills and policies) | `Priya Sweets & Snacks` |
| `"phone"` / `"whatsapp"` | 10-digit mobile numbers, no +91, no spaces | `9876543210` |
| `"email"` | The shop's email | `priyasweets.shop@gmail.com` |
| `"address_line1"`, `"city"`, `"pincode"` | The shop's address | `12, Market Road`, `Coimbatore`, `641001` |
| `"state"` | Exactly as written in India's list of states | `Tamil Nadu` |
| `"gstin"` | Only if GST-registered; otherwise leave `""` | `33ABCDE1234F1Z5` |
| `"theme_preset"` | One of `ROYAL_INDIGO`, `FRESH_GREEN`, `SAFFRON`, `ROSE`, `OCEAN`, `CHARCOAL_GOLD` (also change the three colours to match — see the table in docs/ASSETS_NEEDED.md) | `SAFFRON` |
| `"default_title"` | The shop's title in Google results | `Priya Sweets — fresh sweets delivered` |
| `"default_description"` | One sentence about the shop | `Handmade sweets and snacks from Coimbatore, delivered across India.` |
| `"seller"` → `"name"`, `"upgrade_contact_text"` | Your own name and how the owner can reach you | `Ravi (website)`, `WhatsApp Ravi on 98xxxxxxxx` |

4. Scroll down → **Commit changes…** → **Commit changes**.

✅ **You should now see** the file with your values and a message like "Update store.config.json".

⚠️ **If** the shop later fails to build with "is not valid JSON": a quotation mark or comma was deleted by accident. Open the file, compare it with the original from the zip, and fix the line.

> **Practice mode:** until you go live, the shop builds even with some `REPLACE_ME` left (it shows sample details instead) and tells search engines not to list it. Before going live you will switch it to live mode (the Go-Live checklist), and then every `REPLACE_ME` must be filled in.

---

## Step 8 — Open the shop window on Cloudflare (about 15 minutes)

1. Sign in to **dash.cloudflare.com**.
2. In the left menu click **Workers & Pages** (it may be under **Compute**).
3. Click **Create application** (or **Create**) → choose the **Pages** tab (not Workers) → **Connect to Git**.
4. Click **GitHub** → **Connect GitHub**. GitHub opens and asks where to install Cloudflare: choose **Only select repositories** → pick your shop repository → **Install & Authorize**.
5. Back in Cloudflare, select your shop repository → **Begin setup**.
6. **Project name:** this becomes your free address, e.g. `priya-sweets` → `priya-sweets.pages.dev`. Use lowercase letters and dashes.
7. **Production branch:** `main`.
8. **Build settings** — type exactly:

| Field | Value |
|---|---|
| **Framework preset** | **None** |
| **Build command** | `node tools/build.mjs` |
| **Build output directory** | `dist` |

9. Open **Environment variables (advanced)** and add two variables (click **Add variable** for each):

| Variable name | Value |
|---|---|
| `NODE_VERSION` | `22` |
| `PRODUCTION` | `0` |

   (`0` = practice mode. You change it to `1` on go-live day.)

10. Click **Save and Deploy**. Wait 1–2 minutes while it builds.

✅ **You should now see** **Success! Your project is deployed** and a link like `https://priya-sweets.pages.dev`. In the build log near the end you'll see lines like `✓ 24 products, 4 categories (SAMPLE catalogue…)`.

11. Click the link. ✅ **You should now see** your shop with 24 sample products (sweets, spices, kitchen items and clothing), in your theme colours, with your shop name.

12. Copy that address. Go back to step 7 and put it in `"url"` (e.g. `https://priya-sweets.pages.dev`, no `/` at the end) → **Commit changes**. Cloudflare rebuilds automatically within a minute or two.

⚠️ **If the build fails:** in Cloudflare open the failed deployment → **View details** / build log. The last lines say in plain words what's wrong (for example a mistake in `store.config.json`). Fix it on GitHub; Cloudflare rebuilds automatically.

⚠️ **If you see** "You can't create a project yet": new Cloudflare accounts have limits for the first 48 hours. Wait and try again.

### 8a. Try the shop on your phone

On your phone, open the address and check:

- The home page shows the welcome banner, categories, Bestsellers, New arrivals and Deals.
- Tap a product → choose a size or colour → the price and photo change → **Add to cart** → the cart icon shows **1**.
- Tap 🔍 and type `sambr` (spelled wrong on purpose) → **Sambar Powder** still appears.
- On a product page, type a pincode like `641001` → "Delivery by …" appears.
- Open the cart → **Go to checkout**. Until online payments are installed (a later part of the build), checkout sends the order to the shop on WhatsApp.
- On a computer, open `https://your-address.pages.dev/styleguide.html` — the **style guide** showing every button, card and colour in light and dark mode and all six themes. Use it to approve the look.

✅ **You should now see** everything above working. The sample products disappear automatically the first time you publish your own products from the admin website (step 9).
