import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import Stripe from 'stripe'
import { PRODUCTS, listProducts } from './products.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname)
const CLIENT_DIST = path.join(ROOT, '..', 'dist')
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data')
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(ROOT, 'uploads')
const MUSIC_DIR = path.join(UPLOADS_DIR, 'music')
const DESIGNS_DIR = path.join(UPLOADS_DIR, 'designs')
const FORMS_FILE = path.join(DATA_DIR, 'forms.json')
const MUSIC_FILE = path.join(DATA_DIR, 'music.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')
const SEED_FORMS = path.join(ROOT, 'seed-forms.json')

const PORT = Number(process.env.PORT || 8787)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hazmunah-admin'
const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''
const ALLOW_DEMO_PAYMENTS = process.env.ALLOW_DEMO_PAYMENTS !== '0'
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null

fs.mkdirSync(DATA_DIR, { recursive: true })
fs.mkdirSync(MUSIC_DIR, { recursive: true })
fs.mkdirSync(DESIGNS_DIR, { recursive: true })

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

if (!fs.existsSync(FORMS_FILE) || process.env.RESEED_FORMS === '1') {
  writeJson(FORMS_FILE, readJson(SEED_FORMS, []))
}
if (!fs.existsSync(MUSIC_FILE)) {
  writeJson(MUSIC_FILE, [])
}
if (!fs.existsSync(ORDERS_FILE)) {
  writeJson(ORDERS_FILE, [])
}

const emptyFields = () => ({
  hostLine: '',
  honoree: '',
  eventTitle: '',
  date: '',
  time: '',
  venue: '',
  address: '',
  message: '',
  rsvp: '',
  topLine1: '',
  topLine2: '',
  topLine3: '',
  bottomLine1: '',
  bottomLine2: '',
})

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MUSIC_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp3'
    cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith('audio/') ||
      /\.(mp3|wav|m4a|ogg|aac)$/i.test(file.originalname)
    cb(ok ? null : new Error('Only audio files are allowed'), ok)
  },
})

const designStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DESIGNS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png'
    cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`)
  },
})

const uploadDesign = multer({
  storage: designStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif)$/i.test(file.originalname)
    cb(ok ? null : new Error('Only image files are allowed (PDF is converted in the browser)'), ok)
  },
})

const app = express()
app.set('trust proxy', 1)
app.use(cors({ origin: true }))

// Stripe webhooks need the raw body
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe) return res.status(503).send('Stripe not configured')

    let event = req.body
    if (STRIPE_WEBHOOK_SECRET) {
      const signature = req.headers['stripe-signature']
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          STRIPE_WEBHOOK_SECRET,
        )
      } catch (error) {
        console.error('Webhook signature failed', error.message)
        return res.status(400).send(`Webhook Error: ${error.message}`)
      }
    } else {
      try {
        event = JSON.parse(req.body.toString())
      } catch {
        return res.status(400).send('Invalid payload')
      }
    }

    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'checkout.session.completed'
    ) {
      const object = event.data.object
      const orderToken =
        object.metadata?.orderToken ||
        (event.type === 'checkout.session.completed'
          ? object.id
          : undefined)

      if (orderToken) {
        markOrderPaid(orderToken, {
          paymentIntentId: object.payment_intent || object.id,
        })
      }
    }

    res.json({ received: true })
  },
)

app.use(express.json({ limit: '2mb' }))
app.use('/uploads/music', express.static(MUSIC_DIR))
app.use('/uploads/designs', express.static(DESIGNS_DIR))

const sessions = new Set()

function requireAdmin(req, res, next) {
  const token = req.header('x-admin-token')
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

function saveOrder(order) {
  const orders = readJson(ORDERS_FILE, [])
  const index = orders.findIndex((item) => item.token === order.token)
  if (index === -1) orders.push(order)
  else orders[index] = { ...orders[index], ...order }
  writeJson(ORDERS_FILE, orders)
  return order
}

function findOrder(token) {
  return readJson(ORDERS_FILE, []).find((order) => order.token === token)
}

function markOrderPaid(token, extra = {}) {
  const orders = readJson(ORDERS_FILE, [])
  const index = orders.findIndex((order) => order.token === token)
  if (index === -1) return null
  orders[index] = {
    ...orders[index],
    ...extra,
    status: 'paid',
    paidAt: new Date().toISOString(),
  }
  writeJson(ORDERS_FILE, orders)
  return orders[index]
}

function paymentMode() {
  if (stripe && STRIPE_PUBLISHABLE_KEY) return 'stripe'
  if (ALLOW_DEMO_PAYMENTS) return 'demo'
  return 'unconfigured'
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, payments: paymentMode() })
})

app.get('/api/products', (_req, res) => {
  res.json({
    mode: paymentMode(),
    currency: 'USD',
    publishableKey: STRIPE_PUBLISHABLE_KEY || null,
    products: listProducts(),
  })
})

/** Embedded card checkout via PaymentIntent */
app.post('/api/checkout/create-intent', async (req, res) => {
  const productId = String(req.body?.productId || '')
  const product = PRODUCTS[productId]
  if (!product) return res.status(400).json({ error: 'Invalid product' })

  const mode = paymentMode()
  if (mode === 'unconfigured') {
    return res.status(503).json({
      error:
        'Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to .env',
    })
  }

  const orderToken = randomUUID()

  if (mode === 'stripe') {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: product.price * 100,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderToken,
          productId: product.id,
          entitlements: product.entitlements.join(','),
        },
        description: `${product.name} — Hazmunah`,
      })

      saveOrder({
        token: orderToken,
        productId: product.id,
        entitlements: product.entitlements,
        status: 'pending',
        mode: 'stripe',
        paymentIntentId: paymentIntent.id,
        createdAt: new Date().toISOString(),
      })

      return res.json({
        mode: 'stripe',
        orderToken,
        clientSecret: paymentIntent.client_secret,
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        product,
      })
    } catch (error) {
      console.error(error)
      return res.status(500).json({
        error: error.message || 'Could not start card payment',
      })
    }
  }

  // Demo fallback for local testing without Stripe keys
  saveOrder({
    token: orderToken,
    productId: product.id,
    entitlements: product.entitlements,
    status: 'pending',
    mode: 'demo',
    createdAt: new Date().toISOString(),
  })

  res.json({
    mode: 'demo',
    orderToken,
    product,
  })
})

app.post('/api/checkout/demo/pay', (req, res) => {
  if (paymentMode() !== 'demo') {
    return res.status(403).json({ error: 'Demo payments are disabled' })
  }
  const orderToken = String(req.body?.orderToken || '')
  const order = markOrderPaid(orderToken)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(order)
})

app.get('/api/orders/:token', async (req, res) => {
  const token = req.params.token
  let order = findOrder(token)
  if (!order) return res.status(404).json({ error: 'Order not found' })

  if (
    order.mode === 'stripe' &&
    order.status !== 'paid' &&
    stripe &&
    order.paymentIntentId
  ) {
    try {
      const intent = await stripe.paymentIntents.retrieve(order.paymentIntentId)
      if (intent.status === 'succeeded') {
        order = markOrderPaid(token, { paymentIntentId: intent.id }) || order
      }
    } catch (error) {
      console.error(error)
    }
  }

  res.json(order)
})

app.get('/api/forms', (_req, res) => {
  res.json(readJson(FORMS_FILE, []))
})

app.get('/api/music', (_req, res) => {
  const tracks = readJson(MUSIC_FILE, []).map((track) => ({
    ...track,
    url: `/uploads/music/${track.filename}`,
  }))
  res.json(tracks)
})

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '')
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' })
  }
  const token = randomUUID()
  sessions.add(token)
  res.json({ token })
})

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  sessions.delete(req.header('x-admin-token'))
  res.json({ ok: true })
})

app.post('/api/admin/forms', requireAdmin, (req, res) => {
  const body = req.body || {}
  const forms = readJson(FORMS_FILE, [])
  const form = {
    id: randomUUID(),
    name: String(body.name || 'New invitation').trim(),
    category: String(body.category || 'Wedding').trim(),
    style: String(body.style || 'garden'),
    description: String(body.description || '').trim(),
    defaults: { ...emptyFields(), ...(body.defaults || {}) },
    designImage: body.designImage || null,
    regions: Array.isArray(body.regions) ? body.regions : [],
    watermark: body.watermark || null,
  }
  forms.push(form)
  writeJson(FORMS_FILE, forms)
  res.status(201).json(form)
})

app.put('/api/admin/forms/:id', requireAdmin, (req, res) => {
  const forms = readJson(FORMS_FILE, [])
  const index = forms.findIndex((form) => form.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Form not found' })

  const body = req.body || {}
  forms[index] = {
    ...forms[index],
    name: String(body.name ?? forms[index].name).trim(),
    category: String(body.category ?? forms[index].category).trim(),
    style: String(body.style ?? forms[index].style),
    description: String(body.description ?? forms[index].description).trim(),
    defaults: {
      ...emptyFields(),
      ...forms[index].defaults,
      ...(body.defaults || {}),
    },
    designImage:
      body.designImage !== undefined
        ? body.designImage
        : forms[index].designImage || null,
    regions:
      body.regions !== undefined
        ? body.regions
        : forms[index].regions || [],
    watermark:
      body.watermark !== undefined
        ? body.watermark
        : forms[index].watermark || null,
  }
  writeJson(FORMS_FILE, forms)
  res.json(forms[index])
})

app.delete('/api/admin/forms/:id', requireAdmin, (req, res) => {
  const forms = readJson(FORMS_FILE, [])
  const next = forms.filter((form) => form.id !== req.params.id)
  if (next.length === forms.length) {
    return res.status(404).json({ error: 'Form not found' })
  }
  writeJson(FORMS_FILE, next)
  res.json({ ok: true })
})

app.post(
  '/api/admin/designs',
  requireAdmin,
  (req, res, next) => {
    uploadDesign.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message })
      next()
    })
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Design image required' })
    res.status(201).json({
      filename: req.file.filename,
      url: `/uploads/designs/${req.file.filename}`,
    })
  },
)

app.post(
  '/api/admin/music',
  requireAdmin,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message })
      next()
    })
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Audio file required' })

    const tracks = readJson(MUSIC_FILE, [])
    const track = {
      id: randomUUID(),
      name: String(req.body?.name || req.file.originalname).trim(),
      mood: String(req.body?.mood || 'Uploaded track').trim(),
      filename: req.file.filename,
    }
    tracks.push(track)
    writeJson(MUSIC_FILE, tracks)
    res.status(201).json({
      ...track,
      url: `/uploads/music/${track.filename}`,
    })
  },
)

app.delete('/api/admin/music/:id', requireAdmin, (req, res) => {
  const tracks = readJson(MUSIC_FILE, [])
  const track = tracks.find((item) => item.id === req.params.id)
  if (!track) return res.status(404).json({ error: 'Track not found' })

  const filePath = path.join(MUSIC_DIR, track.filename)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  writeJson(
    MUSIC_FILE,
    tracks.filter((item) => item.id !== req.params.id),
  )
  res.json({ ok: true })
})

// Production / Railway: serve the Vite build from the same process
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { index: false }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next()
    }
    res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

app.listen(PORT, () => {
  console.log(`Hazmunah on http://localhost:${PORT}`)
  console.log(`App URL: ${APP_URL}`)
  console.log(
    `Static site: ${fs.existsSync(CLIENT_DIST) ? CLIENT_DIST : 'not built (API only)'}`,
  )
  console.log(`Admin password: ${ADMIN_PASSWORD}`)
  console.log(`Payments: ${paymentMode()}`)
  if (paymentMode() !== 'stripe') {
    console.log(
      'Add STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY for live card checkout',
    )
  }
})
