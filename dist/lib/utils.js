import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function ansiToHtml(text) {
    if (!text) {
        return '';
    }
    const codes = {
        '0': 'color:inherit;font-weight:normal;font-style:normal;text-decoration:none;opacity:1;background-color:inherit;',
        '1': 'font-weight:bold',
        '2': 'opacity:0.6',
        '3': 'font-style:italic',
        '4': 'text-decoration:underline',
        '30': 'color:#000', // black
        '31': 'color:#d00', // red
        '32': 'color:#0a0', // green
        '33': 'color:#aa0', // yellow
        '34': 'color:#00d', // blue
        '35': 'color:#a0a', // magenta
        '36': 'color:#0aa', // cyan
        '37': 'color:#aaa', // light grey
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
        '90': 'color:#555', // dark grey
        '91': 'color:#f55', // light red
        '92': 'color:#5f5', // light green
        '93': 'color:#ff5', // light yellow
        '94': 'color:#55f', // light blue
        '95': 'color:#f5f', // light magenta
        '96': 'color:#5ff', // light cyan
        '97': 'color:#fff', // white
    };
    let currentStylesArray = []; // Store styles as an array to manage order and reset
    let html = '';
    let openSpan = false;
    const applyStyles = () => {
        if (openSpan) {
            html += '</span>';
            openSpan = false;
        }
        if (currentStylesArray.length > 0) {
            // Filter out potential empty strings or duplicates if any advanced logic added later
            const styleString = currentStylesArray.filter(s => s).join(';');
            if (styleString) {
                html += `<span style="${styleString}">`;
                openSpan = true;
            }
        }
    };
    const resetAndApplyNewCodes = (newCodesStr) => {
        const newCodes = newCodesStr.split(';');
        if (newCodes.includes('0')) { // Full reset
            currentStylesArray = []; // codes['0'] implies full reset, but we'll explicitly clear
            if (codes['0'])
                currentStylesArray.push(codes['0']); // Add base reset style
        }
        for (const code of newCodes) {
            if (code === '0')
                continue; // Already handled by full reset
            if (codes[code]) {
                // For simplicity, we'll just add. More complex logic could replace specific properties.
                // e.g., if 'color:red' exists and 'color:blue' comes, replace.
                // For now, last one wins if browser merges CSS correctly, or add more specific handling.
                if (code === '39') { // reset foreground
                    currentStylesArray = currentStylesArray.filter(s => !s.startsWith('color:'));
                    currentStylesArray.push('color:inherit');
                }
                else if (code === '49') { // reset background
                    currentStylesArray = currentStylesArray.filter(s => !s.startsWith('background-color:'));
                    currentStylesArray.push('background-color:inherit');
                }
                else {
                    currentStylesArray.push(codes[code]);
                }
            }
            else if (code.startsWith('38;2;') || code.startsWith('48;2;')) {
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
    // Using a simpler regex that captures content between \x1b[...m and the next \x1b[ or end of string.
    // And also handle isolated reset codes.
    const segments = text.split(/(\x1b\[[0-9;]*m)/g);
    for (const segment of segments) {
        if (!segment)
            continue;
        if (segment.startsWith('\x1b[') && segment.endsWith('m')) {
            const command = segment.slice(2, -1);
            resetAndApplyNewCodes(command);
        }
        else {
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
export function getAssetPath(jsonPath, userProjectDir // e.g., /Users/me/my-playwright-project
) {
    if (!jsonPath || typeof jsonPath !== 'string' || jsonPath.trim() === '') {
        return '#';
    }
    const trimmedJsonPath = jsonPath.trim().replace(/\\/g, '/');
    if (trimmedJsonPath.startsWith('data:') || trimmedJsonPath.startsWith('http://') || trimmedJsonPath.startsWith('https://') || trimmedJsonPath.startsWith('file:///')) {
        return trimmedJsonPath;
    }
    if (!userProjectDir) {
        // Fallback to web path if userProjectDir isn't available for file:///
        let webPath = trimmedJsonPath;
        if (webPath.startsWith('/'))
            webPath = webPath.substring(1);
        if (!webPath.startsWith('pulse-report/')) {
            if (webPath.includes('/') && (webPath.startsWith('attachments/') || webPath.startsWith('videos/') || webPath.startsWith('traces/'))) {
                webPath = `pulse-report/${webPath}`;
            }
            else if (!webPath.includes('/')) {
                webPath = `pulse-report/${webPath}`;
            }
        }
        return `/${webPath}`;
    }
    const normalizedUserProjectDir = userProjectDir.replace(/\\/g, '/');
    let reportDirBasePath = normalizedUserProjectDir;
    if (!reportDirBasePath.endsWith('/')) {
        reportDirBasePath += '/';
    }
    // Assuming 'pulse-report' is the direct subdirectory in userProjectDir containing attachments etc.
    reportDirBasePath += 'pulse-report';
    let absoluteFsPath = reportDirBasePath;
    if (!absoluteFsPath.endsWith('/')) {
        absoluteFsPath += '/';
    }
    absoluteFsPath += trimmedJsonPath;
    absoluteFsPath = absoluteFsPath.replace(/\/\/\/\//g, '//').replace(/\/\/\//g, '/').replace(/\/\//g, '/');
    if (absoluteFsPath.match(/^[a-zA-Z]:\//)) { // Windows path like C:/...
        return `file:///${absoluteFsPath}`;
    }
    else { // POSIX-like path, ensure it starts with a slash for file:///
        const finalPath = absoluteFsPath.startsWith('/') ? absoluteFsPath : `/${absoluteFsPath}`;
        return `file://${finalPath}`; // This will form file:///path/to/file
    }
}
//# sourceMappingURL=utils.js.map