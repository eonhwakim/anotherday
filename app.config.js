const KAKAO_NATIVE_APP_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;

if (!KAKAO_NATIVE_APP_KEY) {
  console.warn(
    '[app.config] EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY is not set. Kakao login will not work.',
  );
}

module.exports = ({ config }) => ({
  ...config,
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
