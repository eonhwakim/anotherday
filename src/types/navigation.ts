export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  ProfileEdit: undefined;
  TeamDetail: { teamId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  HomeTab: undefined;
  CalendarTab: undefined;
  MyPageTab: undefined;
};
