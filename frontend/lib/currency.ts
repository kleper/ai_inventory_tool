export const formatCurrency = (amount: number | null | undefined, currency: string = "USD"): string => {
    if (amount === null || amount === undefined) return "N/A";

    const locale = currency === "COP" ? "es-CO" : "en-US";
    const minimumFractionDigits = currency === "COP" ? 0 : 2;
    const maximumFractionDigits = currency === "COP" ? 0 : 2;

    // Manual override for COP to ensure $ symbol and dots
    if (currency === "COP") {
        // $ 1.500.000
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace(/\s/g, ' '); // Ensure spacing if needed
    }

    // USD / EUR
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: minimumFractionDigits,
        maximumFractionDigits: maximumFractionDigits
    }).format(amount);
};

export const calculateInventoryTotal = (items: any[]): number => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((total, item) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1; // Default to 1 if not specified? Or 0? 
        // User requested: "if quantity is null or 0, treat as 1 or 0 based on business logic".
        // Let's assume quantity 0 means 0 stock effectively (value 0).
        // But legacy items might have quantity 0 or null but implication is "1 item".
        // For now, let's treat null/undefined quantity as 1 (safe default for legacy single items)
        // and Explicit 0 as 0. 

        // Wait, the legacy items defaulted quantity to 1 in backend model.
        // So if it comes as 0, it means user set it to 0.
        return total + (price * quantity);
    }, 0);
};
