import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantClientWrapper } from './qdrant.client';
import {
  QdrantCollectionError,
  QdrantUpsertError,
  QdrantDeleteError,
  CollectionDimensionMismatchError,
} from './vector.errors';
import {
  VectorStorageInput,
  VectorStorageResult,
  BatchVectorStorageResult,
  VectorDeletionResult,
  VectorSearchInput,
  VectorSearchResult,
  CollectionConfig,
  VectorStorageConfig,
  RepositoryChunkPayload,
  DistanceMetric,
} from './vector.types';
import {
  generatePointId,
  validateVector,
  validatePayload,
  getVectorDimension,
} from './vector.utils';

function getQdrantErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message !== 'Bad Request') {
    return error.message;
  }

  const data = (error as { data?: { status?: { error?: unknown } } })?.data;
  if (typeof data?.status?.error === 'string') {
    return data.status.error;
  }

  return error instanceof Error ? error.message : 'Unknown error';
}

export class QdrantVectorService {
  private clientWrapper: QdrantClientWrapper;
  private config: VectorStorageConfig;
  private currentDimension: number | null = null;

  constructor(config: VectorStorageConfig) {
    this.config = config;
    this.clientWrapper = new QdrantClientWrapper(
      config.qdrantUrl,
      config.timeoutMs,
      config.apiKey
    );
  }

  private getClient(): QdrantClient {
    return this.clientWrapper.getClient();
  }

