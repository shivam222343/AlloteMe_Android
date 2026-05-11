# 🛡️ Resolving Google Play Signing Key Mismatch

Your app bundle was rejected because the signing key used for the build does not match the one registered with Google Play. Since the original keystore could not be found locally, the best course of action is to **Reset the Upload Key** through the Google Play Console.

## 📁 Generated Files
I have already generated the necessary files for you in the project root:
1. **`upload-keystore.jks`**: Your new signing key.
2. **`upload_certificate.pem`**: The certificate to upload to Google Play.

> [!IMPORTANT]
> **Keystore Password**: `alloteme123`
> **Key Alias**: `upload`
> **Key Password**: `alloteme123`
> 
> Please keep these safe! You will need them to update your Expo/EAS credentials later.

---

## 🛠️ Step-by-Step Fix

### 1. Request Upload Key Reset
1. Go to the [Google Play Console](https://play.google.com/console/).
2. Select your app: **AlloteMe**.
3. In the left menu, navigate to **Setup** → **App integrity**.
4. Scroll down to the **Upload key certificate** section.
5. Click **Request upload key reset**.
6. Select **"I lost my upload key"** (or a similar reason).
7. When prompted, upload the `upload_certificate.pem` file I created for you.
8. Submit the request. Google typically approves this within **1–2 business days**.

### 2. Update Expo (EAS) Credentials
Once Google approves the reset, you must tell Expo to use this new key for future builds:

1. Open your terminal in the project directory.
2. Run the following command:
   ```bash
   eas credentials
   ```
3. Follow the interactive prompts:
   - Select **Android**.
   - Select the **production** profile.
   - Choose **Upload Keystore**.
   - Select **Update/Replace** (or "I want to provide my own").
   - Provide the path to `upload-keystore.jks`.
   - Enter the password: `alloteme123`
   - Enter the alias: `upload`
   - Enter the key password: `alloteme123`

### 3. Rebuild and Upload
After updating the credentials, trigger a new build:
```bash
eas build --platform android --profile production
```
Once the build is finished, download the new `.aab` and upload it to Google Play Console. It will now be accepted!

---

## 💡 Summary of Fingerprints
| Key Type | SHA-1 Fingerprint |
| :--- | :--- |
| **Expected (Google Play)** | `78:63:99:6C:FA:B6:7C:29:CC:52:F1:9B:9F:77:B2:C3:66:21:8D:5E` |
| **Current (Failing Build)** | `B1:03:06:82:99:61:10:5A:F7:37:10:04:F5:F7:CD:99:4D:2A:7F:A1` |
| **New Key (Future)** | `14:B1:9A:67:6C:AA:66:97:8B:C8:E7:93:56:52:A4:8F:8F:EF:E5:06` |

> [!TIP]
> After you've successfully uploaded the app, I recommend backing up `upload-keystore.jks` to a secure location (like a password manager or private cloud storage).
