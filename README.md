# skoolpdf

Bu repo `frontend` ve `backend` olarak iki parçadan oluşur. Backend, Supabase ile entegre çalışacak şekilde ayarlandı.

## Yapı

- `frontend/` - Vite + React uygulaması
- `backend/` - Express tabanlı PDF API
- `supabase/` - Supabase CLI projesi ve migration dosyaları
- `vercel.json` - Vercel monorepo yapılandırması

## Yerel Çalıştırma

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm start
```

Backend için `backend/.env` dosyasını oluştur ve aşağıdaki değerleri ekle:

```env
SUPABASE_URL=https://gjnsuasvwlvwcipiwtmj.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_...
PORT=5005
ALLOWED_ORIGINS=http://localhost:5173
```

## Supabase

Supabase ile proje referansı ve migration dosyaları `supabase/` dizininde bulunur.

```bash
cd supabase
npx supabase db push --yes
```

## Vercel Deploy

1. GitHub reposunu Vercel'e bağla.
2. Vercel projesinde `vercel.json` zaten yapılandırılmış.
3. `frontend` ve `backend` servisleri otomatik olarak algılanmalıdır.
4. Vercel ortam değişkenleri olarak ekle:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGINS`

Frontend canlı servisi için `frontend` dizini kullanılacak, backend ise `/api` yolunda çalışacaktır.
