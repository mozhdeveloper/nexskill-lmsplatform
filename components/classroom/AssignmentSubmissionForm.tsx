"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { uploadSubmissionFile, uploadSubmissionText } from "@/lib/media-upload";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Input";

const fileAccept: Record<string, string> = {
  photo: "image/*",
  video: "video/*",
  audio: "audio/*",
  pdf: "application/pdf",
  document: "application/pdf,.doc,.docx",
};

export function AssignmentSubmissionForm({
  userId,
  assignmentId,
  requiredSubmissionTypes,
  canSubmit,
  blockedReason,
}: {
  userId: string;
  assignmentId: string;
  requiredSubmissionTypes: string[];
  canSubmit: boolean;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [textValue, setTextValue] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canSubmit) {
    return (
      <div className="rounded-md border border-border bg-surface-raised p-4 text-sm text-muted">
        {blockedReason ?? "You cannot submit to this assignment right now."}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const submissionFiles: { mediaId: string; submissionType: string }[] = [];
      for (const type of requiredSubmissionTypes) {
        if (type === "text") {
          if (!textValue.trim()) throw new Error("Please write a response.");
          const mediaId = await uploadSubmissionText(userId, textValue);
          submissionFiles.push({ mediaId, submissionType: "text" });
        } else {
          const file = files[type];
          if (!file) throw new Error(`Please attach a ${type} file.`);
          const mediaId = await uploadSubmissionFile(userId, type, file);
          submissionFiles.push({ mediaId, submissionType: type });
        }
      }

      await apiFetch(`/api/assignments/${assignmentId}/submissions`, {
        method: "POST",
        body: JSON.stringify({ files: submissionFiles }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not submit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {requiredSubmissionTypes.map((type) =>
        type === "text" ? (
          <div key={type}>
            <Label>Your written response</Label>
            <Textarea rows={6} value={textValue} onChange={(e) => setTextValue(e.target.value)} />
          </div>
        ) : (
          <div key={type}>
            <Label>Attach {type}</Label>
            <input
              type="file"
              accept={fileAccept[type] ?? undefined}
              onChange={(e) => setFiles((prev) => ({ ...prev, [type]: e.target.files?.[0] ?? null }))}
              className="block w-full text-sm"
            />
          </div>
        )
      )}
      {error && <p className="text-sm text-error">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit assignment"}
      </Button>
    </form>
  );
}
