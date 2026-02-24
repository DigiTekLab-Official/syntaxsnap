import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { html } from 'satori-html';
import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { TOOLS } from '../../config/tools';

// 1. Build a PNG for every tool slug in the registry
export async function getStaticPaths() {
  return TOOLS.map((t) => ({ params: { slug: t.id } }));
}

// 2. The dynamic generation function
export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;

  // Format the slug: 'ts-to-zod' -> 'Ts To Zod' -> 'TS To Zod'
  let title = slug 
    ? slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Developer Tools';

  // Quick acronym polish
  title = title
    .replace(/\bTs\b/g, 'TS')
    .replace(/\bJson\b/g, 'JSON')
    .replace(/\bSvg\b/g, 'SVG')
    .replace(/\bJwt\b/g, 'JWT')
    .replace(/\bSql\b/g, 'SQL')
    .replace(/\bTrpc\b/g, 'tRPC')
    .replace(/\bApi\b/g, 'API')
    .replace(/\bAi\b/g, 'AI')
    .replace(/\bGraphql\b/g, 'GraphQL')
    .replace(/\bOpenapi\b/g, 'OpenAPI')
    .replace(/\bJsx\b/g, 'JSX')
    .replace(/\bRegex\b/g, 'RegEx')
    .replace(/\bPydantic\b/g, 'Pydantic')
    .replace(/\bPrisma\b/g, 'Prisma');

  // Load the raw font data from your public folder
  const fontPath = path.resolve(process.cwd(), 'public/fonts/Inter-Bold.ttf');
  const fontData = fs.readFileSync(fontPath);

  // Define the sleek, dark-mode visual layout using the real SyntaxSnap logo
  const markup = html`
    <div style="height: 100%; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #0f172a; font-family: 'Inter';">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 2000" width="88" height="88" style="margin-right: 24px;">
          <path fill="#020617" d="M1000.52.15c159.74 0 319.48-.2 479.23.08 80.57.14 159.99 8.45 236.64 35.53 69.08 24.41 126.36 65.54 174.78 120.06 38.92 43.82 63.96 94.95 80.5 150.47 19.39 65.07 24.9 132.16 24.99 199.64.38 293.92.32 587.85.25 881.78-.01 46.73.89 93.56-1.86 140.16-2.31 39.06-7.99 78.07-14.52 116.71-18.37 108.62-70.9 197.39-159.23 263.73-54.94 41.26-118.45 63.45-185.16 76.74-26.74 5.33-53.93 11.78-80.94 11.9-346.29 1.49-692.59 1.92-1038.89 2.62-15.1.03-30.31 1.17-45.26-.33-31.17-3.12-62.32-6.91-93.26-11.79-57.72-9.12-112.44-27.76-163.15-56.84-89.18-51.15-151.54-125.16-185.19-222.54C9.41 1650.09.69 1589.8.49 1528.78c-.75-227.67-.39-455.35-.4-683.02 0-85.75-.12-171.51.33-257.26.28-53.12-1.41-106.48 2.97-159.3C12 325.4 40.56 227.82 112.91 148.95 167.67 89.26 234.34 47.59 313.08 25.23 378.04 6.76 444.27.51 511.2.29 674.3-.25 837.41.12 1000.51.12v.04Z" />
          <path fill="white" d="M371.87 994.88c51.81 52.43 102.17 103.77 152.96 154.67 55.78 55.91 112.77 110.63 167.73 167.33 51.73 53.37 29.17 140.04-40.77 160.42-30.62 8.92-59.77 3.71-83.96-17.19-19-16.42-35.6-35.6-53.36-53.45-35.08-35.24-70.29-70.35-105.33-105.63-73.18-73.69-146.62-147.12-219.29-221.31-51.63-52.7-51.46-121.93.34-174.66 57.24-58.27 115.5-115.53 173.15-173.41 62.63-62.88 125.06-125.94 187.56-188.94 27.07-27.29 59.41-39.11 97.05-29.41 37.52 9.67 62.03 35.28 71.25 72.24 8.57 34.38-3.43 65.1-27.88 90.12-30.77 31.48-62.46 62.07-93.71 93.08-68.48 67.94-136.97 135.87-205.36 203.91-7.32 7.28-13.98 15.22-20.37 22.23Zm1252.34.34c-39.31-39.83-78.53-79.94-118.17-119.64-65.56-65.67-131.36-131.11-197.11-196.58-20.9-20.81-33.15-45.64-32.75-75.31.43-31.68 17.74-55.09 41.37-73.79 38.22-30.25 87.19-26.66 123.88 9.5 60.33 59.46 119.98 119.62 179.83 179.56 61.76 61.85 123.48 123.73 185.11 185.71 24.9 25.04 39.87 54.5 38.67 90.72-1.01 30.35-11.23 57.34-32.53 79-66.71 67.83-133.84 135.27-200.97 202.68-47.68 47.87-95.68 95.42-143.42 143.23-10.45 10.46-20.05 21.77-30.63 32.09-25.4 24.78-55.81 36-90.11 24.75-35.97-11.8-60.18-37.54-69.02-74.87-7.48-31.61 1.35-59.75 24.42-82.93 47.92-48.12 96.08-95.99 143.89-144.22 59.39-59.91 118.52-120.08 177.56-179.92Z" />
          <path fill="#27b4f2" d="M835.1 1750.67c53.08-247.84 106.15-495.68 159.49-744.77H758.05c129.57-265.61 258.55-530.01 387.52-794.4-45.95 243.42-91.63 487.02-151.12 729.49 78.31-1.31 154.74-2.6 231.28-3.88-129.66 271.44-259.15 542.53-388.64 813.62-.67-.02-1.33-.03-2-.05Z" />
        </svg>
        <h1 style="font-size: 72px; color: white; font-weight: 800; margin: 0; display: flex;">
          Syntax<span style="color: #27b4f2;">Snap</span>
        </h1>
      </div>
      
      <h2 style="font-size: 56px; color: #f8fafc; font-weight: 700; margin: 20px 0; display: flex;">
        ${title}
      </h2>
      
      <p style="font-size: 32px; color: #94a3b8; margin-top: 30px; display: flex;">
        100% Private · Client-Side · Zero Server Round-Trips
      </p>
      
      <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 12px; display: flex; background: linear-gradient(90deg, #6366f1 0%, #27b4f2 100%);"></div>
    </div>
  `;

  // Parse HTML into SVG
  // satori-html returns a VNode; satori accepts it at runtime but the
  // types diverge, so we cast through `unknown` to silence TS.
  const svg = await satori(markup as unknown as React.ReactNode, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        data: fontData,
        weight: 700,
        style: 'normal',
      },
    ],
  });

  // Render SVG to highly optimized PNG
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(new Uint8Array(pngBuffer), {
    headers: {
      'Content-Type': 'image/png',
      // Tell browsers to cache this image aggressively 
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};