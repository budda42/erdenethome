# ERDENET HOME — Эрдэнэт байр

Байр худалдах, түрээслэх зар, газрын зураг, гэрээний удирдлага, байгууллагын бүтэц, админ удирдлагын нэгдсэн систем.

**Стек:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · MySQL 8 (mysql2) · Leaflet + OpenStreetMap · JWT (jose) · bcrypt · zod

## Гол боломжууд

- **Нийтийн вэб:** нүүр хуудас, байр хайх (хороолол, өрөө, түрээс/худалдаа, үнэ), байрны дэлгэрэнгүй, хадгалах, холбогдох хүсэлт.
- **Газрын зураг:** бүх идэвхтэй зар marker-ээр, marker дээр popup card, шүүлт, газрын зураг/жагсаалт солих.
- **Нэвтрэлт:** и-мэйл эсвэл утас, бүртгүүлэх, нууц үг сэргээх, хувийн хэсэг (хадгалсан байр, хүсэлтүүд).
- **Эрхийн удирдлага (RBAC):** Super Admin, Admin, Manager, Employee, Customer.
- **Админ:** зарын CRUD (зураг, видео, газрын зургаар байрлал тохируулах), хүсэлтийн боловсруулалт, гэрээ, хэрэглэгч, байгууллагын бүтэц, ажилтан, тохиргоо, үйлдлийн түүх.
- **Гэрээ:** дугаар, төрөл, байр, талуудын нэр, огнооны хугацаа, дүн, төлбөрийн нөхцөл, PDF файл, төлвийн урсгал (Боловсруулж буй → Хянагдаж буй → Баталгаажсан → Хүчинтэй → Дууссан / Цуцлагдсан), түүх.

## 1. Орон нутагт ажиллуулах

Шаардлагатай: Node.js 20+, MySQL 8 (эсвэл MariaDB 10.6+).

```bash
npm install
cp .env.example .env.local      # DB_* болон AUTH_SECRET-ээ бөглөнө
```

`.env.local` жишээ:
```
DB_HOST=127.0.0.1
DB_USER=eh
DB_PASSWORD=...
DB_NAME=erdenet_home
AUTH_SECRET=<32+ тэмдэгт, жнь: openssl rand -base64 48>
```

Өгөгдлийн сан, хүснэгт, анхны админ үүсгэх:
```bash
npm run db:migrate
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='хамгийн багадаа 8 тэмдэгт' npm run db:create-admin
```

Ажиллуулах:
```bash
npm run dev        # хөгжүүлэлт: http://localhost:3000
npm run build && npm start   # продакшн
```

Админ самбар: `/admin`. Зар оруулах: `/admin/properties/new`.

## 2. GitHub + Vercel дээр нийтлэх

1. **MySQL:** Vercel нь таны компьютерийн `localhost`-д хүрдэггүй. Managed MySQL (жнь: PlanetScale, Aiven, TiDB Cloud, эсвэл VPS дээрх MySQL) үүсгээд холболтын мэдээллээ авна.
2. **Schema:** `DATABASE_URL=mysql://USER:PASS@HOST:3306/erdenet_home` ашиглан `npm run db:migrate`-ийг нэг удаа ажиллуулна. Дараа нь `npm run db:create-admin`.
3. **GitHub:** шинэ repository үүсгээд кодоо push хийнэ.
4. **Vercel:** Add New → Project → repository-г Import хийнэ. Framework нь Next.js байна.
5. **Environment Variables** (Vercel → Settings → Environment Variables):
   - `DATABASE_URL` (эсвэл `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`)
   - `AUTH_SECRET` (32+ тэмдэгт, нууц)
6. Deploy дарна. Гарсан `*.vercel.app` линкээ хүмүүстээ явуулна.

> **Анхаарах:** одоогийн файлын хадгалалт (`src/lib/storage.ts`) нь серверийн диск дээр бичдэг. Vercel дээр диск тогтвортой биш тул зураг, гэрээний PDF алдагдана. Нийтэд гаргахаасаа өмнө Vercel Blob эсвэл S3-д шилжүүлэх шаардлагатай.

## 2b. BAIRDER — GitHub Pages сайт (`site/`)

`site/` хавтас нь GitHub Pages дээр ажилладаг энгийн статик сайт (build шаардлагагүй): зарын жагсаалт, шүүлтүүр, газрын зураг, бидний тухай, Facebook холбоос.

- **Хаяг:** https://budda42.github.io/erdenethome/
- **Тохиргоо:** `site/config.js` — `appUrl`-д Vercel дээрх бүтэн сайтын хаягийг бичвэл зарууд тэндээс шууд (live) ачаална, "Зар оруулах / Нэвтрэх" товч тийшээ шилжинэ. Хоосон бол `site/data/listings.json`-г харуулна.
- **Зарын өгөгдөл шинэчлэх:** `data/fb-listings.json`-г засаад `npm run pages:data`.
- **Байршил тэмдэглэх:** https://budda42.github.io/erdenethome/location.html — зар сонгоод газрын зураг дээр дарж "GitHub-д хадгалах". Байршил `site/data/locations.json`-д хадгалагдана.
- **Нийтлэх:** `main` салбарын `site/` хавтсанд өөрчлөлт орох бүрт `.github/workflows/pages.yml` автоматаар нийтэлнэ (Settings → Pages → Source = "GitHub Actions").

## 3. Аюулгүй байдлын тэмдэглэл

- Нууц үг bcrypt-ээр (12 round) хадгалагдана. Сесс нь httpOnly JWT cookie.
- Хэрэглэгч хаах эсвэл эрх солих үед `token_version` нэмэгдэж хуучин сесс хүчингүй болно.
- Гэрээний PDF-д зөвхөн `contracts.read` эрхтэй хүн хандана. Файлын зам нь `UPLOAD_DIR`-ээс гадуур гарахгүй.
- Хүсэлтийн spam хамгаалалт: honeypot талбар, утасны дугаараар цагт 5 хүртэл.
- Үйлдэл бүр `audit_logs` хүснэгтэд бичигдэнэ.

**Дутуу зүйлс (нийтлэхээсээ өмнө):**
- Нууц үг сэргээх имэйл/SMS илгээгч холбоогүй (токен одоогоор зөвхөн dev горимд консолд харагдана).
- Нэвтрэх оролдлогод rate limit байхгүй.
- Файлын хадгалалтыг object storage руу шилжүүлэх (дээрх анхааруулгыг үз).

## Лиценз

Лиценз: тодорхойлоогүй (эзэмшигч шийдэж тохируулна).
