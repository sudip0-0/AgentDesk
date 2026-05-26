import { randomUUID } from "node:crypto";
import { asc, count, eq, sql } from "drizzle-orm";
import { getDatabase } from "../client.js";
import { terminalLogs } from "../schema.js";

const MAX_CHUNK_LENGTH = 16_384;

export interface TerminalLogChunkRecord {
  id: string;
  sequence: number;
  chunk: string;
  createdAt: string;
}

export const appendTerminalLogChunk = (agentRunId: string, chunk: string): void => {
  if (!chunk) {
    return;
  }

  const database = getDatabase();
  let remaining = chunk;

  while (remaining.length > 0) {
    const piece = remaining.slice(0, MAX_CHUNK_LENGTH);
    remaining = remaining.slice(MAX_CHUNK_LENGTH);

    const sequenceRow = database
      .select({ nextSequence: sql<number>`coalesce(max(${terminalLogs.sequence}), 0) + 1` })
      .from(terminalLogs)
      .where(eq(terminalLogs.agentRunId, agentRunId))
      .get();

    const sequence = sequenceRow?.nextSequence ?? 1;

    database.insert(terminalLogs).values({
      id: randomUUID(),
      agentRunId,
      sequence,
      chunk: piece,
      createdAt: new Date().toISOString()
    }).run();
  }
};

export const listTerminalLogChunks = (
  agentRunId: string,
  offset: number,
  limit: number
): TerminalLogChunkRecord[] => {
  const database = getDatabase();

  return database
    .select({
      id: terminalLogs.id,
      sequence: terminalLogs.sequence,
      chunk: terminalLogs.chunk,
      createdAt: terminalLogs.createdAt
    })
    .from(terminalLogs)
    .where(eq(terminalLogs.agentRunId, agentRunId))
    .orderBy(asc(terminalLogs.sequence))
    .limit(limit)
    .offset(offset)
    .all();
};

export const getTerminalLogMeta = (
  agentRunId: string
): { chunkCount: number; characterCount: number } => {
  const database = getDatabase();

  const meta = database
    .select({
      chunkCount: count(terminalLogs.id),
      characterCount: sql<number>`coalesce(sum(length(${terminalLogs.chunk})), 0)`
    })
    .from(terminalLogs)
    .where(eq(terminalLogs.agentRunId, agentRunId))
    .get();

  return {
    chunkCount: Number(meta?.chunkCount ?? 0),
    characterCount: Number(meta?.characterCount ?? 0)
  };
};

export const buildTranscript = (agentRunId: string): string => {
  const database = getDatabase();
  const chunks = database
    .select({ chunk: terminalLogs.chunk })
    .from(terminalLogs)
    .where(eq(terminalLogs.agentRunId, agentRunId))
    .orderBy(asc(terminalLogs.sequence))
    .all();

  return chunks.map((entry) => entry.chunk).join("");
};
