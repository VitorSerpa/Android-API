import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';

/** Web preview: PDFs go through the browser's print dialog ("Salvar como PDF"), JSON is downloaded. */

export async function sharePdf(html: string, _fileName: string, _dialogTitle: string) {
  await Print.printAsync({ html });
}

export async function shareJson(json: string, fileName: string, _dialogTitle: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function pickJsonText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return asset.file ? asset.file.text() : (await fetch(asset.uri)).text();
}
