export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  ProfileEdit: undefined;
  TeamDetail: { teamId: string };
  MemberStats: { userId: string; teamId?: string; nickname: string };
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
