/** Test double: the backup's share sheet and file picker. */
export const filesControl = { shared: [] as { json: string; fileName: string }[], nextPick: null as string | null };
export async function shareJson(json: string, fileName: string) {
  filesControl.shared.push({ json, fileName });
}
export async function pickJsonText() {
  return filesControl.nextPick;
}
export async function sharePdf() {}
