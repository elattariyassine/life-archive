export type GlobalModalName = 'search' | 'create'

export const useGlobalModal = () => {
  const activeModal = useState<GlobalModalName | null>('global-modal', () => null)

  const openModal = (name: GlobalModalName) => {
    activeModal.value = name
  }

  const closeModal = () => {
    activeModal.value = null
  }

  return { activeModal, openModal, closeModal }
}
