'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { ModeToggle } from '@/components/mode-toggle';
import { useTheme } from 'next-themes';
import React from 'react';
import {
  ThemeMode,
  ThemeColors,
  EditorMode,
  updateAllHues,
  randomizeTheme,
  generateThemeCode,
  extractHueFromColor,
  getThemePreviewStyles,
  getActiveThemeMode,
  applyThemeToDOM,
} from '@/lib/picker/theme-utils';
import ThemeEditor from '@/components/picker/theme-editor';
import ThemePreview from '@/components/picker/theme-preview';
import { defaultTheme } from './defaultTheme';

// Type for theme color key
type ThemeColorKey = keyof typeof defaultTheme.light;

export default function ThemeCreator() {
  // Use a ref to store the current theme without triggering re-renders
  const themeColorsRef = useRef<Record<ThemeMode, ThemeColors>>({
    light: { ...defaultTheme.light },
    dark: { ...defaultTheme.dark },
  });

  // Only use state for UI-driven elements that need rendering
  const [copied, setCopied] = useState(false);
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('simple');
  const currentHueRef = useRef<number>(295); // Use ref instead of state

  // Track when we need to force an editor update (for slider and UI refresh)
  const [forceEditorUpdate, setForceEditorUpdate] = useState(0);

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize the currentHue value from the theme colors on mount
  useEffect(() => {
    if (!mounted) return;

    const mode = getActiveThemeMode(currentTheme);
    const primaryColor = themeColorsRef.current[mode].primary;
    const hue = extractHueFromColor(primaryColor);
    currentHueRef.current = hue;

    // Apply the theme on initial mount
    applyThemeToDOM(themeColorsRef.current, mode);
  }, [mounted, currentTheme]);

  // Update color without re-rendering
  const handleColorChange = useCallback(
    (key: string, value: string, mode: ThemeMode) => {
      // Update the ref directly
      themeColorsRef.current = {
        ...themeColorsRef.current,
        [mode]: {
          ...themeColorsRef.current[mode],
          [key]: value,
        },
      };

      // Update the DOM directly using our utility
      const activeMode = getActiveThemeMode(currentTheme);
      if (mode === activeMode) {
        // Only apply to DOM if we're changing the active mode
        if (key === 'radius') {
          document.documentElement.style.setProperty(`--${key}`, value);
        } else {
          document.documentElement.style.setProperty(`--${key}`, `hsl(${value})`);
        }
      }
    },
    [currentTheme]
  );

  // Update all hues with new value without re-rendering
  const handleHueChange = useCallback(
    (newHue: number) => {
      console.log('ThemeCreator: Applying hue change:', newHue);

      // Store the new hue value
      currentHueRef.current = newHue;

      // Update all theme colors with the new hue
      const updatedThemes = updateAllHues(themeColorsRef.current, newHue);
      themeColorsRef.current = updatedThemes;

      // Apply changes directly to DOM for current mode
      const activeMode = getActiveThemeMode(currentTheme);
      applyThemeToDOM(themeColorsRef.current, activeMode);

      // Force a UI refresh to ensure all elements reflect the new theme
      setForceEditorUpdate(prev => prev + 1);
    },
    [currentTheme]
  );

  // Handle randomize theme
  const handleRandomizeTheme = useCallback(() => {
    const { updatedThemes, newHue } = randomizeTheme(themeColorsRef.current);
    currentHueRef.current = newHue;
    themeColorsRef.current = updatedThemes;

    // Apply changes directly to DOM
    const mode = getActiveThemeMode(currentTheme);
    applyThemeToDOM(themeColorsRef.current, mode);

    // Force the editor to update its display values
    setForceEditorUpdate(prev => prev + 1);
  }, [currentTheme]);

  // Handle editor mode change
  const handleEditorModeChange = useCallback((mode: EditorMode) => {
    setEditorMode(mode);
  }, []);

  // Handle theme toggle
  const handleThemeToggle = useCallback(() => {
    // When we toggle theme, we need to force an update
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, [currentTheme, setTheme]);

  // Handle copy to clipboard
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(generateThemeCode(themeColorsRef.current));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast('Theme code has been copied to your clipboard');
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  const activeMode = getActiveThemeMode(currentTheme);

  return (
    <div
      className='flex flex-col min-h-screen'
      // Use inline styles for theme preview to avoid re-renders
      style={getThemePreviewStyles(themeColorsRef.current, activeMode)}
    >
      <header className='border-b'>
        <div className='container flex items-center justify-between h-16 px-4'>
          <h1 className='text-2xl font-bold'>ShadCN Theme Creator</h1>
          <div className='flex items-center gap-4'>
            <Button onClick={copyToClipboard} variant='outline' size='sm'>
              {copied ? <Check className='w-4 h-4 mr-2' /> : <Copy className='w-4 h-4 mr-2' />}
              Copy Code
            </Button>
            <Button size='sm'>Generate Theme</Button>
            <ModeToggle />
          </div>
        </div>
      </header>

      <div className='flex flex-col md:flex-row flex-1'>
        {/* Theme Editor Component - we pass forceEditorUpdate to make it re-render only when needed */}
        <ThemeEditor
          key={`editor-${forceEditorUpdate}`}
          themeColors={themeColorsRef.current}
          activeMode={activeMode}
          currentHue={currentHueRef.current}
          editorMode={editorMode}
          currentTheme={currentTheme}
          onColorChange={handleColorChange}
          onHueChange={handleHueChange}
          onRandomizeTheme={handleRandomizeTheme}
          onEditorModeChange={handleEditorModeChange}
          onThemeToggle={handleThemeToggle}
        />

        {/* Theme Preview Component */}
        <ThemePreview />
      </div>
      <Toaster />
    </div>
  );
}
