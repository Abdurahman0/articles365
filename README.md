# Articles365 — 365 Magazines

Himoyalangan elektron kitoblar veb-platformasi **frontend**i. Foydalanuvchi
tizimga kiradi va faqat o‘ziga ruxsat berilgan kitoblarni **flip-through PDF**
o‘quvchi orqali o‘qiydi. Real backendga ulangan.

Stack: **Next.js 16 · TypeScript · Tailwind v4 · react-pageflip · pdf.js**.

## Ishga tushirish

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## Backendga ulanish

Barcha so‘rovlar `src/app/bff/[...path]/route.ts` proksisi orqali ketadi
(CORS yo‘q, ngrok warning header avtomatik qo‘shiladi, base URL serverda).

`.env.local` da API bazasini ko‘rsating (ngrok URL o‘zgaruvchan — yangilab turing):

```
API_BASE=https://<ngrok>.ngrok-free.app/api/v1
```

Klient `/bff/*` ga so‘rov yuboradi → proksi `API_BASE/*` ga uzatadi.

## Demo kirish

- O‘quvchi: `demo@articles365.local` / `demo12345`
- Ma’mur: `admin@articles365.local` / `ChangeMe_123!`
- Login formasidagi «Демо билан тўлдириш» tugmasi

## Ulangan endpointlar

| Sahifa | Endpoint |
|--------|----------|
| Login | `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout` |
| Kutubxona `/library` | `GET /library` |
| O‘quvchi `/read/[id]` | `GET /reader/books/{id}/manifest` → `GET …/content?token=` (PDF) |
| — qidiruv/progress | `GET …/search`, `GET/PUT …/progress` |
| — xatcho‘p/izoh | `GET/POST/DELETE /books/{id}/bookmarks`, `…/notes` (+ PATCH) |
| Akkaunt `/account` | `GET /sessions`, `DELETE /sessions/{id}` |
| Ma’mur `/admin` | `GET /admin/users`, `/admin/books`, block/unblock, `POST /admin/access` |

## O‘quvchi (PDF flip)

- `manifest` → `page_count`, `toc`, `last_page`, va qisqa muddatli `content_token`.
- `content?token=` → PDF baytlari (proksi orqali, `Authorization` bilan). pdf.js
  hujjatga yuklaydi.
- react-pageflip: har PDF sahifasi **lazy** ravishda canvasga render qilinadi
  (joriy ±2 sahifa; uzoqlari xotiradan tozalanadi). Muqovalar qattiq.
- TOC / qidiruv / xatcho‘p → sahifaga sakraydi. Progress har varaqda `PUT`.
- pdf.js worker: `public/pdf.worker.min.mjs` (pdfjs-dist bilan bir versiya).

## Kontent himoyasi (`src/components/SecurityGuard.tsx`, root layoutga ulangan)

- Matn tanlash + `copy`/`cut` butun saytda o‘chirilgan (forma maydonlaridan tashqari).
- O‘ng tugma menyusi ko‘rsatilmaydi.
- Bloklangan: `F12`, `Ctrl/Cmd+Shift+I/J/C/K`, `Ctrl/Cmd+U/S/P`.
- Fayl ochiq URL orqali berilmaydi — content qisqa muddatli token + auth bilan.

> JS bilan DevTools/OS-skreenshotni to‘liq to‘sib bo‘lmaydi — bu to‘siqni oshiradi.
> Asosiy himoya serverda (faylni bermaslik + huquq tekshiruvi).

## Tuzilma

```
src/
  app/
    login/                      kirish
    (shell)/ library/ account/ admin/
    read/[slug]/                PDF flip o‘quvchi (id = book_id)
    bff/[...path]/route.ts      backend proksi
  components/
    AppHeader, AuthGuard, SecurityGuard, Logo
    reader/ PdfFlipReader, ReaderToolbar, SidePanel
  lib/
    api.ts                      backend klient (token, refresh, endpointlar)
    auth.tsx                    AuthProvider (login/me/logout)
    reader-store.ts             o‘qish rejimi (localStorage — mahalliy afzallik)
```
