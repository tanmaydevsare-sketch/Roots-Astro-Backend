import React, { createContext, useContext, useState, useEffect } from 'react';
import API_URL from '../api/config';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        platformName: 'Roots Astro',
        systemCurrency: 'INR',
        sitePrimaryColor: '#2D1E4D',
        siteSecondaryColor: '#D4AF37',
        siteAccentColor: '#8B5FBF',
        heroTitle: 'Celestial Guidance, Professionally Delivered.',
        heroSubtitle: 'Book verified expert astrologers for live video consultations. Advance payment secured. Absolute privacy guaranteed.',
        feature1Title: 'Verified Experts',
        feature1Desc: 'Certifications & background checks for every guide.',
        feature2Title: 'Secure Escrow',
        feature2Desc: 'Advance payment held until session completion.',
        feature3Title: 'Zoom Integrated',
        feature3Desc: 'Automated links & secure recordings.',
        siteLogo: '',
        convenienceRate: 0.0,
        gstRate: 0.0,
    });

    const getCurrencySymbol = (currency) => {
        switch (currency) {
            case 'INR': return '₹';
            case 'GBP': return '£';
            case 'EUR': return '€';
            case 'CAD': return 'C$';
            default: return '$';
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/settings/public/global?t=${Date.now()}`, {
                cache: 'no-store'
            });
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setSettings(prev => ({ ...prev, ...data }));
                    // Update CSS variables globally if branding exists
                    if (data.sitePrimaryColor) document.documentElement.style.setProperty('--primary-color', data.sitePrimaryColor);
                    if (data.siteSecondaryColor) document.documentElement.style.setProperty('--secondary-color', data.siteSecondaryColor);
                    if (data.siteAccentColor) document.documentElement.style.setProperty('--accent-color', data.siteAccentColor);
                }
            }
        } catch (err) {
            console.error("Failed to fetch public settings:", err);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const value = {
        ...settings,
        currencySymbol: getCurrencySymbol(settings.systemCurrency),
        refreshSettings: fetchSettings
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
