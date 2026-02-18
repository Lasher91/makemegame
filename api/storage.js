// Storage utility using ioredis for traditional Redis
import Redis from 'ioredis';

// Initialize Redis client from REDIS_URL environment variable
const redis = new Redis(process.env.REDIS_URL);

class RedisStore {
  // Room methods
  async getRoom(roomCode) {
    const key = `room:${roomCode.toUpperCase()}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setRoom(roomCode, data) {
    const key = `room:${roomCode.toUpperCase()}`;
    // Expire rooms after 2 hours (7200 seconds)
    await redis.set(key, JSON.stringify(data), 'EX', 7200);
  }

  async deleteRoom(roomCode) {
    const key = `room:${roomCode.toUpperCase()}`;
    await redis.del(key);
  }

  // Saved game methods
  async getSavedGame(gameId) {
    const key = `game:${gameId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setSavedGame(gameId, data) {
    const key = `game:${gameId}`;
    // Expire saved games after 7 days (604800 seconds)
    await redis.set(key, JSON.stringify(data), 'EX', 604800);
  }

  async deleteSavedGame(gameId) {
    const key = `game:${gameId}`;
    await redis.del(key);
  }

  // Cleanup methods (automatic with TTL/expiration)
  async cleanupOldRooms() {
    // Not needed - Redis handles expiration automatically with EX
  }

  async cleanupOldGames() {
    // Not needed - Redis handles expiration automatically with EX
  }
}

export const storage = new RedisStore();
