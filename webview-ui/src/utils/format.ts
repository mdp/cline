export function formatLargeNumber(num: number): string {
    // For numbers >= 1000, use compact notation with 1 decimal place
    if (num >= 1000) {
        const formatter = new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1,
            minimumFractionDigits: 1
        })
        return formatter.format(num).toLowerCase()
    }
    
    // For numbers < 1000, use regular integer formatting
    return num.toString()
}
