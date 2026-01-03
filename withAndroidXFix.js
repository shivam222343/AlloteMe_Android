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
            force 'androidx.appcompat:appcompat:1.7.0'
            force 'androidx.fragment:fragment:1.8.6'
        }
        exclude group: 'com.android.support', module: 'support-compat'
        exclude group: 'com.android.support', module: 'support-core-utils'
        exclude group: 'com.android.support', module: 'support-core-ui'
        exclude group: 'com.android.support', module: 'support-fragment'
        exclude group: 'com.android.support', module: 'support-annotations'
        exclude group: 'com.android.support', module: 'support-vector-drawable'
        exclude group: 'com.android.support', module: 'animated-vector-drawable'
        exclude group: 'com.android.support', module: 'versionedparcelable'
        exclude group: 'com.android.support', module: 'customview'
        exclude group: 'com.android.support', module: 'localbroadcastmanager'
        exclude group: 'com.android.support', module: 'loader'
    }
}
`;
    return content + replacement;
}

module.exports = withAndroidXFix;
