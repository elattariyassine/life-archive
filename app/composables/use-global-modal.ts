export type GlobalModalName = 'search' | 'create'

export const useGlobalModal = () => {
  const activeModal = useState<GlobalModalName | null>('global-modal', () => null)
  const createDate = useState<string | null>('global-modal-create-date', () => null)

  const openModal = (name: GlobalModalName, options: { date?: string } = {}) => {
    createDate.value = name === 'create' ? options.date ?? null : null
    activeModal.value = name
  }

  const closeModal = () => {
    activeModal.value = null
    createDate.value = null
  }

  return { activeModal, createDate, openModal, closeModal }
}
