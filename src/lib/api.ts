import type {
  CardFields,
  Template,
  TemplateStyle,
  TextRegion,
  WatermarkConfig,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export interface ApiMusicTrack {
  id: string
  name: string
  mood: string
  filename?: string
  url: string
}

export interface Product {
  id: string
  name: string
  nameEn: string
  description: string
  price: number
  entitlements: Array<'pdf' | 'video' | 'png'>
}

export interface ProductsResponse {
  mode: 'stripe' | 'demo' | 'unconfigured'
  currency: string
  publishableKey?: string | null
  products: Product[]
}

export interface PaymentIntentResponse {
  mode: 'stripe' | 'demo'
  orderToken: string
  clientSecret?: string
  publishableKey?: string
  product: Product
}

export interface Order {
  token: string
  productId: string
  entitlements: Array<'pdf' | 'video' | 'png'>
  status: 'pending' | 'paid'
  mode: 'stripe' | 'demo'
}

export type InviteForm = Template

export type FormPayload = {
  name: string
  category: string
  style: TemplateStyle
  description: string
  defaults: CardFields
  designImage?: string | null
  regions?: TextRegion[]
  watermark?: WatermarkConfig | null
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers)
  if (token) headers.set('x-admin-token', token)
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    let message = 'Request failed'
    try {
      const data = (await response.json()) as { error?: string }
      message = data.error || message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function assetUrl(path?: string | null) {
  if (!path) return ''
  if (path.startsWith('http') || path.startsWith('data:')) return path
  return `${API_BASE}${path}`
}

export function musicUrl(track: ApiMusicTrack) {
  return assetUrl(track.url)
}

export const api = {
  getForms: () => request<InviteForm[]>('/api/forms'),
  getMusic: () => request<ApiMusicTrack[]>('/api/music'),
  getProducts: () => request<ProductsResponse>('/api/products'),
  createPaymentIntent: (productId: string) =>
    request<PaymentIntentResponse>('/api/checkout/create-intent', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),
  demoPay: (orderToken: string) =>
    request<Order>('/api/checkout/demo/pay', {
      method: 'POST',
      body: JSON.stringify({ orderToken }),
    }),
  getOrder: (token: string) => request<Order>(`/api/orders/${token}`),
  login: (password: string) =>
    request<{ token: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  logout: (token: string) =>
    request<{ ok: boolean }>(
      '/api/admin/logout',
      { method: 'POST' },
      token,
    ),
  createForm: (token: string, payload: FormPayload) =>
    request<InviteForm>(
      '/api/admin/forms',
      { method: 'POST', body: JSON.stringify(payload) },
      token,
    ),
  updateForm: (token: string, id: string, payload: Partial<FormPayload>) =>
    request<InviteForm>(
      `/api/admin/forms/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token,
    ),
  deleteForm: (token: string, id: string) =>
    request<{ ok: boolean }>(
      `/api/admin/forms/${id}`,
      { method: 'DELETE' },
      token,
    ),
  uploadDesign: (token: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<{ filename: string; url: string }>(
      '/api/admin/designs',
      { method: 'POST', body },
      token,
    )
  },
  uploadMusic: (
    token: string,
    file: File,
    meta: { name: string; mood: string },
  ) => {
    const body = new FormData()
    body.append('file', file)
    body.append('name', meta.name)
    body.append('mood', meta.mood)
    return request<ApiMusicTrack>(
      '/api/admin/music',
      { method: 'POST', body },
      token,
    )
  },
  deleteMusic: (token: string, id: string) =>
    request<{ ok: boolean }>(
      `/api/admin/music/${id}`,
      { method: 'DELETE' },
      token,
    ),
}
