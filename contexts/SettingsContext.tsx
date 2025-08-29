import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';
export type ColorScheme = 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'cyan';
export type LayoutMode = 'compact' | 'comfortable' | 'spacious';

interface SettingsContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  resetToDefaults: () => void;
}

const defaultSettings = {
  fontSize: 'medium' as FontSize,
  colorScheme: 'purple' as ColorScheme,
  layoutMode: 'comfortable' as LayoutMode,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState<FontSize>(defaultSettings.fontSize);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(defaultSettings.colorScheme);
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(defaultSettings.layoutMode);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('elevated-ai-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setFontSizeState(parsed.fontSize || defaultSettings.fontSize);
        setColorSchemeState(parsed.colorScheme || defaultSettings.colorScheme);
        setLayoutModeState(parsed.layoutMode || defaultSettings.layoutMode);
      } catch (error) {
        console.warn('Failed to parse saved settings, using defaults');
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = (newSettings: Partial<typeof defaultSettings>) => {
    const currentSettings = { fontSize, colorScheme, layoutMode, ...newSettings };
    localStorage.setItem('elevated-ai-settings', JSON.stringify(currentSettings));
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    saveSettings({ fontSize: size });
    document.documentElement.setAttribute('data-font-size', size);
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    saveSettings({ colorScheme: scheme });
    document.documentElement.setAttribute('data-color-scheme', scheme);
  };

  const setLayoutMode = (mode: LayoutMode) => {
    setLayoutModeState(mode);
    saveSettings({ layoutMode: mode });
    document.documentElement.setAttribute('data-layout-mode', mode);
  };

  const resetToDefaults = () => {
    setFontSize(defaultSettings.fontSize);
    setColorScheme(defaultSettings.colorScheme);
    setLayoutMode(defaultSettings.layoutMode);
    localStorage.removeItem('elevated-ai-settings');
  };

  // Apply settings to document on mount and when they change
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    document.documentElement.setAttribute('data-layout-mode', layoutMode);
  }, [fontSize, colorScheme, layoutMode]);

  return (
    <SettingsContext.Provider value={{
      fontSize,
      setFontSize,
      colorScheme,
      setColorScheme,
      layoutMode,
      setLayoutMode,
      resetToDefaults,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};