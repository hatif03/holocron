import type { NodeType } from "@holocron/shared";
import { getNodeFieldSchema } from "@holocron/shared";

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

export function allowedExtensionsForField(
  nodeType: NodeType,
  fieldKey: string
): string[] | null {
  const schema = getNodeFieldSchema(nodeType);
  const field = schema.fields.find((f) => f.key === fieldKey);
  if (!field?.accept) return null;
  return field.accept
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function validateUploadExtension(
  filename: string,
  nodeType: NodeType,
  fieldKey: string
): string | null {
  const allowed = allowedExtensionsForField(nodeType, fieldKey);
  if (!allowed) return null;
  const ext = extensionOf(filename);
  if (!ext || !allowed.includes(ext)) {
    return `File type not allowed. Expected: ${allowed.join(", ")}`;
  }
  return null;
}
