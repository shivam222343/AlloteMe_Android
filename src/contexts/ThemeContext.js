import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';

const ThemeContext = createContext({});

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
    const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

    useEffect(() => {
        loadThemePreference();
    }, []);

    useEffect(() => {
        if (themeMode === 'system') {
            setIsDark(systemColorScheme === 'dark');
        }
    }, [systemColorScheme, themeMode]);

    const loadThemePreference = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('themeMode');
            if (savedTheme) {
                setThemeMode(savedTheme);
                if (savedTheme === 'light') {
                    setIsDark(false);
                } else if (savedTheme === 'dark') {
                    setIsDark(true);
                }
            }
        } catch (error) {
            console.error('Error loading theme preference:', error);
        }
    };

    const toggleTheme = async (mode) => {
        try {
            setThemeMode(mode);
            await AsyncStorage.setItem('themeMode', mode);

            if (mode === 'light') {
                setIsDark(false);
            } else if (mode === 'dark') {
                setIsDark(true);
            } else {
                setIsDark(systemColorScheme === 'dark');
            }
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
    };

    const theme = {
        colors: isDark ? Colors.dark : Colors.light,
        primary: Colors.primary,
        secondary: Colors.secondary,
        success: Colors.success,
        warning: Colors.warning,
        error: Colors.error,
        info: Colors.info,
        isDark,
    };

    const value = {
        theme,
        isDark,
        themeMode,
        toggleTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
