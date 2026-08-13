import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { api, type Product } from '../lib/api'
import { StepBar } from '../components/StepBar'

const ORDER_KEY = 'hazmunah-order-token'

function formatMoney(amount: number) {
  return `$${amount}`
}

function CardForm({
  orderToken,
  product,
}: {
  orderToken: string
  product: Product
}) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?paid=${orderToken}`,
      },
      redirect: 'if_required',
    })

    if (result.error) {
      setError(result.error.message || 'Payment failed')
      setSubmitting(false)
      return
    }

    if (
      result.paymentIntent &&
      (result.paymentIntent.status === 'succeeded' ||
        result.paymentIntent.status === 'processing')
    ) {
      localStorage.setItem(ORDER_KEY, orderToken)
      navigate(`/?paid=${orderToken}`, { replace: true })
      return
    }

    setError('Payment was not completed. Please try again.')
    setSubmitting(false)
  }

  return (
    <form className="checkout-card-form" onSubmit={handleSubmit}>
      <div className="checkout-summary">
        <strong>{product.name}</strong>
        <span>{formatMoney(product.price)}</span>
        <p>{product.description}</p>
      </div>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error ? <p className="admin-error">{error}</p> : null}
      <button
        className="btn primary"
        type="submit"
        disabled={!stripe || submitting}
      >
        {submitting
          ? 'Processing card…'
          : `Pay ${formatMoney(product.price)}`}
      </button>
      <p className="download-note">
        Secure card processing by Stripe. We never store your card details.
      </p>
    </form>
  )
}

function DemoPayForm({
  orderToken,
  product,
}: {
  orderToken: string
  product: Product
}) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handlePay() {
    setSubmitting(true)
    setError('')
    try {
      await api.demoPay(orderToken)
      localStorage.setItem(ORDER_KEY, orderToken)
      navigate(`/?paid=${orderToken}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo payment failed')
      setSubmitting(false)
    }
  }

  return (
    <div className="checkout-card-form">
      <div className="checkout-summary">
        <strong>{product.name}</strong>
        <span>{formatMoney(product.price)}</span>
        <p>{product.description}</p>
      </div>
      <p className="download-note">
        Stripe keys are not set — this is a local demo checkout (no real charge).
      </p>
      {error ? <p className="admin-error">{error}</p> : null}
      <button
        className="btn primary"
        type="button"
        disabled={submitting}
        onClick={handlePay}
      >
        {submitting
          ? 'Confirming…'
          : `Simulate pay ${formatMoney(product.price)}`}
      </button>
    </div>
  )
}

export function Checkout() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialProduct = searchParams.get('product') || ''
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState(initialProduct || 'base')
  const [phase, setPhase] = useState<'pick' | 'pay'>(
    initialProduct === 'base' || initialProduct === 'music' ? 'pay' : 'pick',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'stripe' | 'demo'>('demo')
  const [orderToken, setOrderToken] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null)

  useEffect(() => {
    api
      .getProducts()
      .then((catalog) => {
        setProducts(catalog.products)
        if (!selectedId && catalog.products[0]) {
          setSelectedId(catalog.products[0].id)
        }
      })
      .catch(() => setError('Could not load packages.'))
  }, [selectedId])

  async function startPayment(productId: string) {
    setLoading(true)
    setError('')
    setClientSecret('')
    setStripePromise(null)
    try {
      const intent = await api.createPaymentIntent(productId)
      setMode(intent.mode)
      setOrderToken(intent.orderToken)
      setProduct(intent.product)
      setPhase('pay')
      setSearchParams({ product: productId }, { replace: true })
      if (
        intent.mode === 'stripe' &&
        intent.clientSecret &&
        intent.publishableKey
      ) {
        setClientSecret(intent.clientSecret)
        setPublishableKey(intent.publishableKey)
        setStripePromise(loadStripe(intent.publishableKey))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout')
      setPhase('pick')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (phase === 'pay' && initialProduct && !product && !loading) {
      startPayment(initialProduct)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: 'night' as const,
              variables: {
                colorPrimary: '#d4788c',
                colorBackground: '#1a2332',
                colorText: '#e8eef4',
                borderRadius: '12px',
              },
            },
          }
        : undefined,
    [clientSecret],
  )

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden />
      <header className="site-header">
        <Link className="brand" to="/">
          Hazmunah
        </Link>
        <nav className="header-actions">
          <Link className="btn ghost" to="/">
            Back to invite
          </Link>
        </nav>
      </header>

      <div className="studio-shell">
        <StepBar step={3} />
        <main className="checkout-main">
          <section className="checkout-hero">
            <h1>Checkout</h1>
            <p>
              {phase === 'pick'
                ? 'Choose your package, then pay securely by card.'
                : 'Complete payment to unlock your downloads.'}
            </p>
          </section>

          {error ? <p className="admin-error">{error}</p> : null}

          {phase === 'pick' ? (
            <div className="checkout-pick">
              <div className="product-grid checkout-products">
                {products.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`product-card${selectedId === item.id ? ' selected' : ''}${item.id === 'music' ? ' product-featured' : ''}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    {item.id === 'music' ? (
                      <span className="product-badge">Most popular</span>
                    ) : null}
                    <strong>{item.name}</strong>
                    <span className="product-price">
                      {formatMoney(item.price)}
                    </span>
                    <span className="product-desc">{item.description}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn primary checkout-pay-cta"
                disabled={!selectedId || loading}
                onClick={() => startPayment(selectedId)}
              >
                {loading
                  ? 'Preparing…'
                  : `Continue with ${formatMoney(products.find((p) => p.id === selectedId)?.price ?? 25)}`}
              </button>
            </div>
          ) : null}

          {phase === 'pay' && loading ? (
            <p className="download-note">Preparing secure payment…</p>
          ) : null}

          {phase === 'pay' && !loading && product && mode === 'demo' ? (
            <div className="admin-card checkout-shell">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setPhase('pick')}
              >
                ← Change package
              </button>
              <DemoPayForm orderToken={orderToken} product={product} />
            </div>
          ) : null}

          {phase === 'pay' &&
          !loading &&
          product &&
          mode === 'stripe' &&
          clientSecret &&
          stripePromise &&
          options ? (
            <div className="admin-card checkout-shell">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setPhase('pick')}
              >
                ← Change package
              </button>
              <Elements
                stripe={stripePromise}
                options={options}
                key={publishableKey}
              >
                <CardForm orderToken={orderToken} product={product} />
              </Elements>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
