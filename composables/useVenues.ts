// VENUE-001-004: 会場管理 Composable
// 仕様書: docs/design/features/project/VENUE-001-004_venue-management.md

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export interface EquipmentItem {
  name: string
  quantity: number
  note?: string
}

export interface WifiInfo {
  ssid: string
  password?: string
  bandwidth?: string
}

export interface VenueData {
  id: string
  tenant_id: string
  name: string
  branch_name: string | null
  address: string | null
  latitude: string | null
  longitude: string | null
  capacity: number | null
  hourly_rate: number | null
  phone: string | null
  description: string | null
  floor_map_url: string | null
  equipment: EquipmentItem[]
  wifi_info: WifiInfo | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateVenuePayload {
  name: string
  branch_name?: string
  address?: string
  latitude?: number
  longitude?: number
  capacity?: number
  hourly_rate?: number
  phone?: string
  description?: string
  floor_map_url?: string
  equipment?: EquipmentItem[]
  wifi_info?: WifiInfo
  notes?: string
}

export interface StreamingPackageData {
  id: string
  tenant_id: string | null
  name: string
  description: string | null
  items: { name: string; quantity: number; unit: string }[]
  base_price: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateStreamingPackagePayload {
  name: string
  description?: string
  items: { name: string; quantity: number; unit: string }[]
  base_price: number
}

export interface QuoteItem {
  category: string
  name: string
  unit_price: number
  quantity: number
  subtotal: number
}

export interface QuoteData {
  id: string
  event_id: string
  tenant_id: string
  title: string
  items: QuoteItem[]
  total_amount: number
  status: string
  generated_by: string | null
  created_by: string
  notes: string | null
  quote_number?: string
  subtotal?: number
  tax?: number
  valid_until?: string
  created_at: string
  updated_at: string
}

export interface AvailabilityEntry {
  date: string
  status: 'available' | 'booked'
  event_id?: string
  event_title?: string
}

// ──────────────────────────────────────
// Composable
// ──────────────────────────────────────

export function useVenues() {
  const venues = ref<VenueData[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  })

  async function fetchVenues(page = 1, perPage = 20) {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: VenueData[]; pagination: typeof pagination.value }>('/api/v1/venues', {
        query: { page, per_page: perPage },
      })
      venues.value = res.data
      pagination.value = res.pagination
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '会場一覧の取得に失敗しました'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchVenue(id: string): Promise<VenueData | null> {
    try {
      const res = await $fetch<{ data: VenueData }>(`/api/v1/venues/${id}`)
      return res.data
    } catch {
      return null
    }
  }

  async function createVenue(payload: CreateVenuePayload): Promise<VenueData | null> {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: VenueData }>('/api/v1/venues', {
        method: 'POST',
        body: payload,
      })
      await fetchVenues(pagination.value.page, pagination.value.perPage)
      return res.data
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '会場の作成に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateVenue(id: string, payload: Partial<CreateVenuePayload>): Promise<VenueData | null> {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: VenueData }>(`/api/v1/venues/${id}`, {
        method: 'PATCH',
        body: payload,
      })
      await fetchVenues(pagination.value.page, pagination.value.perPage)
      return res.data
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '会場の更新に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteVenue(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await $fetch(`/api/v1/venues/${id}`, { method: 'DELETE' })
      await fetchVenues(pagination.value.page, pagination.value.perPage)
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '会場の削除に失敗しました'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function searchVenues(query: { area?: string; capacity_min?: number; capacity_max?: number }) {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: VenueData[]; pagination: typeof pagination.value }>('/api/v1/venues/search', {
        query,
      })
      venues.value = res.data
      pagination.value = res.pagination
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '会場検索に失敗しました'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAvailability(venueId: string, startDate: string, endDate: string): Promise<AvailabilityEntry[]> {
    try {
      const res = await $fetch<{ availability: AvailabilityEntry[] }>(`/api/v1/venues/${venueId}/availability`, {
        query: { start_date: startDate, end_date: endDate },
      })
      return res.availability
    } catch {
      return []
    }
  }

  return {
    venues,
    isLoading,
    error,
    pagination,
    fetchVenues,
    fetchVenue,
    createVenue,
    updateVenue,
    deleteVenue,
    searchVenues,
    fetchAvailability,
  }
}

// ──────────────────────────────────────
// 配信パッケージ Composable
// ──────────────────────────────────────

export function useStreamingPackages() {
  const packages = ref<StreamingPackageData[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchPackages() {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: StreamingPackageData[] }>('/api/v1/streaming-packages')
      packages.value = res.data
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '配信パッケージの取得に失敗しました'
    } finally {
      isLoading.value = false
    }
  }

  async function createPackage(payload: CreateStreamingPackagePayload): Promise<StreamingPackageData | null> {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: StreamingPackageData }>('/api/v1/streaming-packages', {
        method: 'POST',
        body: payload,
      })
      await fetchPackages()
      return res.data
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '配信パッケージの作成に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updatePackage(id: string, payload: Partial<CreateStreamingPackagePayload> & { is_active?: boolean }): Promise<StreamingPackageData | null> {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: StreamingPackageData }>(`/api/v1/streaming-packages/${id}`, {
        method: 'PATCH',
        body: payload,
      })
      await fetchPackages()
      return res.data
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? '配信パッケージの更新に失敗しました'
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    packages,
    isLoading,
    error,
    fetchPackages,
    createPackage,
    updatePackage,
  }
}

// ──────────────────────────────────────
// フォーマットヘルパー
// ──────────────────────────────────────

export function formatCapacity(capacity: number | null): string {
  if (capacity === null || capacity === undefined) return '未設定'
  return `${capacity.toLocaleString()}人`
}

export function formatHourlyRate(rate: number | null): string {
  if (rate === null || rate === undefined) return '未設定'
  if (rate === 0) return '無料'
  return `¥${rate.toLocaleString()}/時間`
}

export function formatEquipmentSummary(equipment: EquipmentItem[]): string {
  if (!equipment || equipment.length === 0) return 'なし'
  return equipment.map(e => `${e.name}×${e.quantity}`).join('、')
}