  async ensureCollection(dimension: number): Promise<void> {
    const client = this.getClient();
    const collectionName = this.config.collectionName;

    try {
      const collections = await client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === collectionName
      );

      if (!exists) {
        await client.createCollection(collectionName, {
          vectors: {
            size: dimension,
            distance: 'Cosine',
          },
        });
        this.currentDimension = dimension;
        return;
      }

      const collectionInfo = await client.getCollection(collectionName);
      const vectors = collectionInfo.config.params.vectors;
      if (!vectors) {
        throw new QdrantCollectionError(
          `Collection '${collectionName}' has no vector configuration`
        );
      }
      
      let existingDimension: number;
      let existingDistance: string;
      
      if (typeof vectors === 'number') {
        existingDimension = vectors;
        existingDistance = 'Cosine';
      } else {
        const vectorConfig = vectors as { size?: number; distance?: string };
        existingDimension = vectorConfig.size ?? 0;
        existingDistance = vectorConfig.distance ?? 'Cosine';
      }

      if (existingDistance !== 'Cosine') {
        throw new QdrantCollectionError(
          `Collection '${collectionName}' uses ${existingDistance} distance, expected Cosine`
        );
      }

      if (existingDimension !== dimension) {
        throw new CollectionDimensionMismatchError(
          collectionName,
          existingDimension,
          dimension
        );
      }

      this.currentDimension = existingDimension;
    } catch (error) {
      if (error instanceof CollectionDimensionMismatchError) {
        throw error;
      }
      if (error instanceof QdrantCollectionError) {
        throw error;
      }
      throw new QdrantCollectionError(
        `Failed to ensure collection '${collectionName}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildPayload(input: VectorStorageInput): RepositoryChunkPayload {
    const { chunk, repositoryId, repositoryFileId, repositoryOwner, repositoryName } = input;

    return {
      repositoryId,
      repositoryFileId,
      filePath: chunk.filePath,
      fileName: chunk.fileName,
      extension: chunk.fileName.split('.').pop(),
      language: chunk.language,
      chunkIndex: chunk.chunkIndex,
      totalChunks: chunk.totalChunks,
      chunkType: chunk.chunkType,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      fileSha: chunk.fileSha,
      repositoryOwner,
      repositoryName,
      chunkSize: chunk.size,
      content: chunk.content,
    };
  }

  async upsertVector(input: VectorStorageInput): Promise<VectorStorageResult> {
    try {
      await this.ensureCollection(input.embedding.dimensions);

      validateVector(
        input.embedding.vector,
        input.embedding.dimensions,
        this.config.collectionName
      );

      const payload = this.buildPayload(input);
      validatePayload(payload);

      const pointId = generatePointId(input.repositoryId, input.chunk.id);

      const qdrantPayload = {
        repositoryId: payload.repositoryId,
        repositoryFileId: payload.repositoryFileId,
        filePath: payload.filePath,
        fileName: payload.fileName,
        extension: payload.extension,
        language: payload.language,
        chunkIndex: payload.chunkIndex,
        totalChunks: payload.totalChunks,
        chunkType: payload.chunkType,
        startLine: payload.startLine,
        endLine: payload.endLine,
        fileSha: payload.fileSha,
        repositoryOwner: payload.repositoryOwner,
        repositoryName: payload.repositoryName,
        chunkSize: payload.chunkSize,
        content: payload.content,
      };

      const client = this.getClient();
      await client.upsert(this.config.collectionName, {
        points: [
          {
            id: pointId,
            vector: input.embedding.vector,
            payload: qdrantPayload,
          },
        ],
      });

      return {
        pointId,
        status: 'updated',
        collectionName: this.config.collectionName,
      };
    } catch (error) {
      if (
        error instanceof CollectionDimensionMismatchError ||
        error instanceof QdrantCollectionError
      ) {
        throw error;
      }
      throw new QdrantUpsertError(
        `Failed to upsert vector: ${getQdrantErrorMessage(error)}`
      );
    }
  }

  async searchVectors(input: VectorSearchInput): Promise<VectorSearchResult[]> {
    try {
      const client = this.getClient();
      const results = await client.query(this.config.collectionName, {
        query: input.vector,
        limit: input.limit,
        score_threshold: input.scoreThreshold,
        filter: {
          must: [
            {
              key: 'repositoryId',
              match: { value: input.repositoryId },
            },
          ],
        },
        with_payload: true,
      });

      const points = (results as any).points || (results as any);
      return points.map((result: any) => ({
        pointId: String(result.id),
        score: result.score,
        payload: (result.payload || {}) as unknown as RepositoryChunkPayload,
      }));
    } catch (error) {
      throw new QdrantCollectionError(
        `Failed to search vectors: ${getQdrantErrorMessage(error)}`
      );
    }
  }

  async upsertVectors(inputs: VectorStorageInput[]): Promise<BatchVectorStorageResult> {
    if (inputs.length === 0) {
      throw new QdrantUpsertError('Cannot upsert empty batch');
    }

    try {
      await this.ensureCollection(inputs[0].embedding.dimensions);

      const firstDimension = inputs[0].embedding.dimensions;
      for (let i = 1; i < inputs.length; i++) {
        if (inputs[i].embedding.dimensions !== firstDimension) {
          throw new CollectionDimensionMismatchError(
            this.config.collectionName,
            firstDimension,
            inputs[i].embedding.dimensions
          );
        }
      }

      const batchSize = this.config.upsertBatchSize;
      let totalUpserted = 0;

      for (let i = 0; i < inputs.length; i += batchSize) {
        const batch = inputs.slice(i, i + batchSize);
        const points = batch.map((input) => {
          validateVector(
            input.embedding.vector,
            input.embedding.dimensions,
            this.config.collectionName
          );

          const payload = this.buildPayload(input);
          validatePayload(payload);

          const pointId = generatePointId(input.repositoryId, input.chunk.id);

          return {
            id: pointId,
            vector: input.embedding.vector,
            payload: payload as Record<string, unknown>,
          };
        });

        const client = this.getClient();
        await client.upsert(this.config.collectionName, {
          points,
        });

        totalUpserted += points.length;
      }

      return {
        upsertedCount: totalUpserted,
        collectionName: this.config.collectionName,
        status: 'success',
      };
    } catch (error) {
      if (
        error instanceof CollectionDimensionMismatchError ||
        error instanceof QdrantCollectionError
      ) {
        throw error;
      }
      throw new QdrantUpsertError(
        `Failed to upsert vectors: ${getQdrantErrorMessage(error)}`
      );
    }
  }

  async deleteVector(pointId: string): Promise<VectorDeletionResult> {
    try {
      const client = this.getClient();
      const result = await client.delete(this.config.collectionName, {
        points: [pointId],
      });

      return {
        deletedCount: result.status === 'completed' || result.status === 'acknowledged' ? 1 : 0,
        collectionName: this.config.collectionName,
      };
    } catch (error) {
      throw new QdrantDeleteError(
        `Failed to delete vector: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteRepositoryVectors(repositoryId: string): Promise<VectorDeletionResult> {
    try {
      const client = this.getClient();
      const result = await client.delete(this.config.collectionName, {
        filter: {
          must: [
            {
              key: 'repositoryId',
              match: { value: repositoryId },
            },
          ],
        },
      });

      return {
        deletedCount: result.status === 'completed' || result.status === 'acknowledged' ? -1 : 0,
        collectionName: this.config.collectionName,
      };
    } catch (error) {
      throw new QdrantDeleteError(
        `Failed to delete repository vectors: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteFileVectors(repositoryFileId: string): Promise<VectorDeletionResult> {
    try {
      const client = this.getClient();
      const result = await client.delete(this.config.collectionName, {
        filter: {
          must: [
            {
              key: 'repositoryFileId',
              match: { value: repositoryFileId },
            },
          ],
        },
      });

      return {
        deletedCount: result.status === 'completed' || result.status === 'acknowledged' ? -1 : 0,
        collectionName: this.config.collectionName,
      };
    } catch (error) {
      throw new QdrantDeleteError(
        `Failed to delete file vectors: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteFileVectorsExceptSha(repositoryFileId: string, currentFileSha: string): Promise<VectorDeletionResult> {
    try {
      const client = this.getClient();
      const result = await client.delete(this.config.collectionName, {
        filter: {
          must: [{ key: 'repositoryFileId', match: { value: repositoryFileId } }],
          must_not: [{ key: 'fileSha', match: { value: currentFileSha } }],
        },
      });
      return {
        deletedCount: result.status === 'completed' || result.status === 'acknowledged' ? -1 : 0,
        collectionName: this.config.collectionName,
      };
    } catch (error) {
      throw new QdrantDeleteError(
        `Failed to reconcile vectors for file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getCollectionConfig(): Promise<CollectionConfig> {
    try {
      const client = this.getClient();
      const collectionInfo = await client.getCollection(this.config.collectionName);
      const vectors = collectionInfo.config.params.vectors;
      if (!vectors) {
        throw new QdrantCollectionError(
          `Collection '${this.config.collectionName}' has no vector configuration`
        );
      }
      
      let vectorSize: number;
      let distanceMetric: DistanceMetric;
      
      if (typeof vectors === 'number') {
        vectorSize = vectors;
        distanceMetric = 'Cosine';
      } else {
        const vectorConfig = vectors as { size?: number; distance?: string };
        vectorSize = vectorConfig.size ?? 0;
        distanceMetric = (vectorConfig.distance ?? 'Cosine') as DistanceMetric;
      }

      return {
        name: this.config.collectionName,
        vectorSize,
        distanceMetric,
        vectorsCount: (collectionInfo as { points_count?: number }).points_count ?? 0,
        status: collectionInfo.status as 'green' | 'yellow' | 'red',
      };
    } catch (error) {
      throw new QdrantCollectionError(
        `Failed to get collection config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async checkHealth(): Promise<{ available: boolean; error?: string }> {
    return this.clientWrapper.checkHealth();
  }
}
