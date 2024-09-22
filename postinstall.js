const fs = require("fs");
const path = require("path");

const foregroundServicePermTemplate = `
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
 <!-- <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/> declare permission like this according to your use case https://developer.android.com/about/versions/14/changes/fgs-types-required -->
`;
const metadataTemplate = `
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
 
  <service android:name="com.supersami.foregroundservice.ForegroundService"></service> // also define android:foregroundServiceType="" according to your use case
  <service android:name="com.supersami.foregroundservice.ForegroundServiceTask"></service> // also define android:foregroundServiceType="" according to your use case
`;

const androidManifestPath = `${process.cwd()}/android/app/src/main/AndroidManifest.xml`;

fs.readFile(androidManifestPath, "utf8", function (err, data) {
  if (err) {
    return console.log(err);
  }

  if (!data.includes(foregroundServicePermTemplate)) {
    const reg = /<manifest[^>]*>/;
    const content = reg.exec(data)[0];

    const result = data.replace(
      reg,
      `${content}\n${foregroundServicePermTemplate}`
    );
    fs.writeFile(androidManifestPath, result, "utf8", function (err) {
      if (err) return console.log(err);
    });
  }

  if (!data.includes(metadataTemplate)) {
    const reg = /<application[^>]*>/;
    const content = reg.exec(data)[0];

    const result = data.replace(reg, `${content}${metadataTemplate}`);
    console.log({ result });

    fs.writeFile(androidManifestPath, result, "utf8", function (err) {
      if (err) return console.log(err);
    });
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
  console.log(`Successfully created color file at ${colorFilePath}`);
} else {
  // Read and update the file if it exists
  fs.readFile(colorFilePath, "utf8", function (err, data) {
    if (err) {
      return console.error(`Error reading file: ${err}`);
    }

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
        return console.error(`Error writing file: ${err}`);
      }
      console.log(`Successfully updated color file at ${colorFilePath}`);
    });
  });
}