// Storage utility using Vercel KV (Redis)
import { kv } from '@vercel/kv';

class KVStore {
  // Room methods
  async getRoom(roomCode) {
    const key = `room:${roomCode.toUpperCase()}`;
    return await kv.get(key);
  }

  async setRoom(roomCode, data) {
    const key = `room:${roomCode.toUpperCase()}`;
    // Expire rooms after 2 hours
    await kv.set(key, data, { ex: 7200 });
  }

  async deleteRoom(roomCode) {
    const key = `room:${roomCode.toUpperCase()}`;
    await kv.del(key);
  }

  // Saved game methods
  async getSavedGame(gameId) {
    const key = `game:${gameId}`;
    return await kv.get(key);
  }

  async setSavedGame(gameId, data) {
    const key = `game:${gameId}`;
    // Expire saved games after 7 days
    await kv.set(key, data, { ex: 604800 });
  }

  async deleteSavedGame(gameId) {
    const key = `game:${gameId}`;
    await kv.del(key);
  }

  // Cleanup methods (automatic with TTL/expiration)
  async cleanupOldRooms() {
    // Not needed - Redis handles expiration automatically
  }

  async cleanupOldGames() {
    // Not needed - Redis handles expiration automatically
  }
}

export const storage = new KVStore();
