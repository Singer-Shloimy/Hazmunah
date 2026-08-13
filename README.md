# Hazmunah

Invitation studio — English website UI, Hebrew invitation text, font controls, Stripe card checkout.

## Run

```bash
npm install
copy .env.example .env
npm run dev
```

- Studio: http://localhost:5173/
- Checkout: http://localhost:5173/checkout
- Admin: http://localhost:5173/admin

## Stripe credit cards

1. Create a Stripe account and get **test** keys from Developers → API keys  
2. Put them in `.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
APP_URL=http://localhost:5173
```

3. Restart the API (`npm run dev`)  
4. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC  

Optional webhook (recommended in production):

```bash
stripe listen --forward-to localhost:8787/api/webhooks/stripe
```

Set `STRIPE_WEBHOOK_SECRET` from that command.

Without Stripe keys, checkout stays in **demo** mode (`ALLOW_DEMO_PAYMENTS=1`).

## Deploy on Railway (Option A — one service)

One service runs **API + built website**.

1. Create a Railway project from this repo  
2. Set variables:

```env
APP_URL=https://YOUR-APP.up.railway.app
ADMIN_PASSWORD=choose-a-strong-password
STRIPE_SECRET_KEY=sk_live_...   # or sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
ALLOW_DEMO_PAYMENTS=0
```

3. (Recommended) Add a **volume** mounted at `/data`, then also set:

```env
DATA_DIR=/data
UPLOADS_DIR=/data/uploads
```

Without a volume, uploads and orders reset on every redeploy.

4. Deploy. Railway runs `npm run build` then `npm start`.  
   Open the public URL — site, `/admin`, `/checkout`, and `/api` all share it.

5. In Stripe Dashboard, set the webhook endpoint to  
   `https://YOUR-APP.up.railway.app/api/webhooks/stripe`  
   and put `STRIPE_WEBHOOK_SECRET` in Railway variables.

Local check of the production bundle:

```bash
npm run build
npm start
```

Then open http://localhost:8787/

## Custom PDF designs

1. Open `/admin` and sign in  
2. Create or **Edit design** on a form  
3. Upload a **PDF** (first page) or PNG/JPG  
4. Add text boxes, drag them into place, set **font / size / color / align**  
5. Save — users see your design in the studio and fill only those fields  
