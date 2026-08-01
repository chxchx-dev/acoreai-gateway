import * as ExcelJS from 'exceljs';
import type { MongoChatLogDocument } from 'src/infrastructure/database/mongodb/mongodb.service';

const COLUMNS = [
  { key: 'id', header: 'ID' },
  { key: 'createdAt', header: 'Fecha' },
  { key: 'source', header: 'Origen' },
  { key: 'userId', header: 'Usuario' },
  { key: 'question', header: 'Pregunta / Prompt' },
  { key: 'answer', header: 'Respuesta' },
  { key: 'model', header: 'Modelo' },
  { key: 'status', header: 'Estado' },
  { key: 'durationMs', header: 'Latencia (ms)' },
  { key: 'chunksUsed', header: 'Chunks usados' },
  { key: 'sources', header: 'Fuentes citadas' },
] as const;

function toRow(log: Partial<MongoChatLogDocument>): Record<string, string | number> {
  return {
    id: log.id ?? '',
    createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : '',
    source: log.source ?? '',
    userId: log.userId ?? '',
    question: log.question ?? '',
    answer: log.answer ?? '',
    model: log.model ?? '',
    status: log.status ?? '',
    durationMs: log.durationMs ?? '',
    chunksUsed: log.chunksUsed ?? 0,
    sources: log.sources ? JSON.stringify(log.sources) : '',
  };
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildLogsCsv(logs: Partial<MongoChatLogDocument>[]): string {
  const header = COLUMNS.map((c) => csvEscape(c.header)).join(',');
  const rows = logs.map((log) => {
    const row = toRow(log);
    return COLUMNS.map((c) => csvEscape(row[c.key])).join(',');
  });
  return [header, ...rows].join('\n');
}

export async function buildLogsXlsx(logs: Partial<MongoChatLogDocument>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Historial');

  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 24 }));
  sheet.getRow(1).font = { bold: true };

  for (const log of logs) {
    sheet.addRow(toRow(log));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
