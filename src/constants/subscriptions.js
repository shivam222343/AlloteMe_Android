export const SUBSCRIPTION_PLANS = {
    FREE: {
        id: 'free',
        name: 'Free',
        price: 0,
        limits: {
            aiPrompts: 3,
            predictions: 5,
            exports: 1
        }
    },
    STANDARD: {
        id: 'standard',
        name: 'Standard',
        price: 99,
        limits: {
            aiPrompts: Infinity,
            predictions: 15,
            exports: 5
        }
    },
    ADVANCE: {
        id: 'advance',
        name: 'Advance',
        price: 149,
        limits: {
            aiPrompts: Infinity,
            predictions: 25,
            exports: 12
        }
    }
};
