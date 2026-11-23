# Global Market Monitor

Source mirror recovered from the Vercel deployment for `ihsg-stock-monitor`.

## Layout
- `src/index.html` is the browser entrypoint.
- `src/api/` contains the Vercel API handlers.
- `page-chunks/` contains the gzip-compressed dashboard page recovered from the active deployment. The entrypoint fetches these public raw GitHub files and expands them in the browser before rendering.

## M2 data
`/api/money-supply` returns US and Indonesia Broad Money from the World Bank (annual observations used as an M2 proxy). This is not a monthly official M2 series.

## Vercel Git connection
To enable automatic deployments from this repository, connect `bejocui/game` to the existing Vercel project `ihsg-stock-monitor` in Vercel Project Settings → Git. Set the Root Directory to `src`. The GitHub integration must first be installed/authorized for the Vercel team `bejo7`.
