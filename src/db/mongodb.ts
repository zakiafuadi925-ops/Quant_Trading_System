import mongoose from 'mongoose';

/**
 * MongoDB Atlas Connection Manager with Serverless Connection Caching (Mongoose Singleton)
 * 
 * In Serverless environments like Vercel, requests run in stateless micro-containers.
 * Caching the mongoose connection across invocations prevents connection pooling exhaustion.
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI environment variable is not defined. Database operations will be bypassed.');
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log('[MongoDB] Connected successfully to MongoDB Atlas cluster.');
      return m;
    }).catch((err) => {
      console.error('[MongoDB] Connection error:', err.message || err);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    return null;
  }
}
