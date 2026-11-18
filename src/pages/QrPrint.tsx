import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrPrint() {
  const [url, setUrl] = useState(() => `${location.origin}/spiel`);
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, width: 480, errorCorrectionLevel: 'M' }).then(setSvg).catch(() => setSvg(''));
  }, [url]);
  return (
    <div>
      <div className="no-print mb-4">
        <h1 className="mb-2 font-score text-4xl tracking-wider">QR-Code drucken</h1>
        <label className="mb-1 block text-sm font-bold uppercase text-white/80">Ziel-URL</label>
        <input className="input mb-3" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn-ball w-full" onClick={() => window.print()}>🖨️ Drucken</button>
        <p className="mt-2 text-xs text-white/70">Tipp: Nach dem Deployment diese Seite unter der echten Adresse öffnen, dann stimmt die URL automatisch.</p>
      </div>
      <div className="mx-auto max-w-md rounded-3xl border-8 border-wood bg-white p-6 text-center text-black">
        <div className="font-score text-5xl tracking-wider text-felt-dark">⚽ AIBE KICKER-LIGA</div>
        <div className="my-3 font-bold">Scannen · Spieler wählen · Ergebnis eintragen</div>
        <div className="mx-auto w-full max-w-xs" dangerouslySetInnerHTML={{ __html: svg }} />
        <ol className="mx-auto mt-3 max-w-xs list-decimal pl-5 text-left text-sm">
          <li>QR-Code scannen</li>
          <li>Neu? Kurz registrieren &amp; Avatar wählen</li>
          <li>Teams wählen, Ergebnis eintragen, fertig!</li>
        </ol>
        <div className="mt-3 break-all text-xs text-gray-500">{url}</div>
      </div>
    </div>
  );
}
