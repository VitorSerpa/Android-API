import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Native file hand-off: PDFs (RF-42/RF-43) and the JSON backup (RF-38) are
 * written to the cache and handed to the Android share sheet, which lists
 * e-mail, messaging apps and "save to files".
 */

async function share(uri: string, mimeType: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('O compartilhamento não está disponível neste aparelho.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
}

/** Renders `html` to a PDF named `fileName` and opens the native share sheet with it attached. */
export async function sharePdf(html: string, fileName: string, dialogTitle: string) {
  const { uri } = await Print.printToFileAsync({ html });
  const target = new File(Paths.cache, fileName);
  if (target.exists) target.delete();
  new File(uri).moveSync(target);
  await share(target.uri, 'application/pdf', dialogTitle);
}

export async function shareJson(json: string, fileName: string, dialogTitle: string) {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await share(file.uri, 'application/json', dialogTitle);
}

/** Lets the user pick a JSON file; resolves its text, or `null` when cancelled. */
export async function pickJsonText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  return new File(result.assets[0].uri).text();
}
