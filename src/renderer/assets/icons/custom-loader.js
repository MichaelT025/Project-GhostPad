/**
 * Custom Icon Loader
 * Dynamically loads custom SVG icons from the custom-icons directory
 */

/**
 * Load all custom icons from the custom-icons directory
 * @returns {Object} Object mapping icon names to SVG strings
 */
export async function loadCustomIcons() {
  const customIcons = {};
  
  try {
    // In Electron, we can use fs to read the directory
    if (window.electronAPI && window.electronAPI.loadCustomIcons) {
      const icons = await window.electronAPI.loadCustomIcons();
      return icons;
    }
    
    // Fallback: return empty object if no custom icons available
    console.log('Custom icon loading not available in this environment');
    return customIcons;
  } catch (error) {
    console.error('Failed to load custom icons:', error);
    return customIcons;
  }
}

/**
 * Register a custom icon manually
 * @param {string} name - Icon name (without .svg extension)
 * @param {string} svgContent - SVG content as string
 */
export function registerCustomIcon(name, svgContent) {
  // This will be merged with the main icons object
  return { [name]: svgContent };
}

/**
 * Load custom icon from file path
 * @param {string} filePath - Path to SVG file
 * @returns {Promise<string>} SVG content
 */
export async function loadCustomIconFromFile(filePath) {
  try {
    if (window.electronAPI && window.electronAPI.readFile) {
      const content = await window.electronAPI.readFile(filePath);
      return content;
    }
    
    // Fallback for web context
    const response = await fetch(filePath);
    return await response.text();
  } catch (error) {
    console.error(`Failed to load custom icon from ${filePath}:`, error);
    return '';
  }
}

export default {
  loadCustomIcons,
  registerCustomIcon,
  loadCustomIconFromFile
};
