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

## Custom PDF designs

1. Open `/admin` and sign in  
2. Create or **Edit design** on a form  
3. Upload a **PDF** (first page) or PNG/JPG  
4. Add text boxes, drag them into place, set **font / size / color / align**  
5. Save — users see your design in the studio and fill only those fields  
