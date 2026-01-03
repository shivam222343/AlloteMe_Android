const { withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidXFix = (config) => {
    return withProjectBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            config.modResults.contents = addAndroidXResolutionStrategy(config.modResults.contents);
        }
        return config;
    });
};

function addAndroidXResolutionStrategy(content) {
    if (content.includes('resolutionStrategy')) {
        return content;
    }

    const replacement = `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.16.0'
            force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
            force 'androidx.annotation:annotation:1.9.1'
        }
        exclude group: 'com.android.support', module: 'support-compat'
        exclude group: 'com.android.support', module: 'versionedparcelable'
    }
}
`;
    return content + replacement;
}

module.exports = withAndroidXFix;
