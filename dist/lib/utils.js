import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import AnsiToHtml from 'ansi-to-html'; // Recommended: npm install ansi-to-html
const ansiConverter = new AnsiToHtml({
    fg: '#000', // Default foreground color
    bg: '#FFF', // Default background color
    newline: true, // Convert \n to <br/>
    escapeXML: true, // Escape HTML entities
    // You can customize colors further if needed
    // colors: { ... }
});
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
    let currentStylesArray = [];
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
    const resetAndApplyNewCodes = (newCodesStr) => {
        const newCodes = newCodesStr.split(';');
        if (newCodes.includes('0')) {
            currentStylesArray = [];
            if (codes['0'])
                currentStylesArray.push(codes['0']);
        }
        for (const code of newCodes) {
            if (code === '0')
                continue;
            if (codes[code]) {
                if (code === '39') {
                    currentStylesArray = currentStylesArray.filter(s => !s.startsWith('color:'));
                    currentStylesArray.push('color:inherit');
                }
                else if (code === '49') {
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
/**
 * Converts a string containing ANSI escape codes into a plain text string.
 * It does this by splitting the string by the escape codes and only keeping
 * the segments that are not escape codes.
 *
 * @param text The input string, possibly containing ANSI codes.
 * @returns A plain text string with all ANSI codes removed.
 */
export function ansiToText(text) {
    // Return an empty string if the input is null, undefined, or empty.
    if (!text) {
        return '';
    }
    // This regex is the same as in your ansiToHtml function.
    // It splits the string by ANSI escape codes, keeping the codes in the resulting array.
    // e.g., "\x1b[31mHello\x1b[0m" -> ["", "\x1b[31m", "Hello", "\x1b[0m", ""]
    const segments = text.split(/(\x1b\[[0-9;]*m)/g);
    let plainText = '';
    for (const segment of segments) {
        // If the segment is an ANSI escape code, we simply ignore it.
        if (segment.startsWith('\x1b[') && segment.endsWith('m')) {
            continue;
        }
        // Otherwise, it's a plain text segment that we want to keep.
        plainText += segment;
    }
    return plainText;
}
/**
 * Generates the correct public URL for an asset.
 * It expects the input path to be relative to the 'pulse-report' directory,
 * or specifically, if it starts with 'attachments/', it assumes it's relative
 * from 'pulse-report/attachments/'.
 * @param pathFromReport The path string from the report data.
 *                       e.g., "attachments/folder/image.png" or "folder/image.png" if attachments is implied.
 * @returns A string URL to fetch the asset, or "#" if the path is invalid.
 */
export function getAssetPath(pathFromReport) {
    if (!pathFromReport || typeof pathFromReport !== 'string' || pathFromReport.trim() === '') {
        return '#';
    }
    let cleanRelativePath = pathFromReport.trim();
    // Define the known prefix that might be included in the report paths
    const attachmentsPrefix = "attachments/";
    const attachmentsPrefixBackslash = "attachments\\"; // Handle Windows-style paths just in case
    // If the path from the report starts with "attachments/", strip it.
    if (cleanRelativePath.toLowerCase().startsWith(attachmentsPrefix)) {
        cleanRelativePath = cleanRelativePath.substring(attachmentsPrefix.length);
    }
    else if (cleanRelativePath.toLowerCase().startsWith(attachmentsPrefixBackslash)) {
        cleanRelativePath = cleanRelativePath.substring(attachmentsPrefixBackslash.length);
    }
    // Remove any leading slashes from the now potentially stripped path,
    // as our API route structure will effectively add one.
    cleanRelativePath = cleanRelativePath.replace(/^[\/\\]+/, '');
    // If the path became empty after stripping (e.g., it was just "attachments/"), return non-functional path
    if (cleanRelativePath === '') {
        return '#';
    }
    return `/api/assets/${cleanRelativePath}`;
}
//# sourceMappingURL=utils.js.map