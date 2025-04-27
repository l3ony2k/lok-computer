import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export const ConfigApp = () => {
  const { theme, setTheme } = useTheme();

  // Ensure theme is one of the expected values, default to 'system' if not
  const currentTheme = ['light', 'dark', 'system'].includes(theme ?? '') ? theme : 'system';

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-3">Theme Settings</h2>
      <RadioGroup 
        defaultValue={currentTheme ?? 'system'} 
        onValueChange={(value) => setTheme(value)}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="light" id="theme-light" />
          <Label htmlFor="theme-light">Light</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="dark" id="theme-dark" />
          <Label htmlFor="theme-dark">Dark</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="system" id="theme-system" />
          <Label htmlFor="theme-system">System</Label>
        </div>
      </RadioGroup>
    </div>
  );
};
