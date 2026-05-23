/**
 * Seed runner — upserts the PocketDeck product document.
 *
 * Connects to Mongo, performs a single upsert keyed on `slug`, logs a
 * one-line summary, then disconnects. Idempotent.
 */
import { ProductModel } from '../models/Product.js';
import { connect, disconnect, isConnected } from '../lib/db.js';
import { productSeed, seedMeta } from './data.js';

async function main(): Promise<void> {
  const ok = await connect();
  if (!ok || !isConnected()) {
    console.error('[seed] could not connect to Mongo. Aborting.');
    process.exitCode = 1;
    return;
  }

  await ProductModel.updateOne(
    { slug: productSeed.slug },
    { $set: productSeed },
    { upsert: true },
  );

  process.stdout.write(
    `[seed] upserted ${seedMeta.slug} (${seedMeta.variantCount} variants, base ${seedMeta.basePriceEGP} EGP)\n`,
  );

  await disconnect();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exitCode = 1;
  void disconnect();
});
