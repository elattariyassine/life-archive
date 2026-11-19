import type { MemoryRepositoryStatusResponse } from '~/types/memory-api'

export const useArchiveStatus = () => {
  const { data: status, error, refresh, status: requestStatus } = useFetch<MemoryRepositoryStatusResponse>('/api/status', { key: 'archive-status', dedupe: 'defer' })
  const isFilesystem = computed(() => status.value?.mode === 'filesystem')
  const canWrite = computed(() => isFilesystem.value && Boolean(status.value?.archiveAvailable))
  const isChecking = computed(() => requestStatus.value === 'pending' && !status.value)
  return { status, error, refresh, isFilesystem, canWrite, isChecking }
}
