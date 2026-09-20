/**
 * Lightweight HTML heuristics when JSON-LD is missing.
 * Best-effort only — prefer JSON-LD.
 */

import { Parser } from 'htmlparser2';

export interface HeuristicRecipeBits {
  title: string | null;
  ingredientCandidates: string[];
  stepCandidates: string[];
}

export function heuristicExtract(html: string): HeuristicRecipeBits {
  let title: string | null = null;
  let inTitle = false;
  let captureList = false;
  let listKind: 'ul' | 'ol' | null = null;
  let currentLi = '';
  const ingredientCandidates: string[] = [];
  const stepCandidates: string[] = [];
  let recentHeading = '';

  const parser = new Parser(
    {
      onopentag(name) {
        if (name === 'title') inTitle = true;
        if (name === 'h1' || name === 'h2' || name === 'h3') {
          recentHeading = '';
          (parser as unknown as { __capturingHeading?: boolean }).__capturingHeading = true;
        }
        if (name === 'ul' || name === 'ol') {
          captureList = true;
          listKind = name;
        }
        if (name === 'li' && captureList) currentLi = '';
      },
      ontext(text) {
        const t = text.replace(/\s+/g, ' ');
        if (inTitle) title = (title ?? '') + t;
        const self = parser as unknown as {
          __capturingHeading?: boolean;
          __headingBuf?: string;
        };
        if (self.__capturingHeading) {
          self.__headingBuf = (self.__headingBuf ?? '') + t;
        }
        if (captureList && currentLi !== undefined) currentLi += t;
      },
      onclosetag(name) {
        if (name === 'title') {
          inTitle = false;
          if (title) title = title.trim();
        }
        const self = parser as unknown as {
          __capturingHeading?: boolean;
          __headingBuf?: string;
        };
        if ((name === 'h1' || name === 'h2' || name === 'h3') && self.__capturingHeading) {
          recentHeading = (self.__headingBuf ?? '').trim().toLowerCase();
          self.__capturingHeading = false;
          self.__headingBuf = '';
        }
        if (name === 'li' && captureList) {
          const line = currentLi.trim();
          if (line) {
            if (/ingredient/.test(recentHeading) || listKind === 'ul') {
              ingredientCandidates.push(line);
            }
            if (/instruction|direction|method|step/.test(recentHeading) || listKind === 'ol') {
              stepCandidates.push(line);
            }
          }
          currentLi = '';
        }
        if (name === 'ul' || name === 'ol') {
          captureList = false;
          listKind = null;
        }
      },
    },
    { decodeEntities: true }
  );

  parser.write(html);
  parser.end();

  return { title, ingredientCandidates, stepCandidates };
}
