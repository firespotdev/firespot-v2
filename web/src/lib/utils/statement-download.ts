'use client'

import { jsPDF } from 'jspdf'
import type { Sale } from '@/services/sales/interface'
import { formatDateTime } from '@/lib/utils/date-time'
import {
  getMerchantStatus,
  getSaleCustomerName,
  getSaleDetailDescription,
} from '@/lib/utils/sales'
import { downloadBlob } from '@/lib/utils/pdf-download'

export type StatementFormat = 'csv' | 'pdf'

interface StatementRow {
  date: string
  saleId: string
  customer: string
  description: string
  mode: string
  status: string
  method: string
  total: number
  paid: number
  balance: number
}

interface PdfColumn {
  key: keyof StatementRow
  label: string
  width: number
  numeric?: boolean
}

const toStatementRow = (sale: Sale): StatementRow => {
  const total = sale.totalDue ?? sale.amount ?? 0
  const paid =
    sale.amountPaid ?? (getMerchantStatus(sale) === 'Paid' ? total : 0)

  return {
    date: formatDateTime(sale.createdAt),
    saleId: sale.reference || sale._id,
    customer: getSaleCustomerName(sale),
    description: getSaleDetailDescription(sale),
    mode: sale.isCollection ? 'Collected' : 'Recorded',
    status: getMerchantStatus(sale),
    method: sale.paymentMethod || 'Not specified',
    total,
    paid,
    balance: sale.balanceOwed ?? Math.max(total - paid, 0),
  }
}

const escapeCsvCell = (value: string | number) => {
  const raw = String(value)
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const downloadCsv = (rows: StatementRow[], filename: string) => {
  const headings = [
    'Date and time',
    'Sale ID',
    'Customer',
    'Description',
    'Type',
    'Status',
    'Payment method',
    'Total (NGN)',
    'Paid (NGN)',
    'Balance (NGN)',
  ]
  const body = rows.map((row) => [
    row.date,
    row.saleId,
    row.customer,
    row.description,
    row.mode,
    row.status,
    row.method,
    row.total.toFixed(2),
    row.paid.toFixed(2),
    row.balance.toFixed(2),
  ])
  const csv = [headings, ...body]
    .map((line) => line.map(escapeCsvCell).join(','))
    .join('\r\n')

  downloadBlob(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
    filename,
  )
}

const downloadPdf = (
  rows: StatementRow[],
  filename: string,
  startDate: string,
  endDate: string,
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margin = 10
  const pageHeight = doc.internal.pageSize.getHeight()
  const columns: PdfColumn[] = [
    { key: 'date', label: 'Date', width: 25 },
    { key: 'saleId', label: 'Sale ID', width: 29 },
    { key: 'customer', label: 'Customer', width: 34 },
    { key: 'description', label: 'Description', width: 46 },
    { key: 'mode', label: 'Type', width: 19 },
    { key: 'status', label: 'Status', width: 22 },
    { key: 'method', label: 'Method', width: 28 },
    { key: 'total', label: 'Total', width: 25, numeric: true },
    { key: 'paid', label: 'Paid', width: 25, numeric: true },
    { key: 'balance', label: 'Balance', width: 24, numeric: true },
  ]
  let y = 10

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('Firespot sales statement', margin, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`${startDate} to ${endDate}`, margin, y + 11)
    y += 17

    doc.setFillColor(244, 246, 248)
    doc.rect(margin, y, 277, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    let x = margin
    for (const column of columns) {
      doc.text(column.label, x + 1, y + 5)
      x += column.width
    }
    y += 8
  }

  drawHeader()

  for (const row of rows) {
    const cells = columns.map((column) => {
      const value = row[column.key]
      const display = column.numeric
        ? Number(value).toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : String(value)
      return doc.splitTextToSize(display, column.width - 2) as string[]
    })
    const rowHeight = Math.max(
      8,
      Math.max(...cells.map((cell) => cell.length)) * 3 + 3,
    )

    if (y + rowHeight > pageHeight - margin) {
      doc.addPage()
      y = 10
      drawHeader()
    }

    doc.setDrawColor(232, 234, 237)
    doc.line(margin, y + rowHeight, 287, y + rowHeight)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    let x = margin
    columns.forEach((column, index) => {
      const textX = column.numeric ? x + column.width - 1 : x + 1
      doc.text(cells[index], textX, y + 4, {
        align: column.numeric ? 'right' : 'left',
      })
      x += column.width
    })
    y += rowHeight
  }

  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('No sales were recorded in this date range.', margin, y + 8)
  }

  doc.save(filename)
}

export function downloadSalesStatement(
  sales: Sale[],
  format: StatementFormat,
  startDate: string,
  endDate: string,
) {
  const rows = sales.map(toStatementRow)
  const filename = `firespot-statement-${startDate}-to-${endDate}.${format}`

  if (format === 'csv') {
    downloadCsv(rows, filename)
    return
  }

  downloadPdf(rows, filename, startDate, endDate)
}
