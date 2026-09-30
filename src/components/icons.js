const paths = {
  leaf: '<path d="M19 4C9 3 3 8 5 15c2 7 14 6 14-11Z"/><path d="m5 20 9-10M9 15l-1-4m4 1 4 1"/>',
  home: '<path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10"/>',
  hand: '<path d="M8 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2"/>',
  music:
    '<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
  book: '<path d="M12 5v16M12 5C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-4-1-7-1-10 1Z"/>',
  chart: '<path d="M4 4v16h17M8 15v-4m5 4V7m5 8v-6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  mic: '<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
  volume:
    '<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield:
    '<path d="m12 2 8 3v6c0 6-8 11-8 11S4 17 4 11V5l8-3Z"/><path d="m8 11 3 3 5-5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5m0 3h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l1 1m14 14 1 1M4 20l1-1M19 5l1-1"/>',
  sparkle:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  headphone:
    '<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.music}</svg>`;
export const logo =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M11 30V12m9 19V7m9 21V14M7 19h8m1-5h8m1 8h8M7 26h8m1-3h8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
