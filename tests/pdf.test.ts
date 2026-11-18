import { buildGameHtml } from '../src/pdf/buildGameHtml';
import { pdfFileName } from '../src/pdf/exportPdf';
import { updatePitcher } from '../src/model/game';
import { homeSignature, sampleGame, storeWithMemory, visitorSignature } from './helpers';

jest.mock('expo-print', () => ({}));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-file-system', () => ({}));

function signed() {
  const { store } = storeWithMemory([sampleGame()]);
  const id = Object.keys(store.getGames())[0];
  store.signGame(id, 'visitor', visitorSignature);
  store.signGame(id, 'home', homeSignature);
  return { store, id };
}

const svgCount = (html: string) => (html.match(/<svg /g) ?? []).length;

describe('PDF', () => {
  it('keeps the unofficial-record disclaimer and the existing sections', () => {
    const html = buildGameHtml(sampleGame());
    expect(html).toContain('Pitch Count Game Log');
    expect(html).toContain('This is not an official');
    expect(html).toContain('or approved form of any state association or league.');
    expect(html).toContain('Visiting team head coach signature');
    expect(html).toContain('Home team head coach signature');
    expect(html).toContain('<td class="num">118</td>'); // both team totals
  });

  it('a signed report contains both coaches’ real signatures and names', () => {
    const { store, id } = signed();
    const html = buildGameHtml(store.getGame(id)!);
    expect(svgCount(html)).toBe(2);
    for (const stroke of [...visitorSignature.strokes, ...homeSignature.strokes]) {
      expect(html).toContain(`<path d="${stroke}" />`);
    }
    expect((html.match(/<path /g) ?? []).length).toBe(4);
    expect(html).toContain('Pat Visitor');
    expect(html).toContain('Sam Home');
    expect(html).toContain('Signed by both head coaches');
  });

  it('after a change, the PDF has no signatures until both coaches sign again', () => {
    const { store, id } = signed();
    store.updateGame(id, (g) => updatePitcher(g, 'home', g.home.pitchers[0].id, (p) => ({ ...p, pitches: 97 })));
    let html = buildGameHtml(store.getGame(id)!);
    expect(svgCount(html)).toBe(0);
    expect(html).not.toContain('Pat Visitor');
    expect(html).toContain('Not signed');

    store.signGame(id, 'visitor', visitorSignature);
    html = buildGameHtml(store.getGame(id)!);
    expect(svgCount(html)).toBe(1);
    expect(html).toContain('Signed by the visiting team head coach only');
  });

  it('never trusts stored signature data that is not plain line drawing', () => {
    const { store, id } = signed();
    const game = store.getGame(id)!;
    const evil = {
      ...game,
      signatures: {
        ...game.signatures,
        home: { ...game.signatures.home!, strokes: ['M0 0"/><script>alert(1)</script><path d="M0 0'] },
      },
    };
    const html = buildGameHtml(evil);
    expect(html).not.toContain('<script>');
  });

  it('escapes and wraps long team names', () => {
    const game = { ...sampleGame(), visitor: { ...sampleGame().visitor, name: 'St. Mary’s <Academy> & Prep School Varsity Baseball Club' } };
    const html = buildGameHtml(game);
    expect(html).toContain('St. Mary’s &lt;Academy&gt; &amp; Prep School Varsity Baseball Club');
    expect(html).toContain('overflow-wrap: anywhere');
    const name = pdfFileName(game);
    expect(name).toMatch(/^PitchCount_2026-11-14_St-Mary-s-Academy-Prep-School_at_Central-High_Unsigned\.pdf$/);
  });

  it('names a fully signed file so it is easy to tell apart', () => {
    const { store, id } = signed();
    expect(pdfFileName(store.getGame(id)!)).toBe('PitchCount_2026-11-14_East-Wake-Warriors_at_Central-High_Signed.pdf');
  });
});

describe('signature sizing', () => {
  it('crops the PDF signature to the inked area so it fills the line', () => {
    const { inkBox } = jest.requireActual('../src/model/signature');
    expect(inkBox(['M100 50 L200 90'], 340, 220)).toEqual({ x: 92, y: 42, width: 116, height: 56 });
    expect(inkBox([], 340, 220)).toEqual({ x: 0, y: 0, width: 340, height: 220 });
  });
});
