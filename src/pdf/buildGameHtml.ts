import { parsePitches, teamTotal } from '../game';
import { Game, TeamEntry } from '../types';

// Builds the HTML page that expo-print turns into a PDF.
// This file has no React Native code in it, so the layout can be changed and
// previewed without touching the rest of the app.

/** Makes typed text safe to place inside HTML (a team called "A&M <JV>" must not break the page). */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function teamTable(heading: string, team: TeamEntry): string {
  const rows = team.pitchers
    .map(
      (pitcher, index) => `
        <tr>
          <td class="num">${index + 1}</td>
          <td>${escapeHtml(pitcher.name.trim())}</td>
          <td class="num">${escapeHtml(pitcher.jersey.trim())}</td>
          <td class="num">${parsePitches(pitcher.pitches) ?? ''}</td>
        </tr>`
    )
    .join('');

  return `
    <section class="team">
      <h2>${heading}: ${escapeHtml(team.name.trim())}</h2>
      <table>
        <thead>
          <tr>
            <th class="num narrow"></th>
            <th>Pitcher</th>
            <th class="num narrow">Jersey #</th>
            <th class="num medium">Total pitches</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3">Team total</td>
            <td class="num">${teamTotal(team)}</td>
          </tr>
        </tfoot>
      </table>
    </section>`;
}

function signatureBlock(role: string, teamName: string): string {
  return `
    <div class="signature">
      <div class="sig-line"></div>
      <div class="sig-label">${role} head coach signature</div>
      <div class="sig-team">${escapeHtml(teamName.trim())}</div>
    </div>`;
}

export function buildGameHtml(game: Game, generatedAt: Date = new Date()): string {
  const level = game.level.trim();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, Helvetica, Arial, sans-serif;
    font-size: 12pt;
    color: #111;
  }
  h1 { font-size: 20pt; margin: 0 0 4pt; }
  .notice { font-size: 9pt; color: #555; margin: 0 0 14pt; }
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 6pt; }
  .meta td { padding: 3pt 0; border: none; font-size: 12pt; }
  .meta .label { color: #555; width: 90pt; }
  h2 { font-size: 13pt; margin: 16pt 0 6pt; }
  .team { page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; }
  .team th, .team td { border: 1pt solid #444; padding: 5pt 7pt; text-align: left; }
  .team th { background: #eee; font-size: 10pt; }
  .team tfoot td { font-weight: bold; }
  .num { text-align: center !important; }
  .narrow { width: 60pt; }
  .medium { width: 100pt; }
  .signatures { margin-top: 34pt; page-break-inside: avoid; }
  .signatures table td { width: 50%; padding: 0 12pt 0 0; vertical-align: top; }
  .sig-line { border-bottom: 1pt solid #111; height: 48pt; }
  .sig-label { font-size: 9pt; color: #555; margin-top: 3pt; }
  .sig-team { font-size: 11pt; }
  .footer { margin-top: 22pt; font-size: 8pt; color: #777; }
</style>
</head>
<body>
  <h1>Pitch Count Game Log</h1>
  <p class="notice">
    Unofficial record created with the Pitch Counter app. This is not an official
    or approved form of any state association or league.
  </p>

  <table class="meta">
    <tr><td class="label">Game date</td><td>${escapeHtml(game.date.trim())}</td></tr>
    ${level ? `<tr><td class="label">Level</td><td>${escapeHtml(level)}</td></tr>` : ''}
    <tr><td class="label">Visiting team</td><td>${escapeHtml(game.visitor.name.trim())}</td></tr>
    <tr><td class="label">Home team</td><td>${escapeHtml(game.home.name.trim())}</td></tr>
  </table>

  ${teamTable('Visiting team', game.visitor)}
  ${teamTable('Home team', game.home)}

  <div class="signatures">
    <table>
      <tr>
        <td>${signatureBlock('Visiting team', game.visitor.name)}</td>
        <td>${signatureBlock('Home team', game.home.name)}</td>
      </tr>
    </table>
  </div>

  <p class="footer">Generated ${escapeHtml(generatedAt.toLocaleString())}</p>
</body>
</html>`;
}
