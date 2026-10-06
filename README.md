# Vibe Content Engine v0.4.1 — بدون AI

این نسخه موتور محتوای Vibe را با معماری **Rules-only** اجرا می‌کند. هیچ Gemini، OpenAI یا LLM در مسیر Import/Prepare وجود ندارد.

## هدف نسخه

موتور فقط فایل رسانه را نمی‌گیرد؛ هر نتیجه را به یک **Vibe کامل** مطابق UIهای تاییدشده تبدیل می‌کند و دقیقاً مشخص می‌کند چه فیلدهایی از منبع آمده، چه فیلدهایی با قواعد ساده ساخته شده و چه چیزی هنوز ناقص است.

مسیر اصلی:

`Source API → License → Resolve media/text → Rule Engine → Validate fields → Vibe Draft`

## پنج نوع Vibe

### 1) Text
فیلدهای UI:
- `category_label`
- `title`
- `body`
- `keywords[]`
- `read_time_min`
- `translation_mode`

نکات:
- متن از خود Source/متن Resolve شده می‌آید.
- زمان مطالعه از تعداد کلمات محاسبه می‌شود.
- Keywordها از Tags/Genres/Subjects و متن منبع استخراج می‌شوند.
- معنی Keywordها در زمان لمس کاربر از Dictionary گرفته می‌شود؛ از قبل تولید نمی‌شود.

### 2) Image + Text
فیلدهای UI:
- `media_url`
- `title`
- `description`
- `read_time_min`
- `translation_mode`

در UI تاییدشده Category chip نمایش داده نمی‌شود، ولی Category داخلی برای Recommendation نگه‌داری می‌شود.

### 3) Video
فیلدهای UI:
- `category_label`
- `media_url`
- `poster_url`
- `duration_sec`
- `title`
- `description`
- `subtitle_url`
- `translation_mode`

### 4) Podcast
فیلدهای UI:
- `category_label`
- `media_url`
- `duration_sec`
- `title`
- `description`
- `transcript`
- `theme`
- `translation_mode`

پس‌زمینه گرادیانت با Rule Engine و بدون AI انتخاب می‌شود. Progress دور میکروفون Runtime خود اپ است.

### 5) Music
فیلدهای UI:
- `category_label`
- `media_url`
- `poster_url`
- `duration_sec`
- `title`
- `description`
- `theme`

Progress و Play state مربوط به Runtime اپ است؛ دکمه Previous/Next جزو UI نیست.

## Translation بدون هزینه تولید انبوه

در Import هیچ ترجمه‌ای تولید نمی‌شود.

```json
{
  "translation": null,
  "translation_mode": "on_demand_cache",
  "translation_status": "not_generated"
}
```

وقتی کاربر در اپ دکمه Translate را بزند، سرویس ترجمه جداگانه می‌تواند ترجمه را یک بار بسازد و Cache کند. بنابراین برای هزاران Vibe هزینه ترجمه از قبل پرداخت نمی‌شود.

## وضعیت کامل بودن Vibe

هر Draft این فیلدها را دارد:

```json
{
  "required_fields": [],
  "missing_required": [],
  "completeness": 100,
  "ready_to_publish": true,
  "rights_status": "clear | review | blocked",
  "field_origins": {
    "title": "source",
    "category": "rules",
    "read_time_min": "calculated",
    "translation": "lazy-on-demand"
  }
}
```

پس اگر یک ویدیو فقط فایل MP4 داشته باشد ولی Title/Description/Duration نداشته باشد، موتور آن را Ready فرض نمی‌کند.

## منابع متصل

بدون API Key:
- Project Gutenberg — Text
- Wikisource — Text
- Wikimedia Commons — Image / Video / Audio / Music
- NASA — Image / Video / Audio
- LibriVox — Audio/Podcast
- Internet Archive — Music/Audio (نیازمند Review مجوز)

اختیاری با Secret:
- Smithsonian Open Access — `SI_API_KEY`
- Pixabay — `PIXABAY_API_KEY`

## Cloudflare

فایل‌های اصلی:

```text
vibe-content-engine-v04/
├── public/
│   └── index.html
├── src/
│   └── worker.js
├── package.json
├── wrangler.toml
└── README.md
```

برای نسخه آنلاین Worker، همین پروژه باید Deploy شود. AI key لازم نیست.

Secrets اختیاری:

```bash
npx wrangler secret put SI_API_KEY
npx wrangler secret put PIXABAY_API_KEY
```

## مواردی که عمداً هنوز نیست

- Upload محتوا توسط کاربران
- Publish مستقیم در اپ Me
- دیتابیس مرکزی Draftها
- سرویس واقعی Translation/Dictionary (Schema و حالت lazy آماده است)
- Cron/Queue برای Sync شبانه

این موارد مستقل از موتور Rules-only فعلی هستند و می‌توانند در مرحله بعد اضافه شوند.


## تغییر v0.4.1
- جستجوی LibriVox سبک‌تر شد: حداکثر 25 نتیجه در هر درخواست جستجو.
- extended metadata فقط هنگام Resolve یک آیتم دریافت می‌شود.
- fallback به path-style title search اضافه شد.
- خطای واقعی provider در UI نمایش داده می‌شود تا دیباگ آسان‌تر باشد.
