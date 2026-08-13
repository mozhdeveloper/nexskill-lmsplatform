"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const assetTypeBySubmissionType: Record<string, "image" | "video" | "audio" | "document"> = {
  photo: "image",
  video: "video",
  audio: "audio",
  pdf: "document",
  document: "document",
  text: "document",
};

/**
 * Uploads a file to the private `submissions` bucket (owner-scoped folder, per storage RLS in
 * supabase/migrations/0007_storage.sql) and records a media_assets row. Used by the assignment
 * submission form — every submission type (including 'text', stored as a small text file) goes
 * through this same real upload path rather than being faked as metadata-only.
 */
export async function uploadSubmissionFile(
  userId: string,
  submissionType: string,
  file: File
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const path = `${userId}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("submissions").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: mediaAsset, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      owner_id: userId,
      asset_type: assetTypeBySubmissionType[submissionType] ?? "document",
      title: file.name,
      storage_bucket: "submissions",
      storage_path: path,
      processing_status: "ready",
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  return mediaAsset.id;
}

export async function uploadSubmissionText(userId: string, text: string): Promise<string> {
  const file = new File([text], "response.txt", { type: "text/plain" });
  return uploadSubmissionFile(userId, "text", file);
}
