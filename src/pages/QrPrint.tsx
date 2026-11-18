import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrPrint() {
  const [url, setUrl] = useState(() => `${location.origin}/game`);
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setSvg).catch(() => setSvg(''));
  }, [url]);
  return (
    <div>
      <div className="no-print mb-4">
        <h1 className="mb-2 font-score text-4xl tracking-wider">Print QR code</h1>
        <label className="mb-1 block text-sm font-bold uppercase text-white/80">Target URL</label>
        <input className="input mb-3" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn-ball w-full" onClick={() => window.print()}>🖨️ Print</button>
        <p className="mt-2 text-xs text-white/70">Tip: open this page on the real (deployed) address so the URL is filled in automatically.</p>
      </div>
      <div className="mx-auto max-w-md rounded-3xl border-8 border-wood bg-white p-6 text-center text-black">
        <div className="font-score text-5xl tracking-wider text-felt-dark">⚽ AIBE FOOSBALL LEAGUE</div>
        <div className="my-3 font-bold">Scan · Pick players · Enter result</div>
        <div className="mx-auto w-full max-w-xs [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <ol className="mx-auto mt-3 max-w-xs list-decimal pl-5 text-left text-sm">
          <li>Scan the QR code</li>
          <li>New? Register quickly &amp; pick an avatar</li>
          <li>Choose teams, enter the result, done!</li>
        </ol>
        <div className="mt-3 break-all text-xs text-gray-500">{url}</div>
      </div>
    </div>
  );
}
