const fs = require("fs");

const metadataTemplate = `
  <meta-data
    android:name="com.tikotas.foregroundservice.notification_channel_name"
    android:value="Sticky Title"
  />
  <meta-data
    android:name="com.tikotas.foregroundservice.notification_channel_description"
    android:value="Sticky Description."
  />
  <meta-data
    android:name="com.tikotas.foregroundservice.notification_color"
    android:resource="@color/blue"
  />
  <service android:name="com.tikotas.foregroundservice.ForegroundService"></service>
  <service android:name="com.tikotas.foregroundservice.ForegroundServiceTask"></service>
`;

const androidManifestPath = `${process.cwd()}/android/app/src/main/AndroidManifest.xml`;

fs.readFile(androidManifestPath, "utf8", function (err, data) {
  if (err) {
    return console.log(err);
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
  <resources>
    <item  name="blue"  type="color">#00C4D1
    </item>
    <integer-array  name="androidcolors">
    <item>@color/blue</item>
    </integer-array>
  </resources>
`;

const colorFilePath = `${process.cwd()}/android/app/src/main/res/values/colors.xml`;

fs.writeFile(colorFilePath, colorTemplate, "utf8", function (err) {
  if (err) {
    return console.log(err);
  }

  console.log(`Successfully created color file at ${colorFilePath}`);
});
