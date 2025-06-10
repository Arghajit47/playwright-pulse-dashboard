
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
    '0': 'color:inherit;font-weight:normal;font-style:normal;text-decoration:none;opacity:1;background-color:inherit;',
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

  let currentStylesArray: string[] = []; 
  let html = '';
  let openSpan = false;

  const applyStyles = () => {
    if (openSpan) {
      html += '</span>';
      openSpan = false;
    }
    if (currentStylesArray.length > 0) {
      const styleString = currentStylesArray.filter(s => s).join(';');
      if (styleString) {
        html += `<span style="${styleString}">`;
        openSpan = true;
      }
    }
  };
  
  const resetAndApplyNewCodes = (newCodesStr: string) => {
    const newCodes = newCodesStr.split(';');
    
    if (newCodes.includes('0')) { 
      currentStylesArray = []; 
      if (codes['0']) currentStylesArray.push(codes['0']); 
    }

    for (const code of newCodes) {
      if (code === '0') continue; 

      if (codes[code]) {
        if(code === '39') { 
            currentStylesArray = currentStylesArray.filter(s => !s.startsWith('color:'));
            currentStylesArray.push('color:inherit');
        } else if (code === '49') { 
            currentStylesArray = currentStylesArray.filter(s => !s.startsWith('background-color:'));
            currentStylesArray.push('background-color:inherit');
        } else {
             currentStylesArray.push(codes[code]);
        }
      } else if (code.startsWith('38;2;') || code.startsWith('48;2;')) { 
        const parts = code.split(';');
        const type = parts[0] === '38' ? 'color' : 'background-color';
        if (parts.length === 5) { 
          currentStylesArray = currentStylesArray.filter(s => !s.startsWith(type + ':'));
          currentStylesArray.push(`${type}:rgb(${parts[2]},${parts[3]},${parts[4]})`);
        }
      }
    }
    applyStyles();
  };

  const segments = text.split(/(\x1b\[[0-9;]*m)/g);

  for (const segment of segments) {
    if (!segment) continue;

    if (segment.startsWith('\x1b[') && segment.endsWith('m')) {
      const command = segment.slice(2, -1);
      resetAndApplyNewCodes(command);
    } else {
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
    html += '</span>'; 
  }

  return html;
}


export function getAssetPath(
  jsonPath: string | undefined | null
): string {
  if (!jsonPath || typeof jsonPath !== 'string' || jsonPath.trim() === '') {
    return '#'; // Return a non-functional link for empty/invalid paths
  }
  const trimmedJsonPath = jsonPath.trim().replace(/\\/g, '/');

  // If it's already a fully qualified data URI or HTTP/HTTPS URL, return as is.
  if (trimmedJsonPath.startsWith('data:') || trimmedJsonPath.startsWith('http://') || trimmedJsonPath.startsWith('https://')) {
    return trimmedJsonPath;
  }

  let webPath = trimmedJsonPath;

  // Remove any leading slashes from jsonPath first to avoid double slashes if pulse-report/ is prepended.
  if (webPath.startsWith('/')) {
    webPath = webPath.substring(1);
  }

  if (!webPath.startsWith('pulse-report/')) {
    // If it's 'attachments/foo.png', 'videos/bar.mp4', 'traces/baz.zip'
    if (webPath.startsWith('attachments/') || webPath.startsWith('videos/') || webPath.startsWith('traces/')) {
        webPath = `pulse-report/${webPath}`;
    } else if (!webPath.includes('/')) { // Bare filename e.g. 'screenshot.png'
        webPath = `pulse-report/attachments/${webPath}`; // Assume it's a screenshot/attachment
    } else {
        // Path like 'some_other_folder/image.png' - less common from Playwright.
        // Prepend pulse-report to be safe, assuming it's relative to the report root.
        webPath = `pulse-report/${webPath}`;
    }
  }
  // Ensure it starts with a single slash for a root-relative URL
  return webPath.startsWith('/') ? webPath : `/${webPath}`;
}
