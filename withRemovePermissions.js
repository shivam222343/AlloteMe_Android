const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withRemovePermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    
    // Add tools namespace to manifest if not present
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const permissionsToRemove = [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.ACCESS_MEDIA_LOCATION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.MANAGE_EXTERNAL_STORAGE'
    ];

    // Ensure the permissions array exists
    if (!androidManifest['uses-permission']) {
        androidManifest['uses-permission'] = [];
    }

    // Explicitly add "remove" entries for these permissions to override any library defaults
    permissionsToRemove.forEach(permission => {
        // Remove existing if any
        androidManifest['uses-permission'] = androidManifest['uses-permission'].filter(
            p => p.$ && p.$['android:name'] !== permission
        );
        
        // Add forced remove entry
        androidManifest['uses-permission'].push({
            $: {
                'android:name': permission,
                'tools:node': 'remove'
            }
        });
    });

    return config;
  });
};

