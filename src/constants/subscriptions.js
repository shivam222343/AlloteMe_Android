export const SUBSCRIPTION_PLANS = {
    FREE: {
        id: 'free',
        name: 'Free',
        price: 0,
        limits: {
            aiPrompts: 3,
            predictions: 2,
            exports: 1
        }
    },
    STANDARD: {
        id: 'standard',
        name: 'Standard plan',
        price: 199,
        limits: {
            aiPrompts: Infinity,
            predictions: 15,
            exports: 5
        }
    },
    ADVANCE: {
        id: 'advance',
        name: 'Advance Plan',
        price: 1599,
        limits: {
            aiPrompts: Infinity,
            predictions: 25,
            exports: 10
        }
    },
    COUNSELOR: {
        id: 'counselor',
        name: 'One to One Counselling Plan',
        price: 2699,
        limits: {
            aiPrompts: Infinity,
            predictions: 25,
            exports: 10
        }
    }
};
