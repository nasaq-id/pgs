import { useQuery } from "@tanstack/react-query"

const BASE_URL = "https://www.emsifa.com/api-wilayah-indonesia/api"

function normalizeName(name: string) {
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

async function fetchWilayah<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`)
  if (!res.ok) throw new Error("Gagal memuat data wilayah")
  return res.json()
}

interface WilayahItem {
  id: string
  name: string
}

interface WilayahOption {
  value: string
  label: string
}

function toOptions(items: WilayahItem[]): WilayahOption[] {
  return items.map((item) => ({
    value: item.id,
    label: normalizeName(item.name),
  }))
}

export function useProvinsi() {
  return useQuery({
    queryKey: ["wilayah", "provinsi"],
    queryFn: async () => {
      const data = await fetchWilayah<WilayahItem[]>("provinces.json")
      return toOptions(data)
    },
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useKabupatenKota(provinsiId?: string) {
  return useQuery({
    queryKey: ["wilayah", "kabupaten-kota", provinsiId],
    queryFn: async () => {
      if (!provinsiId) return []
      const data = await fetchWilayah<WilayahItem[]>(`regencies/${provinsiId}.json`)
      return toOptions(data)
    },
    enabled: !!provinsiId,
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useKecamatan(kabupatenKotaId?: string) {
  return useQuery({
    queryKey: ["wilayah", "kecamatan", kabupatenKotaId],
    queryFn: async () => {
      if (!kabupatenKotaId) return []
      const data = await fetchWilayah<WilayahItem[]>(`districts/${kabupatenKotaId}.json`)
      return toOptions(data)
    },
    enabled: !!kabupatenKotaId,
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useKelurahan(kecamatanId?: string) {
  return useQuery({
    queryKey: ["wilayah", "kelurahan", kecamatanId],
    queryFn: async () => {
      if (!kecamatanId) return []
      const data = await fetchWilayah<WilayahItem[]>(`villages/${kecamatanId}.json`)
      return toOptions(data)
    },
    enabled: !!kecamatanId,
    staleTime: 24 * 60 * 60 * 1000,
  })
}
