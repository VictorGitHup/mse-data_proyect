
import { Card, CardContent } from '@/components/ui/card';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30">
        <div className="container mx-auto p-4 md:p-12">
            <Card className="max-w-4xl mx-auto shadow-lg">
                <CardContent className="p-6 md:p-10">
                    <div className="prose dark:prose-invert max-w-none">
                        {children}
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
