
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ListX } from 'lucide-react';

export function FailureCategorizationView() {
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary flex items-center">
          <ListX className="h-7 w-7 mr-2" />
          Failure Categorization
        </CardTitle>
        <CardDescription>
          Understand and categorize common test failure patterns for quicker debugging.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <ListX className="h-4 w-4" />
          <AlertTitle>Under Development</AlertTitle>
          <AlertDescription>
            The Failure Categorization feature is currently under development. 
            This section will provide tools and insights to help you categorize different types of test failures, 
            making it easier to identify trends and root causes.
            <br /><br />
            Stay tuned for updates!
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
