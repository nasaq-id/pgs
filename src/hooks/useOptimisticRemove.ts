"use client"

import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

type Options = {
  queryKey: unknown[]
  invalidateKeys?: unknown[][]
  successMessage?: string
  errorMessage?: string
  onSuccess?: (data: unknown, vars: { id: string }) => void
  onError?: (err: unknown, vars: { id: string }) => void
}

export function useOptimisticRemove({
  queryKey,
  invalidateKeys,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
}: Options) {
  const queryClient = useQueryClient()

  return {
    onMutate: async ({ id }: { id: string }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = new Map<string, unknown>()
      for (const [key, data] of queryClient.getQueriesData({ queryKey })) {
        previous.set(JSON.stringify(key), data)
        if (Array.isArray(data)) {
          queryClient.setQueryData(key, data.filter((item: unknown) => (item as { id?: string })?.id !== id))
        }
      }
      return { previous }
    },
    onError: (
      err: unknown,
      vars: { id: string },
      context?: { previous: Map<string, unknown> }
    ) => {
      if (context) {
        for (const [keyStr, data] of context.previous) {
          queryClient.setQueryData(JSON.parse(keyStr) as unknown[], data)
        }
      }
      if (errorMessage) toast.error(errorMessage)
      onError?.(err, vars)
    },
    onSuccess: (data: unknown, vars: { id: string }) => {
      if (successMessage) toast.success(successMessage)
      onSuccess?.(data, vars)
    },
    onSettled: () => {
      for (const key of [queryKey, ...(invalidateKeys ?? [])]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  }
}
