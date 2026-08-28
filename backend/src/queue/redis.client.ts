import { createClient, RedisClientType } from 'redis';
import { RedisConnectionError } from './queue.errors';
import { RedisCommandClient } from './queue.types';

/** A single lazy Redis connection, isolated from application services. */
export class RedisClient implements RedisCommandClient {
  private readonly client: RedisClientType;

  constructor(url: string) {
    this.client = createClient({ url, socket: { reconnectStrategy: false } });
    this.client.on('error', () => undefined);
  }

  isOpen(): boolean { return this.client.isOpen; }

  async connect(): Promise<void> {
    if (this.client.isOpen) return;
    try { await this.client.connect(); }
    catch (error) { throw new RedisConnectionError('Unable to connect to Redis', error); }
  }

  async disconnect(): Promise<void> {
    if (!this.client.isOpen) return;
    try { await this.client.quit(); }
    catch (error) { throw new RedisConnectionError('Unable to disconnect from Redis', error); }
  }

  private async command<T>(operation: () => Promise<T>): Promise<T> {
    await this.connect();
    try { return await operation(); }
    catch (error) { throw new RedisConnectionError('Redis command failed', error); }
  }

  ping(): Promise<string> { return this.command(() => this.client.ping()); }
  rPush(key: string, value: string): Promise<number> { return this.command(() => this.client.rPush(key, value)); }
  lMove(source: string, destination: string, from: 'LEFT' | 'RIGHT', to: 'LEFT' | 'RIGHT'): Promise<string | null> { return this.command(() => this.client.lMove(source, destination, from, to)); }
  lRem(key: string, count: number, value: string): Promise<number> { return this.command(() => this.client.lRem(key, count, value)); }
  sAdd(key: string, value: string): Promise<number> { return this.command(() => this.client.sAdd(key, value)); }
  sRem(key: string, value: string): Promise<number> { return this.command(() => this.client.sRem(key, value)); }
  hGet(key: string, field: string): Promise<string | undefined> { return this.command(() => this.client.hGet(key, field)); }
  hSet(key: string, field: string, value: string): Promise<number> { return this.command(() => this.client.hSet(key, field, value)); }
  hDel(key: string, field: string): Promise<number> { return this.command(() => this.client.hDel(key, field)); }
  del(key: string): Promise<number> { return this.command(() => this.client.del(key)); }
}
