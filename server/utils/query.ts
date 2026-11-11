import { isValidMemoryDate } from '../repositories/filesystem-memory-repository'

const getScalarQueryValue = (value: unknown) => typeof value === 'string' ? value : null

export const parseYearQuery = (value: unknown) => {
  const scalar = getScalarQueryValue(value)
  if (scalar === null || !/^\d{4}$/.test(scalar)) throw createError({ statusCode: 400, statusMessage: 'Invalid year filter' })
  const year = Number(scalar)
  if (!isValidMemoryDate(`${scalar}-01-01`)) throw createError({ statusCode: 400, statusMessage: 'Invalid year filter' })
  return year
}

export const parseMonthQuery = (value: unknown) => {
  const scalar = getScalarQueryValue(value)
  if (scalar === null || !/^(0?[1-9]|1[0-2])$/.test(scalar)) throw createError({ statusCode: 400, statusMessage: 'Invalid month filter' })
  return Number(scalar)
}

export const assertRequestDate = (date: string) => {
  if (!isValidMemoryDate(date)) throw createError({ statusCode: 400, statusMessage: 'Invalid memory date' })
}
