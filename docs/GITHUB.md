# راهنمای گذاشتن پروژه در گیت‌هاب

این مراحل برای اولین بارگذاری همین پوشه نوشته شده‌اند. دستورها را در PowerShell و به ترتیب اجرا کن. Git روی این سیستم نصب است.

## ۱. یک مخزن خالی بساز

وارد حساب گیت‌هاب شو و صفحه [ساخت مخزن](https://github.com/new) را باز کن.

- برای Repository name می‌توانی `modiriat-karha` را بنویسی.
- برای Description این متن مناسب است: «مدیریت کارهای روزانه با تقویم شمسی، یادآوری صوتی و گزارش PDF».
- اگر می‌خواهی کد برای همه قابل دیدن باشد، Public را انتخاب کن؛ برای دسترسی محدود، Private.
- گزینه ساخت README را خاموش نگه دار و برای gitignore و License چیزی انتخاب نکن؛ پروژه از قبل README و gitignore دارد. انتخاب مجوز استفاده از کد را می‌توانی جداگانه انجام بدهی.

روی Create repository بزن و آدرس HTTPS مخزن را کپی کن. شکل آن معمولاً این است:

```text
https://github.com/YOUR-USERNAME/modiriat-karha.git
```

`YOUR-USERNAME` فقط جای خالی برای نام حساب توست. در دستور اتصال، آدرس واقعی را از صفحه مخزن کپی کن.

## ۲. ترمینال را داخل پوشه پروژه باز کن

PowerShell را باز کن و بنویس:

```powershell
Set-Location -LiteralPath 'C:\Users\Avallpc\Desktop\4\مدریت'
git init -b main
git status
```

دستور `init` پیگیری نسخه‌های پروژه را شروع می‌کند. `status` وضعیت فایل‌ها را نشان می‌دهد. پوشه‌های `node_modules` و `dist` نباید در فهرست فایل‌های قابل ثبت باشند؛ `.gitignore` آن‌ها را کنار می‌گذارد.

## ۳. اولین نسخه را ثبت کن

```powershell
git add .
git diff --cached --stat
git status
```

`add` فایل‌ها را برای ثبت آماده می‌کند. دو دستور بعدی نشان می‌دهند چه چیزهایی قرار است ثبت شوند. بعد از بررسی فهرست:

```powershell
git commit -m "Initial project setup"
```

اگر Git گفت نام و ایمیل مشخص نیست، این دو دستور را با مشخصات خودت اجرا کن و دوباره دستور commit را بزن:

```powershell
git config user.name "YOUR NAME"
git config user.email "YOUR GITHUB EMAIL"
```

این تنظیمات فقط برای همین پروژه‌اند. اگر ایمیلت نباید عمومی باشد، ایمیل noreply حساب خودت را از GitHub → Settings → Emails بردار.

## ۴. پوشه را به مخزن وصل کن

در دستور زیر، آدرس نمونه را با آدرس واقعی مخزن جایگزین کن:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/modiriat-karha.git
git remote -v
```

`origin` نام اتصال به مخزن گیت‌هاب است. خروجی دستور دوم باید آدرس مخزن خودت را نشان بدهد. حالا اولین بارگذاری را انجام بده:

```powershell
git push -u origin main
```

اگر پنجره ورود باز شد، با حساب گیت‌هابت وارد شو. گیت‌هاب برای عملیات Git با HTTPS رمز معمول حساب را قبول نمی‌کند؛ اگر ورود مرورگری ارائه نشد، از روش ورود مستندشده در [راهنمای احراز هویت گیت‌هاب](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github) استفاده کن.

وقتی دستور تمام شد، صفحه مخزن را تازه‌سازی کن. باید پوشه `src`، فایل `package.json` و توضیحات README را ببینی. برای بررسی اتصال هم می‌توانی اجرا کنی:

```powershell
git status
git remote -v
```

## دفعات بعد

بعد از تغییر فایل‌ها، اول تغییرات را ببین و سپس ثبت و ارسال کن:

```powershell
git diff
git add .
git diff --cached --stat
git commit -m "Describe your changes"
git push
```

به جای پیام نمونه، کوتاه بنویس چه چیزی عوض شده؛ مثلاً `Improve task filters`.

## اگر خطا دیدی

- `remote origin already exists`: با `git remote -v` آدرس فعلی را ببین. فقط اگر اشتباه است، با `git remote set-url origin REAL-REPOSITORY-URL` اصلاحش کن؛ عبارت آخر باید آدرس واقعی مخزن باشد.
- `Repository not found`: آدرس، حسابی که با آن وارد شده‌ای و دسترسی به مخزن را بررسی کن.
- `rejected` یا `fetch first`: احتمالاً مخزن آنلاین از قبل فایل دارد. متن خطا و وضعیت مخزن را بررسی کن؛ دستور `push --force` اجرا نکن.
- `nothing to commit`: تغییر تازه‌ای برای ثبت وجود ندارد. با `git status` وضعیت را ببین؛ اگر commit قبلاً ساخته شده، مرحله بعد می‌تواند push باشد.

## فعال‌سازی دموی آنلاین

تنظیمات انتشار در `.github/workflows/deploy.yml` آماده است. برای اولین انتشار:

1. در مخزن به Settings → Pages برو.
2. در بخش Build and deployment، مقدار Source را روی GitHub Actions بگذار. لازم نیست workflow تازه‌ای بسازی.
3. تغییرات آماده‌شده را از پوشه پروژه ارسال کن:

```powershell
git status
git add README.md docs vite.config.ts .github/workflows/deploy.yml
git diff --cached --stat
git commit -m "Add project showcase and live demo deployment"
git push
```

4. تب Actions را باز کن و اجرای `Deploy demo to GitHub Pages` را ببین. وقتی همه مراحل سبز شدند، آدرس زیر را باز کن:

https://reza-akbarzadeh.github.io/modiriat-karha/

اگر قبلاً تغییرات را push کرده‌ای، بعد از انتخاب Source به تب Actions برو، workflow را انتخاب کن و از Run workflow برای اجرای دستی استفاده کن.

بعد از باز شدن دمو، جمله موقت زیر لینک دمو در README را حذف کن. در صفحه اصلی مخزن هم کنار About روی چرخ‌دنده بزن و همین آدرس را در Website بگذار. برای Topics می‌توانی `react`، `typescript`، `tailwindcss`، `task-manager`، `jalali-calendar` و `rtl` را وارد کنی.

توضیح کوتاه پیشنهادی برای About:

> برنامه مدیریت کارهای روزانه با React و TypeScript؛ تقویم شمسی، کارهای تکراری، یادآوری صوتی و گزارش PDF.

مبنای مراحل انتشار، [راهنمای رسمی Vite برای GitHub Pages](https://vite.dev/guide/static-deploy#github-pages) و مبنای اتصال مخزن، [راهنمای رسمی گیت‌هاب](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github) است.
