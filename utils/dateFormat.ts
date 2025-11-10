/**
 * Formats a date string (ISO format or YYYY-MM-DD) to a user-friendly format
 * @param dateString - Date string in ISO format (e.g., "2025-11-10T00:00:00.000Z") or YYYY-MM-DD format
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDisplayDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  
  try {
    // Handle ISO format strings
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // If invalid, try to parse as YYYY-MM-DD
      const parts = dateString.split('T')[0].split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
      return dateString;
    }
    
    // Format as DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

