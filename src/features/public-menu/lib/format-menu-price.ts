const penFormatter = new Intl.NumberFormat("es-PE", {
	style: "currency",
	currency: "PEN",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function formatMenuPrice(price: string): string {
	const amount = Number(price);

	return Number.isFinite(amount) ? penFormatter.format(amount) : price;
}
