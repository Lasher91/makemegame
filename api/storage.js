// Shared storage utility
// NOTE: This uses in-memory storage which resets on serverless cold starts
// For production, replace with Vercel KV or Redis

class MemoryStore {
  constructor() {
    if (!global.gameStorage) {
      global.gameStorage = {
        rooms: new Map(),
        savedGames: new Map()
      };
    }
    this.storage = global.gameStorage;
  }

  // Room methods
  getRoom(roomCode) {
    return this.storage.rooms.get(roomCode.toUpperCase());
  }

  setRoom(roomCode, data) {
    this.storage.rooms.set(roomCode.toUpperCase(), data);
  }

  deleteRoom(roomCode) {
    this.storage.rooms.delete(roomCode.toUpperCase());
  }

  getAllRooms() {
    return this.storage.rooms;
  }

  // Saved game methods
  getSavedGame(gameId) {
    return this.storage.savedGames.get(gameId);
  }

  setSavedGame(gameId, data) {
    this.storage.savedGames.set(gameId, data);
  }

  deleteSavedGame(gameId) {
    this.storage.savedGames.delete(gameId);
  }

  getAllSavedGames() {
    return this.storage.savedGames;
  }

  // Cleanup methods
  cleanupOldRooms() {
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    for (const [code, room] of this.storage.rooms.entries()) {
      if (room.createdAt < twoHoursAgo) {
        this.storage.rooms.delete(code);
      }
    }
  }

  cleanupOldGames() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    for (const [id, game] of this.storage.savedGames.entries()) {
      if (game.createdAt < sevenDaysAgo) {
        this.storage.savedGames.delete(id);
      }
    }
  }
}

export const storage = new MemoryStore();
