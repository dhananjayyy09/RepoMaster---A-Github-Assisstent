import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantConnectionError, QdrantHealthError } from './vector.errors';
import { QdrantHealthResult } from './vector.types';

export class QdrantClientWrapper {
  private client: QdrantClient;
  private url: string;

  constructor(url: string, timeout?: number) {
    this.url = url;
    this.client = new QdrantClient({
      url: url,
      timeout: timeout,
    });
  }

  getClient(): QdrantClient {
    return this.client;
  }

  async checkHealth(): Promise<QdrantHealthResult> {
    try {
      await this.client.getCollections();
      
      return {
        available: true,
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getUrl(): string {
    return this.url;
  }
}
