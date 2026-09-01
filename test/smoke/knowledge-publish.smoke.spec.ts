import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { KnowledgePublishingService } from 'src/modules/knowledge/knowledge-publishing.service';
import { KnowledgeSearchService } from 'src/modules/knowledge/retrieval/knowledge-search.service';
import { RagService } from 'src/modules/rag/rag.service';
import { createTestApp } from './test-app';

const FIXED_EMBEDDING = new Array(768).fill(0.01);

async function setEmbedding(prisma: PrismaService, chunkId: string): Promise<void> {
  const vectorLiteral = `[${FIXED_EMBEDDING.join(',')}]`;
  await prisma.$executeRaw`
    UPDATE "KnowledgeChunk"
    SET "embedding" = ${vectorLiteral}::vector, "embeddingModel" = 'smoke-test'
    WHERE "id" = ${chunkId}
  `;
}

async function createPublishedFixture(
  prisma: PrismaService,
  data: {
    title: string;
    area: string;
    language?: string;
    status?: 'published' | 'archived';
    validUntil?: Date;
  },
): Promise<string> {
  const source = await prisma.knowledgeSource.create({
    data: {
      title: data.title,
      sourceType: 'text',
      area: data.area,
      language: data.language ?? 'es',
      status: data.status ?? 'published',
      validFrom: new Date('2020-01-01'),
      validUntil: data.validUntil,
    },
  });
  const version = await prisma.knowledgeSourceVersion.create({
    data: { sourceId: source.id, version: 1, title: source.title, status: 'published' },
  });
  const chunk = await prisma.knowledgeChunk.create({
    data: {
      sourceId: source.id,
      versionId: version.id,
      chunkIndex: 0,
      content: `Contenido fixture de ${data.title}.`,
      status: 'published',
    },
  });
  await setEmbedding(prisma, chunk.id);
  return source.id;
}

describe('Knowledge publish smoke (contrato published-only)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let publishingService: KnowledgePublishingService;
  let searchService: KnowledgeSearchService;
  let legacyRagService: RagService;

  let publishedSourceId: string;
  let draftSourceId: string;
  let expiredSourceId: string;
  let archivedSourceId: string;
  let restrictedSourceId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    publishingService = app.get(KnowledgePublishingService);
    searchService = app.get(KnowledgeSearchService);
    legacyRagService = app.get(RagService);

    // Fuente que se va a publicar: draft -> ready_to_publish con todos los
    // prerequisitos que exige KnowledgePublishingService.publish().
    const source = await prisma.knowledgeSource.create({
      data: {
        title: 'Smoke test source (published)',
        sourceType: 'text',
        area: 'smoke-test-area',
        status: 'ready_to_publish',
        validFrom: new Date('2020-01-01'),
      },
    });
    publishedSourceId = source.id;

    const version = await prisma.knowledgeSourceVersion.create({
      data: { sourceId: source.id, version: 1, title: source.title, status: 'approved' },
    });

    const chunk = await prisma.knowledgeChunk.create({
      data: {
        sourceId: source.id,
        versionId: version.id,
        chunkIndex: 0,
        content: 'Contenido de prueba que debería quedar publicado.',
        status: 'approved',
      },
    });
    await setEmbedding(prisma, chunk.id);

    await prisma.knowledgeReview.create({
      data: {
        sourceId: source.id,
        versionId: version.id,
        reviewerId: randomUUID(),
        decision: 'approved',
      },
    });

    // Fuente que se queda sin publicar (pending_review): su chunk NUNCA debe
    // aparecer en una búsqueda, sin importar qué tan similar sea el embedding.
    const draftSource = await prisma.knowledgeSource.create({
      data: {
        title: 'Smoke test source (unpublished)',
        sourceType: 'text',
        area: 'smoke-test-area',
        status: 'pending_review',
        validFrom: new Date('2020-01-01'),
      },
    });
    draftSourceId = draftSource.id;

    const draftVersion = await prisma.knowledgeSourceVersion.create({
      data: { sourceId: draftSource.id, version: 1, title: draftSource.title, status: 'pending_review' },
    });

    const draftChunk = await prisma.knowledgeChunk.create({
      data: {
        sourceId: draftSource.id,
        versionId: draftVersion.id,
        chunkIndex: 0,
        content: 'Contenido de prueba que NO debería aparecer en la búsqueda.',
        status: 'pending_review',
      },
    });
    await setEmbedding(prisma, draftChunk.id);

    expiredSourceId = await createPublishedFixture(prisma, {
      title: 'Smoke test source (expired)',
      area: 'smoke-test-area',
      validUntil: new Date('2020-01-01'),
    });
    archivedSourceId = await createPublishedFixture(prisma, {
      title: 'Smoke test source (archived)',
      area: 'smoke-test-area',
      status: 'archived',
    });
    restrictedSourceId = await createPublishedFixture(prisma, {
      title: 'Smoke test source (restricted filter)',
      area: 'other-area',
      language: 'en',
    });
  });

  afterAll(async () => {
    for (const sourceId of [publishedSourceId, draftSourceId, expiredSourceId, archivedSourceId, restrictedSourceId]) {
      if (!sourceId) continue;
      await prisma.knowledgeReview.deleteMany({ where: { sourceId } });
      await prisma.knowledgeChunk.deleteMany({ where: { sourceId } });
      await prisma.knowledgeSourceVersion.deleteMany({ where: { sourceId } });
      await prisma.knowledgeSource.deleteMany({ where: { id: sourceId } });
    }
    await app.close();
  });

  it('transitions a source from draft/ready_to_publish to published', async () => {
    const published = await publishingService.publish(publishedSourceId);

    expect(published.status).toBe('published');

    const chunks = await prisma.knowledgeChunk.findMany({ where: { sourceId: publishedSourceId } });
    expect(chunks.every((c) => c.status === 'published')).toBe(true);
  });

  it('only returns published chunks in search, never draft/pending_review ones', async () => {
    const results = await searchService.search({ query: 'contenido de prueba' });

    const sourceIds = results.map((r) => r.sourceId);
    expect(sourceIds).toContain(publishedSourceId);
    expect(sourceIds).not.toContain(draftSourceId);
  });

  it('excludes expired, archived, and out-of-filter sources', async () => {
    const results = await searchService.search({
      query: 'contenido fixture',
      area: 'smoke-test-area',
      language: 'es',
    });
    const sourceIds = results.map((r) => r.sourceId);

    expect(sourceIds).not.toContain(expiredSourceId);
    expect(sourceIds).not.toContain(archivedSourceId);
    expect(sourceIds).not.toContain(restrictedSourceId);
  });

  it('keeps the legacy RAG adapter on the supervised published-only search', async () => {
    const results = await legacyRagService.searchContext('contenido fixture', 'smoke-test-user');
    const sourceIds = results.chunks.map((chunk) => chunk.documentId);

    expect(sourceIds).not.toContain(expiredSourceId);
    expect(sourceIds).not.toContain(archivedSourceId);
    expect(sourceIds).not.toContain(restrictedSourceId);
  });
});
