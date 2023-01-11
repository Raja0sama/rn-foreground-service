# Installation :

The Installation for the Foreground service is pretty straightforward and seamless, with the new v2 update, The service can auto-link itself with the application.

## Automatic Linking

Just run this command once and see the magic.

```npm
node node_modules/@supersami/rn-foreground-service/postinstall.js
```

In anycase, the above don't link your application correctly, you can try on manual linking of the application.

## Manual Linking

### Step 1 :

In the MainActivity file, Inside the activity tag, Paste the following

```xml
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
  <service android:name="com.supersami.foregroundservice.ForegroundService"></service>
  <service android:name="com.supersami.foregroundservice.ForegroundServiceTask"></service>
```

### Step 2 :

Inside the Resource folder -> Value, Create a file name colors.xml and paste the below.

```xml
 <resources>
    <item  name="blue"  type="color">#00C4D1
    </item>
    <integer-array  name="androidcolors">
    <item>@color/blue</item>
    </integer-array>
  </resources>
```
