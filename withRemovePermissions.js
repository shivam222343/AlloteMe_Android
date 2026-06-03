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
      'android.permission.MANAGE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.NOTIFICATIONS'
    ];

    // Process both uses-permission and uses-permission-sdk-23 tags
    // (some libraries inject via sdk-23 variant)
    const permissionTags = ['uses-permission', 'uses-permission-sdk-23'];

    permissionTags.forEach(tag => {
      // Ensure the permissions array exists
      if (!androidManifest[tag]) {
        androidManifest[tag] = [];
      }

      permissionsToRemove.forEach(permission => {
        // Remove ALL existing entries for this permission (added by any library)
        androidManifest[tag] = androidManifest[tag].filter(
          p => !(p.$ && p.$['android:name'] === permission)
        );
        
        // Add forced remove entry using tools:node="remove"
        // This ensures the manifest merger removes it even if AAR libraries declare it
        androidManifest[tag].push({
          $: {
            'android:name': permission,
            'tools:node': 'remove'
          }
        });
      });
    });

    return config;
  });
};
