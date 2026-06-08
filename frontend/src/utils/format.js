export function formatDate(dateStr) {
    if (!dateStr)
        return '';
    return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}
export function formatDateTime(dateStr) {
    if (!dateStr)
        return '';
    return new Date(dateStr).toLocaleString('zh-CN');
}
