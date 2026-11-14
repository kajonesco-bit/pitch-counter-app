import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Game } from '../types';
import { buildGameHtml } from './buildGameHtml';

/** Turns "Central High (JV)" into "Central-High-JV" so it is safe in a file name. */
function fileSafe(text: string): string {
  return text.trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'Team';
}

function pdfFileName(game: Game): string {
  const [month, day, year] = game.date.trim().split('/');
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return `PitchCount_${date}_${fileSafe(game.visitor.name)}_at_${fileSafe(game.home.name)}.pdf`;
}

/**
 * Creates the PDF and keeps it in the app's own documents folder on the phone.
 * Returns the saved file. Creating the PDF again for the same game replaces the old file.
 */
export async function createGamePdf(game: Game): Promise<File> {
  // 1. expo-print renders the HTML to a PDF in a temporary folder (US Letter size).
  const printed = await Print.printToFileAsync({
    html: buildGameHtml(game),
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
  });

  // 2. Move it somewhere permanent, with a readable name.
  const folder = new Directory(Paths.document, 'pdfs');
  if (!folder.exists) folder.create({ intermediates: true });

  const saved = new File(folder, pdfFileName(game));
  await new File(printed.uri).move(saved, { overwrite: true });
  return saved;
}

/** Opens the iPhone share sheet (AirDrop, Mail, Messages, Save to Files, Print...). */
export async function sharePdf(file: File): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri);
}
