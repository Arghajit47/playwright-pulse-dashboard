'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsView = SettingsView;
const react_1 = require("react");
const switch_1 = require("@/components/ui/switch");
const label_1 = require("@/components/ui/label");
const card_1 = require("@/components/ui/card");
function SettingsView() {
    const [isDarkMode, setIsDarkMode] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // Set initial state from documentElement class (set by script in layout.tsx)
        // or localStorage as a fallback if the script hasn't run or was modified.
        const explicitPreference = localStorage.getItem('pulse-theme');
        let initialIsDark;
        if (explicitPreference) {
            initialIsDark = explicitPreference === 'dark';
        }
        else {
            initialIsDark = document.documentElement.classList.contains('dark');
        }
        setIsDarkMode(initialIsDark);
        // Ensure the class matches the state if it was only from localStorage
        if (initialIsDark && !document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.add('dark');
        }
        else if (!initialIsDark && document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
        }
    }, []);
    const toggleTheme = (checked) => {
        setIsDarkMode(checked);
        if (checked) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('pulse-theme', 'dark');
        }
        else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('pulse-theme', 'light');
        }
    };
    return (<card_1.Card className="shadow-xl">
      <card_1.CardHeader>
        <card_1.CardTitle className="text-2xl font-headline text-primary">Settings</card_1.CardTitle>
        <card_1.CardDescription>Customize the appearance of the dashboard.</card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card/70 shadow-sm">
            <label_1.Label htmlFor="theme-toggle" className="text-base font-medium text-foreground">
              Theme
            </label_1.Label>
            <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </span>
                <switch_1.Switch id="theme-toggle" checked={isDarkMode} onCheckedChange={toggleTheme} aria-label="Toggle theme"/>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Your theme preference is saved in your browser.
          </p>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
//# sourceMappingURL=SettingsView.jsx.map