export function formatMoney(value, rate, currency) {
    const money = Number(value);
    const newMoney = rate ? money * rate : money;
    const unit = currency === 'THB' ? 'บาท' : currency;
    return `${newMoney.toFixed(2)} ${unit}`;
}

export const formatDate = (value) => new Date(value).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
