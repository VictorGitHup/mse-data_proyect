
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6 md:p-8">
            <article className="prose dark:prose-invert max-w-none">
                {children}
            </article>
        </CardContent>
      </Card>
    </div>
  );
}
