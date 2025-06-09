import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ansiToHtml(text: string | null | undefined): string {
  if (!text) {
    return '';
  }

  const codes: Record<string, string> = {
    '0': 'color:inherit;font-weight:normal;font-style:normal;text-decoration:none;opacity:1;', // Added opacity reset
    '1': 'font-weight:bold',
    '2': 'opacity:0.6',
    '3': 'font-style:italic',
    '4': 'text-decoration:underline',
    '30': 'color:#000',    // black
    '31': 'color:#d00',    // red
    '32': 'color:#0a0',    // green
    '33': 'color:#aa0',    // yellow
    '34': 'color:#00d',    // blue
    '35': 'color:#a0a',    // magenta
    '36': 'color:#0aa',    // cyan
    '37': 'color:#aaa',    // light grey
    '39': 'color:inherit', // default foreground color
    '40': 'background-color:#000', // black background
    '41': 'background-color:#d00', // red background
    '42': 'background-color:#0a0', // green background
    '43': 'background-color:#aa0', // yellow background
    '44': 'background-color:#00d', // blue background
    '45': 'background-color:#a0a', // magenta background
    '46': 'background-color:#0aa', // cyan background
    '47': 'background-color:#aaa', // light grey background
    '49': 'background-color:inherit', // default background color
    '90': 'color:#555',    // dark grey
    '91': 'color:#f55',    // light red
    '92': 'color:#5f5',    // light green
    '93': 'color:#ff5',    // light yellow
    '94': 'color:#55f',    // light blue
    '95': 'color:#f5f',    // light magenta
    '96': 'color:#5ff',    // light cyan
    '97': 'color:#fff',    // white
  };

  let currentStyles: Record<string, string> = {};
  let html = '';
  let openSpan = false;

  const resetAndApplyStyles = (newCodesStr: string) => {
    let styleString = '';
    if (openSpan) {
      html += '</span>';
      openSpan = false;
    }
    
    const newCodes = newCodesStr.split(';');
    if (newCodes.includes('0')) {
      currentStyles = {}; // Full reset
    }

    for (const code of newCodes) {
      if (codes[code]) {
        const [prop, value] = codes[code].split(':');
        if (prop && value) {
           // Handle resets for specific properties if needed, e.g. 'color:inherit' should overwrite previous color
          if (value.includes('inherit') || prop === 'font-weight' && value.includes('normal')) {
             // more fine-grained reset logic could be added here
          }
          currentStyles[prop] = value;
        }
      } else if (code.startsWith('38;2;') || code.startsWith('48;2;')) { // True color foreground/background
        const parts = code.split(';');
        const type = parts[0] === '38' ? 'color' : 'background-color';
        if (parts.length === 5) { // r;g;b
          currentStyles[type] = `rgb(${parts[2]},${parts[3]},${parts[4]})`;
        }
      } else if (code.startsWith('38;5;') || code.startsWith('48;5;')) { // 256 color palette - simplified, map to nearest standard if possible or ignore
        // Basic handling: just note it, full 256 color mapping is complex for CSS
        // For now, we'll let these pass through without specific styling or map to a default.
      }
    }

    styleString = Object.entries(currentStyles)
      .map(([prop, val]) => `${prop}:${val}`)
      .join(';');

    if (styleString) {
      html += `<span style="${styleString}">`;
      openSpan = true;
    }
  };

  const segments = text.split(/(\x1b\[[0-9;]*[mJKHfABCDsu])|(\x1b\[\?25[hl])/g);

  for (const segment of segments) {
    if (!segment) continue;

    if (segment.startsWith('\x1b[')) {
      const command = segment.slice(2, -1); // Remove \x1b[ and final char (m, H, etc.)
      const type = segment.slice(-1);

      if (type === 'm') {
        resetAndApplyStyles(command);
      } else if (type === 'K') { // Erase line
        // Typically not directly translated to HTML display unless it's about clearing previous content.
        // For static display, might not need specific handling or could clear current line if stateful.
      }
      // Add more command handlers if needed (J, H, A, B, C, D, s, u, ?25h, ?25l)
      // For now, focusing on 'm' styling commands.
    } else {
      // Escape HTML special characters in the content itself
      const escapedContent = segment
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      html += escapedContent;
    }
  }

  if (openSpan) {
    html += '</span>'; // Close any unclosed span
  }

  return html;
}
