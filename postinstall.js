const fs = require("fs");
const path = require("path");

// Define foreground service permissions with clearer structure for Android 13+
const foregroundServicePermTemplate = `
    <!-- Base foreground service permissions -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- Uncomment specific foreground service type permissions based on your needs -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CAMERA" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_HEALTH" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_REMOTE_MESSAGING" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SYSTEM_EXEMPTED" /> -->
    <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" /> -->
`;

// Updated metadata and service declarations with foregroundServiceType
const metadataTemplate = `
  <!-- Notification channel configuration -->
  <meta-data
    android:name="com.supersami.foregroundservice.notification_channel_name"
    android:value="Sticky Title"
  />
  <meta-data
    android:name="com.supersami.foregroundservice.notification_channel_description"
    android:value="Sticky Description."
  />
  <meta-data
    android:name="com.supersami.foregroundservice.notification_color"
    android:resource="@color/blue"
  />
 
  <!-- Foreground service declaration with type -->
  <service 
    android:name="com.supersami.foregroundservice.ForegroundService"
    android:foregroundServiceType="specialUse"
    android:exported="false">
  </service>
  
  <!-- Foreground service task -->
  <service 
    android:name="com.supersami.foregroundservice.ForegroundServiceTask"
    android:foregroundServiceType="specialUse"
    android:exported="false">
  </service>
`;

const androidManifestPath = `${process.cwd()}/android/app/src/main/AndroidManifest.xml`;

fs.readFile(androidManifestPath, "utf8", function (err, data) {
  if (err) {
    console.error("Error reading AndroidManifest.xml:", err);
    return;
  }

  // Check if permissions are already defined
  if (!data.includes("<uses-permission android:name=\"android.permission.FOREGROUND_SERVICE\"")) {
    const reg = /<manifest[^>]*>/;
    const content = reg.exec(data)[0];

    const result = data.replace(
      reg,
      `${content}\n${foregroundServicePermTemplate}`
    );
    
    fs.writeFile(androidManifestPath, result, "utf8", function (err) {
      if (err) {
        console.error("Error adding foreground service permissions:", err);
        return;
      }
      console.log("✓ Added foreground service permissions to AndroidManifest.xml");
    });
  } else {
    console.log("✓ Foreground service permissions already exist in AndroidManifest.xml");
  }

  // Check if metadata and services are already defined
  if (!data.includes("<service android:name=\"com.supersami.foregroundservice.ForegroundService\"")) {
    const reg = /<application[^>]*>/;
    const content = reg.exec(data)?.[0];

    if (!content) {
      console.error("Could not find <application> tag in AndroidManifest.xml");
      return;
    }

    const result = data.replace(reg, `${content}${metadataTemplate}`);

    fs.writeFile(androidManifestPath, result, "utf8", function (err) {
      if (err) {
        console.error("Error adding service declarations:", err);
        return;
      }
      console.log("✓ Added foreground service declarations to AndroidManifest.xml");
    });
  } else {
    console.log("✓ Foreground service declarations already exist in AndroidManifest.xml");
    console.log("⚠️ Note: You may need to manually update foregroundServiceType attributes for Android 14+ compatibility");
  }
});

const colorTemplate = `
  <item name="blue" type="color">#00C4D1</item>
  <integer-array name="androidcolors">
    <item>@color/blue</item>
  </integer-array>
`;

const colorFilePath = `${process.cwd()}/android/app/src/main/res/values/colors.xml`;

// Ensure the directory exists
const dirPath = path.dirname(colorFilePath);
fs.mkdirSync(dirPath, { recursive: true });

// Check if the file exists
if (!fs.existsSync(colorFilePath)) {
  // Create the file with initial content if it doesn't exist
  fs.writeFileSync(colorFilePath, `<resources>${colorTemplate}</resources>`, "utf8");
  console.log(`✓ Created colors.xml file at ${colorFilePath}`);
} else {
  // Read and update the file if it exists
  fs.readFile(colorFilePath, "utf8", function (err, data) {
    if (err) {
      console.error(`Error reading colors.xml file: ${err}`);
      return;
    }

    // Only add colors if they don't already exist
    if (!data.includes("<item name=\"blue\" type=\"color\">#00C4D1</item>")) {
      const reg = /<resources[^>]*>/;
      const content = reg.exec(data)?.[0];

      let result;
      if (!content) {
        result = `<resources>${colorTemplate}</resources>`;
      } else {
        result = data.replace(reg, `${content}${colorTemplate}`);
      }

      fs.writeFile(colorFilePath, result, "utf8", function (err) {
        if (err) {
          console.error(`Error writing to colors.xml file: ${err}`);
          return;
        }
        console.log(`✓ Updated colors.xml file at ${colorFilePath}`);
      });
    } else {
      console.log(`✓ Colors already defined in ${colorFilePath}`);
    }
  });
}

// Print a small guide about foreground service types
console.log("\n=== Foreground Service Types Guide ===");
console.log("For Android 14+, you MUST specify foregroundServiceType in both:");
console.log("1. The service declaration in AndroidManifest.xml");
console.log("2. When starting the service in your JS code");
console.log("\nThis script has added default 'specialUse' type, but you should update it");
console.log("based on your specific use case and ensure corresponding permissions are enabled.");
console.log("=== ============================= ===\n");