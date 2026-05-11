import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import NoInternetScreen from '../components/ui/NoInternetScreen';

const NetworkContext = createContext({ isConnected: true });

export const NetworkProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        // Subscribe to network state updates
        const unsubscribe = NetInfo.addEventListener(state => {
            // state.isConnected can be null initially, we treat it as connected to avoid flicker
            setIsConnected(state.isConnected !== false);
        });

        return () => unsubscribe();
    }, []);

    const checkConnection = async () => {
        const state = await NetInfo.fetch();
        setIsConnected(state.isConnected !== false);
    };

    return (
        <NetworkContext.Provider value={{ isConnected }}>
            {children}
            {!isConnected && <NoInternetScreen onRetry={checkConnection} />}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => useContext(NetworkContext);
