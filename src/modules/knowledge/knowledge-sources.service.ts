import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { CreateKnowledgeSourceDto } from 'src/interfaces/http/dto/knowledge/create-knowledge-source.dto';
import { UpdateKnowledgeSourceDto } from 'src/interfaces/http/dto/knowledge/update-knowledge-source.dto';
import { KnowledgeAuditService } from './knowledge-audit.service';
import { KnowledgeIngestionService } from './ingestion/knowledge-ingestion.service';
import { KnowledgeEmbeddingsService } from './embeddings/knowledge-embeddings.service';
import { computeSourceWarnings } from './ingestion/warnings.util';
import { summarizeTextDiff } from './ingestion/version-diff.util';
import { csvToKnowledgeText } from './ingestion/csv-to-text.util';
import { UPLOADER_EDITABLE_STATUSES } from 'src/domain/knowledge/knowledge-permissions';

const NON_DUPLICATE_BLOCKING_STATUSES = ['archived', 'rejected'] as const;
const RETRYABLE_EMBEDDING_STATUSES = ['embedding_pending', 'embedding_failed'] as const;
const IN_PROGRESS_STATUSES = ['pending_extraction', 'extracted', 'chunked'] as const;

@Injectable()
export class KnowledgeSourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: KnowledgeAuditService,
    private readonly ingestion: KnowledgeIngestionService,
    private readonly embeddings: KnowledgeEmbeddingsService,
  ) {}

  async create(dto: CreateKnowledgeSourceDto, uploadedBy?: string) {
    return this.registerAndProcess(dto, dto.content, uploadedBy);
  }

  async createFromUpload(
    dto: Omit<CreateKnowledgeSourceDto, 'content'>,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    uploadedBy?: string,
  ) {
    const raw = file.buffer.toString('utf-8');
    const isCsv = file.originalname.toLowerCase().endsWith('.csv');
    // El CSV no se guarda tal cual: se convierte a texto (una sección por fila)
    // para reusar el mismo pipeline de extracción/chunking que TXT/MD, sin
    // tener que enseñarle al chunker un formato tabular nuevo.
    const content = isCsv ? csvToKnowledgeText(raw) : raw;

    if (isCsv && content.trim().length === 0) {
      throw new BadRequestException('El CSV no tiene filas de datos (¿solo trae encabezado?)');
    }

    const source = await this.registerAndProcess(
      { ...dto, sourceType: 'upload' },
      content,
      uploadedBy,
      { originalFilename: file.originalname, mimeType: file.mimetype },
    );
    return source;
  }

  private async registerAndProcess(
    dto: Omit<CreateKnowledgeSourceDto, 'content'>,
    content: string | undefined,
    uploadedBy?: string,
    fileMeta?: { originalFilename: string; mimeType: string },
  ) {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException(
        'La fuente no trae contenido: envía "content" (texto) o un archivo en /knowledge/sources/upload',
      );
    }

    const textHash = createHash('sha256').update(content.trim()).digest('hex');

    if (!dto.allowDuplicate) {
      const duplicate = await this.prisma.knowledgeSource.findFirst({
        where: {
          checksum: textHash,
          status: { notIn: [...NON_DUPLICATE_BLOCKING_STATUSES] },
        },
      });

      if (duplicate) {
        throw new ConflictException({
          message: 'Ya existe una fuente publicada/en revisión con el mismo contenido',
          existingSourceId: duplicate.id,
          hint: 'Envía allowDuplicate=true si de verdad quieres crear una nueva versión igual',
        });
      }
    }

    const source = await this.prisma.knowledgeSource.create({
      data: {
        title: dto.title,
        description: dto.description,
        sourceType: dto.sourceType,
        area: dto.area,
        language: dto.language ?? 'es',
        priority: dto.priority ?? 50,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        uploadedBy,
        status: 'pending_extraction',
        // fileMeta (multipart) manda sobre dto.*: solo aplica para /upload.
        // dto.originalFilename/mimeType/sourceUrl preservan de dónde salió el
        // texto cuando viene de convertir un PDF/DOCX/URL ya editado a mano.
        originalFilename: fileMeta?.originalFilename ?? dto.originalFilename,
        mimeType: fileMeta?.mimeType ?? dto.mimeType,
        fileUrl: dto.sourceUrl,
      },
    });

    await this.audit.log({
      entityType: 'knowledge_source',
      entityId: source.id,
      action: 'source.created',
      newValue: { title: source.title, sourceType: source.sourceType },
      userId: uploadedBy,
    });

    this.ingestion.queueProcessing(source.id, content);

    return {
      id: source.id,
      status: source.status,
      message: 'Fuente registrada. La extracción quedó en cola.',
    };
  }

  // ownerOnly: cuando el caller es KNOWLEDGE_UPLOADER, solo ve sus propias fuentes.
  findAll(ownerOnly?: string) {
    return this.prisma.knowledgeSource.findMany({
      where: ownerOnly ? { uploadedBy: ownerOnly } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, ownerOnly?: string) {
    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { version: 'desc' } },
        reviews: { orderBy: { createdAt: 'desc' } },
        processingJobs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!source) {
      throw new NotFoundException(`KnowledgeSource ${id} no encontrado`);
    }

    if (ownerOnly && source.uploadedBy !== ownerOnly) {
      throw new ForbiddenException('Solo puedes ver fuentes que tú mismo subiste');
    }

    const latestVersion = source.versions[0] ?? null;
    const chunks = latestVersion
      ? await this.prisma.knowledgeChunk.findMany({
          where: { versionId: latestVersion.id },
          orderBy: { chunkIndex: 'asc' },
        })
      : [];

    return {
      ...source,
      chunks,
      warnings: computeSourceWarnings(source, latestVersion, chunks),
    };
  }

  async update(id: string, dto: UpdateKnowledgeSourceDto, userId?: string, ownerOnly?: string) {
    const existing = await this.prisma.knowledgeSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`KnowledgeSource ${id} no encontrado`);
    }

    if (ownerOnly) {
      if (existing.uploadedBy !== ownerOnly) {
        throw new ForbiddenException('Solo puedes editar fuentes que tú mismo subiste');
      }
      if (!UPLOADER_EDITABLE_STATUSES.includes(existing.status as (typeof UPLOADER_EDITABLE_STATUSES)[number])) {
        throw new ForbiddenException(
          `No puedes editar esta fuente en estado "${existing.status}": un uploader solo edita mientras está en borrador (antes de enviarla a revisión).`,
        );
      }
    }

    const source = await this.prisma.knowledgeSource.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        area: dto.area,
        language: dto.language,
        priority: dto.priority,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });

    await this.audit.log({
      entityType: 'knowledge_source',
      entityId: id,
      action: 'source.updated',
      oldValue: {
        title: existing.title,
        area: existing.area,
        priority: existing.priority,
      },
      newValue: { title: source.title, area: source.area, priority: source.priority },
      userId,
    });

    return source;
  }

  // Fase 8: sube contenido actualizado para una fuente que YA existe (posiblemente
  // publicada). Crea una versión nueva en pending_review; la versión/chunks
  // publicados actuales siguen sirviendo al chat sin cambios hasta que se
  // apruebe y publique la nueva.
  async createNewVersion(
    id: string,
    content: string,
    userId?: string,
    ownerOnly?: string,
  ): Promise<{ id: string; version: number; status: string; message: string }> {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('El contenido de la nueva versión no puede estar vacío');
    }

    const source = await this.prisma.knowledgeSource.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException(`KnowledgeSource ${id} no encontrado`);
    }

    if (ownerOnly && source.uploadedBy !== ownerOnly) {
      throw new ForbiddenException('Solo puedes crear una nueva versión de fuentes que tú mismo subiste');
    }

    if (IN_PROGRESS_STATUSES.includes(source.status as (typeof IN_PROGRESS_STATUSES)[number])) {
      throw new BadRequestException(
        `Ya hay una versión en proceso (estado "${source.status}"). Espera a que termine antes de crear otra.`,
      );
    }

    const nextVersion = source.currentVersion + 1;
    await this.prisma.knowledgeSource.update({
      where: { id },
      data: { currentVersion: nextVersion, status: 'pending_extraction' },
    });

    await this.audit.log({
      entityType: 'knowledge_source',
      entityId: id,
      action: 'source.new_version_created',
      newValue: { version: nextVersion },
      userId,
    });

    this.ingestion.queueProcessing(id, content);

    return {
      id,
      version: nextVersion,
      status: 'pending_extraction',
      message: `Versión ${nextVersion} en cola de extracción. La versión publicada actual sigue activa hasta que se apruebe y publique la nueva.`,
    };
  }

  async reprocess(id: string) {
    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!source) {
      throw new NotFoundException(`KnowledgeSource ${id} no encontrado`);
    }

    const latestVersion = source.versions[0];
    if (!latestVersion?.extractedText) {
      throw new BadRequestException(
        'Esta fuente todavía no tiene texto extraído: espera a que termine la extracción inicial antes de reprocesar',
      );
    }

    await this.audit.log({
      entityType: 'knowledge_source',
      entityId: id,
      action: 'source.reprocess_requested',
    });

    this.ingestion.queueProcessing(id, latestVersion.extractedText);

    return { id, status: 'pending_extraction', message: 'Reprocesamiento en cola.' };
  }

  async remove(id: string, userId?: string): Promise<void> {
    const existing = await this.prisma.knowledgeSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`KnowledgeSource ${id} no encontrado`);
    }

    await this.prisma.knowledgeSource.delete({ where: { id } });

    await this.audit.log({
      entityType: 'knowledge_source',
      entityId: id,
      action: 'source.deleted',
      oldValue: { title: existing.title, status: existing.status },
      userId,
    });
  }

  async retryEmbeddings(id: string) {
    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!source) {
      throw new NotFoundException(`KnowledgeSource ${id} no encontrado`);
    }

    if (!RETRYABLE_EMBEDDING_STATUSES.includes(source.status as (typeof RETRYABLE_EMBEDDING_STATUSES)[number])) {
      throw new BadRequestException(
        `No se pueden (re)generar embeddings: la fuente está en estado "${source.status}", debe estar en embedding_pending o embedding_failed.`,
      );
    }

    const latestVersion = source.versions[0];
    if (!latestVersion) {
      throw new BadRequestException('La fuente no tiene ninguna versión con chunks aprobados');
    }

    if (source.status === 'embedding_failed') {
      await this.prisma.knowledgeSource.update({ where: { id }, data: { status: 'embedding_pending' } });
    }

    this.embeddings.queueGeneration(id, latestVersion.id);

    return { id, status: 'embedding_pending', message: 'Generación de embeddings en cola.' };
  }

  async compareVersions(sourceId: string, fromVersionNumber: number, toVersionNumber: number) {
    const [fromVersion, toVersion] = await Promise.all([
      this.prisma.knowledgeSourceVersion.findUnique({
        where: { sourceId_version: { sourceId, version: fromVersionNumber } },
      }),
      this.prisma.knowledgeSourceVersion.findUnique({
        where: { sourceId_version: { sourceId, version: toVersionNumber } },
      }),
    ]);

    if (!fromVersion || !toVersion) {
      throw new NotFoundException('Alguna de las dos versiones solicitadas no existe para esta fuente');
    }

    const [fromChunks, toChunks] = await Promise.all([
      this.prisma.knowledgeChunk.findMany({ where: { versionId: fromVersion.id } }),
      this.prisma.knowledgeChunk.findMany({ where: { versionId: toVersion.id } }),
    ]);

    const fromContents = new Set(fromChunks.map((c) => c.content));
    const toContents = new Set(toChunks.map((c) => c.content));

    const textDiff = summarizeTextDiff(fromVersion.extractedText ?? '', toVersion.extractedText ?? '');

    return {
      from: { version: fromVersion.version, createdAt: fromVersion.createdAt },
      to: { version: toVersion.version, createdAt: toVersion.createdAt },
      ...textDiff,
      chunksAdded: toChunks.filter((c) => !fromContents.has(c.content)).length,
      chunksRemoved: fromChunks.filter((c) => !toContents.has(c.content)).length,
    };
  }
}
