import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, Users } from "lucide-react";
import Link from "next/link";

interface InventoryFolderCardProps {
    group: {
        id: number;
        name: string;
        description?: string;
        item_count?: number;
        is_shared?: boolean;
    };
}

export function InventoryFolderCard({ group }: InventoryFolderCardProps) {
    return (
        <Link href={`/inventory/${group.id}`}>
            <Card className="h-full hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer group shadow-sm border-border/40">
                <CardHeader className="space-y-1 p-6">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2 group-hover:bg-blue-500/20 transition-colors">
                        <Folder className="w-5 h-5 text-blue-500" />
                    </div>
                    <CardTitle className="text-xl font-bold tracking-tight line-clamp-1">
                        {group.name}
                    </CardTitle>
                    {group.description && (
                        <CardDescription className="line-clamp-2">
                            {group.description}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    {/* Add any additional info here if needed */}
                </CardContent>
                <CardFooter className="p-6 pt-0 flex justify-between items-center text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        {group.item_count || 0} items
                    </span>
                    {group.is_shared ? (
                        <Badge variant="secondary" className="gap-1 font-normal bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            <Users className="w-3 h-3" /> Shared
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="font-normal text-muted-foreground border-border/60">
                            Private
                        </Badge>
                    )}
                </CardFooter>
            </Card>
        </Link>
    );
}
