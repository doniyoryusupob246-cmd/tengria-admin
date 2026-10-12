# Tengria Admin

Kurs, kategori, eğitmen, kullanıcı, medya ve makale yönetimi + istatistik paneli. Next.js 14 (App Router) + Tailwind CSS ile yazıldı, mevcut NestJS backend'ine (`../backend`) bağlanır.

## Kurulum

```bash
cd admin
npm install
cp .env.example .env.local
```

`.env.local` içindeki `NEXT_PUBLIC_API_URL` değerini backend adresine göre ayarla (varsayılan: production Vercel URL'i, yerelde çalıştırıyorsan `http://localhost:3000` yapabilirsin).

## Geliştirme

```bash
npm run dev
```

`http://localhost:3001` (veya Next'in verdiği port) üzerinden açılır.

## Giriş

Yönetici paneline yalnızca `role: ADMIN` olan kullanıcılar girebilir. Backend'de seed script'i artık bir admin hesabı oluşturuyor:

- E-posta: `admin@tengria.app`
- Şifre: `TengriaAdmin2026!`

Bunu görmek için backend tarafında `npx prisma db seed` çalıştırman gerekiyor (migration'ları uyguladıktan sonra). Üretimde bu şifreyi ilk girişten sonra değiştirmeni öneririm — şu an panelde "şifre değiştir" ekranı yok, bu yüzden Prisma Studio veya SQL ile güncelleyebilirsin.

Var olan bir kullanıcıyı admin yapmak istersen, kullanıcılar tablosunda `role` alanını `ADMIN` yapman yeterli (Prisma Studio: `npx prisma studio`).

## Dağıtım (Vercel)

1. `admin` klasörünü ayrı bir Vercel projesi olarak bağla (backend ve mobile'dan bağımsız).
2. Environment variable ekle: `NEXT_PUBLIC_API_URL=https://tengria-backend.vercel.app` (veya kendi backend domain'in).
3. Build command: `next build` (varsayılan), Framework preset: Next.js.

## Neler var

- **Genel Bakış** — kullanıcı/kurs/ders/medya/makale toplamları, son 30 günlük kayıt ve kurs tamamlama grafiği, en popüler kurslar.
- **Kurslar** — kurs oluştur/düzenle/sil, her kursun içine girip modül ve ders ekle/düzenle/sil.
- **Kategoriler / Eğitmenler** — CRUD.
- **Kullanıcılar** — arama, sayfalama, rol (STUDENT/ADMIN) ve plan (FREE/PREMIUM) değiştirme.
- **Medya / Makaleler** — CRUD (bu iki içerik tipi mobil uygulamada henüz gerçek API'ye bağlı değil, şu an sadece admin panelinden yönetiliyor — mobil tarafı ayrı bir iş olarak bağlanabilir).

## Notlar

- Panel backend'deki `/admin/*` uçlarını kullanır; bu uçlar `RolesGuard` ile korunur, sadece `ADMIN` rolündeki kullanıcılar erişebilir.
- Oturum JWT token'ı bir cookie'de (`tengria_admin_token`) tutulur; `middleware.ts` bu cookie'nin varlığına göre sayfa erişimini kontrol eder, gerçek rol kontrolü ise client tarafta `/auth/me` ile doğrulanır.
