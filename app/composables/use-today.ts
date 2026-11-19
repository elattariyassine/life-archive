import { toIsoDate } from '~/utils/discovery'

/** Today's local date, computed once on the server and reused during hydration to avoid mismatches. */
export const useToday = () => useState('today', () => toIsoDate(new Date()))
