// pdfService
//
// Zero-dependency approach: renders the call sheet HTML into a new window
// and triggers the browser print dialog ("Save as PDF"). This avoids
// pulling in a heavy PDF-generation library while still satisfying the
// "Download PDF" requirement with zero build cost. Swap for a server-side
// renderer (e.g. @react-pdf/renderer or a headless-Chrome route) later if a
// one-click direct download is required.

export const pdfService = {
  printHtml(title: string, html: string) {
    const win = window.open("", "_blank", "width=850,height=1100");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 32px; color: #111; }
            h1, h2, h3 { margin: 0 0 8px 0; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
            td, th { border: 1px solid #ddd; padding: 6px 10px; font-size: 13px; text-align: left; }
            .section { margin-bottom: 20px; }
            .label { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  },
};
