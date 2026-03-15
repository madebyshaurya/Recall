let lastEmbedding: number[] | null = null;

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export function isDuplicate(
  newEmbedding: number[],
  threshold = 0.90
): boolean {
  if (!lastEmbedding) {
    lastEmbedding = newEmbedding;
    return false;
  }
  const similarity = cosineSimilarity(newEmbedding, lastEmbedding);
  if (similarity > threshold) {
    return true;
  }
  lastEmbedding = newEmbedding;
  return false;
}

export function resetDedup(): void {
  lastEmbedding = null;
}
