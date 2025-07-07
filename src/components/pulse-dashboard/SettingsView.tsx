
'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function SettingsView() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Set initial state from documentElement class (set by script in layout.tsx)
    // or localStorage as a fallback if the script hasn't run or was modified.
    const explicitPreference = localStorage.getItem('pulse-theme');
    let initialIsDark;

    if (explicitPreference) {
      initialIsDark = explicitPreference === 'dark';
    } else {
      initialIsDark = document.documentElement.classList.contains('dark');
    }
    
    setIsDarkMode(initialIsDark);

    // Ensure the class matches the state if it was only from localStorage
    if (initialIsDark && !document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.add('dark');
    } else if (!initialIsDark && document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
    }

  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pulse-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pulse-theme', 'light');
    }
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">
          Settings
        </CardTitle>
        <CardDescription>
          Customize the appearance of the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card/70 shadow-sm">
            <Label
              htmlFor="theme-toggle"
              className="text-base font-medium text-foreground"
            >
              Theme
            </Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {isDarkMode ? "Dark Mode" : "Light Mode"}
              </span>
              <Switch
                id="theme-toggle"
                checked={isDarkMode}
                onCheckedChange={toggleTheme}
                aria-label="Toggle theme"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center text-base font-medium text-foreground">
            Your theme preference is saved in your browser.
          </p>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card/70 shadow-sm">
            <span>Learn more from Documentation Website: </span>
            <a
              className="text-l font-headline text-primary underline hover:text-primary-dark transition-colors"
              href="https://playwright-pulse-report.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pulse Dashboard
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
