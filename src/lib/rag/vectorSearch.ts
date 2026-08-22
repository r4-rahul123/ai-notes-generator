import connectToDatabase from "@/lib/mongoose";
import DocumentChunk, { IDocumentChunk } from "@/lib/models/DocumentChunk";
import { generateEmbedding } from "./embeddings";
import { recursiveTextSplitter } from "./chunker";
import { generateBatchEmbeddings } from "./embeddings";
import mongoose from "mongoose";

export interface RetrievedChunk {
  chunkIndex: number;
  text: string;
  similarity: number;
  metadata?: {
    page?: number;
    sourceFileName?: string;
    charLength: number;
    wordCount: number;
  };
}

/**
 * Computes exact cosine similarity between two dense vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Indexes a document into vector chunks and stores them in MongoDB.
 */
export async function indexDocument(
  noteId: string,
  userId: string,
  fullText: string,
  sourceFileName?: string
): Promise<{ chunkCount: number }> {
  await connectToDatabase();

  const chunks = recursiveTextSplitter(fullText, {
    chunkSize: 900,
    chunkOverlap: 150,
  });

  if (chunks.length === 0) {
    return { chunkCount: 0 };
  }

  // Generate embeddings for all text chunks
  const texts = chunks.map((c) => c.text);
  const embeddings = await generateBatchEmbeddings(texts, 4);

  // Delete any existing chunks for this noteId to avoid duplication
  await DocumentChunk.deleteMany({ noteId: new mongoose.Types.ObjectId(noteId) });

  const chunkDocs = chunks.map((chunk, idx) => ({
    userId: new mongoose.Types.ObjectId(userId),
    noteId: new mongoose.Types.ObjectId(noteId),
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    embedding: embeddings[idx],
    metadata: {
      sourceFileName: sourceFileName || "Document",
      charLength: chunk.charLength,
      wordCount: chunk.wordCount,
    },
  }));

  await DocumentChunk.insertMany(chunkDocs);
  return { chunkCount: chunkDocs.length };
}

/**
 * Performs vector similarity search to retrieve the top-K most relevant chunks for a user query.
 */
export async function searchSimilarChunks(
  noteId: string,
  query: string,
  topK = 4
): Promise<RetrievedChunk[]> {
  await connectToDatabase();

  const queryEmbedding = await generateEmbedding(query);

  const storedChunks = await DocumentChunk.find({
    noteId: new mongoose.Types.ObjectId(noteId),
  }).lean();

  if (!storedChunks || storedChunks.length === 0) {
    return [];
  }

  const scored = storedChunks.map((chunk: any) => {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      similarity: Number(similarity.toFixed(4)),
      metadata: chunk.metadata,
    };
  });

  // Sort descending by similarity
  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, topK);
}
