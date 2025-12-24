export default async function ItemPage({ params }: { params: Promise<{ itemId: string }> }) {
    const { itemId } = await params;
    return <div>Item Detail: {itemId}</div>;
}
