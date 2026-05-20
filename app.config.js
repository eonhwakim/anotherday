const KAKAO_NATIVE_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
const APP_VARIANT = process.env.APP_VARIANT ?? 'production';

const VARIANT_CONFIG = {
  production: {
    name: 'anotherday',
    scheme: 'anotherday',
    iosBundleIdentifier: 'com.anotherday.app',
    androidPackage: 'com.anotherday.app',
  },
  development: {
    name: 'anotherday Dev',
    scheme: 'anotherday-dev',
    iosBundleIdentifier: 'com.anotherday.app.dev',
    androidPackage: 'com.anotherday.app.dev',
  },
  preview: {
    name: 'anotherday Preview',
    scheme: 'anotherday-preview',
    iosBundleIdentifier: 'com.anotherday.app.preview',
    androidPackage: 'com.anotherday.app.preview',
  },
};

const variant = VARIANT_CONFIG[APP_VARIANT] ?? VARIANT_CONFIG.production;

if (!KAKAO_NATIVE_APP_KEY) {
  console.warn(
    '[app.config] EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY is not set. Kakao login will not work.',
  );
}

module.exports = ({ config }) => ({
  ...config,
  name: variant.name,
  scheme: variant.scheme,
  ios: {
    ...config.ios,
    bundleIdentifier: variant.iosBundleIdentifier,
  },
  android: {
    ...config.android,
    package: variant.androidPackage,
  },
  extra: {
    ...config.extra,
    appVariant: APP_VARIANT,
  },
  plugins: [
    ...(config.plugins || []),
    [
      '@react-native-seoul/kakao-login',
      {
        kakaoAppKey: KAKAO_NATIVE_APP_KEY ?? '',
      },
    ],
  ],
});
