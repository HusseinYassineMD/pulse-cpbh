export const SOURCE_MATERIAL_KINDS = [
  { id: "yassinelab_substack", label: "Yassine Lab Substack" },
  { id: "substack", label: "Substack / newsletter" },
  { id: "journal_article", label: "Journal article" },
  { id: "patient_handout", label: "Patient handout" },
  { id: "other", label: "Other" },
] as const;

export type SourceMaterialKind = (typeof SOURCE_MATERIAL_KINDS)[number]["id"];

export type SourceMaterialLink = {
  id: string;
  kind: SourceMaterialKind;
  label: string;
  url: string;
};

export type SourceMaterialFile = {
  id: string;
  kind: SourceMaterialKind;
  label: string;
  file: File;
};

export function kindLabel(kind: string): string {
  return SOURCE_MATERIAL_KINDS.find((k) => k.id === kind)?.label ?? kind.replace(/_/g, " ");
}
